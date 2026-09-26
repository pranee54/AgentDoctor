import fs from "node:fs/promises";
import path from "node:path";

import {
  handleArchitectureCheckTool,
  handleCallGraphLookup,
  handleCodebaseSearch,
  handleDependencyLookup,
  handleRefactorImpactTool,
  handleSymbolLookup,
  handleTestImpactTool,
} from "../../mcp/intelligence/handlers.js";
import { scan } from "../../core/scanner/scan.js";
import { analyzeChanges } from "../../core/changes/analyze.js";
import { discoverFiles } from "../../discovery/files.js";
import { PathEscapeError, resolveSafeRepoPath } from "../../security/paths.js";
import { resolveRepoRoot } from "../../utils/path.js";
import { redactSecrets } from "../../platform/security/redact.js";
import { summarizeProjectForChat } from "../chat/project-summary.js";
import { getToolSpec, riskForTool } from "./registry.js";
import type { AgentToolCall, AgentToolName, AgentToolResult } from "./types.js";
import { createFileSafe, deleteFileSafe, editFileSafe } from "./write.js";
import { inferTestArgv, runAgentCommand } from "./run.js";
import { evaluateApproval } from "../approvals.js";
import { modeBlocksToolCategory, type AgentMode } from "../modes.js";
import { assertWorkspacePathAccess, type WorkspaceModel } from "../../workspace/index.js";
import { assertForensicReadOnly } from "../../product/forensic/mode.js";

function asRecord(args: Record<string, unknown>): Record<string, unknown> {
  return args;
}

function str(args: Record<string, unknown>, key: string): string | null {
  const v = args[key];
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

/**
 * Execute an agent tool.
 * Write/execute tools require explicit allowWrite/allowExecute (after human approval).
 */
export async function executeAgentTool(
  rootInput: string,
  call: AgentToolCall,
  options?: {
    allowWrite?: boolean;
    allowExecute?: boolean;
    /** Human approval already obtained for this session/action */
    approvedByHuman?: boolean;
    /** Agent mode — LEARN hard-blocks write/execute regardless of approval */
    mode?: AgentMode;
    /** Optional multi-root workspace isolation context */
    workspace?: WorkspaceModel | null;
    /** Forensic mode — refuse all mutations */
    forensicMode?: boolean;
  },
): Promise<AgentToolResult> {
  const started = Date.now();
  const root = resolveRepoRoot(rootInput);
  const risk = riskForTool(call.name);
  const spec = getToolSpec(call.name);

  const fail = (code: string, message: string): AgentToolResult => ({
    callId: call.id,
    name: call.name,
    ok: false,
    data: null,
    error: { code, message },
    risk,
    durationMs: Date.now() - started,
  });

  const ok = (data: unknown): AgentToolResult => ({
    callId: call.id,
    name: call.name,
    ok: true,
    data: redactDeep(data),
    risk,
    durationMs: Date.now() - started,
  });

  if (!spec) return fail("unknown_tool", `Unknown tool: ${call.name}`);

  const forensic = options?.forensicMode === true || process.env.AGENTDOCTOR_FORENSIC_MODE === "1";
  if (forensic && (spec.category === "write" || spec.category === "execute")) {
    try {
      assertForensicReadOnly(true);
    } catch (error) {
      return fail(
        "forensic_read_only",
        error instanceof Error ? error.message : "Forensic mode refuses write operations",
      );
    }
  }
  if (modeBlocksToolCategory(options?.mode, spec.category)) {
    return fail(
      "mode_forbidden",
      `Mode ${options?.mode ?? "LEARN"} does not allow ${spec.category} tools (allowWrites=false). The model cannot override this.`,
    );
  }

  if (spec.category === "write" || spec.category === "execute") {
    const gate = evaluateApproval(
      { action: `tool:${call.name}`, risk: risk, toolName: call.name },
      { approvedByHuman: options?.approvedByHuman === true },
    );
    if (gate.needsHumanApproval) {
      return fail("approval_required", gate.reason);
    }
  }

  if (spec.category === "write" && !options?.allowWrite) {
    return fail("not_enabled", "Write tools require allowWrite after human approval.");
  }
  if (spec.category === "execute" && !options?.allowExecute) {
    return fail("not_enabled", "Execute tools require allowExecute after human approval.");
  }

  const ensureWorkspace = (absPath: string): AgentToolResult | null => {
    // Repo-root isolation is already enforced by resolveSafeRepoPath.
    // Workspace gate applies only when a multi-root WorkspaceModel is provided
    // (avoids false denies from /var vs /private/var when workspace is null).
    if (options?.workspace == null) return null;
    const access = assertWorkspacePathAccess({
      workspace: options.workspace,
      operationRoot: root,
      targetPath: absPath,
    });
    if (!access.allowed) {
      return fail("workspace_denied", access.reason);
    }
    return null;
  };

  try {
    switch (call.name) {
      case "read_file": {
        const rel = str(call.arguments, "path");
        if (!rel) return fail("invalid_argument", "path required");
        let abs: string;
        try {
          abs = resolveSafeRepoPath(root, rel);
        } catch (error) {
          if (error instanceof PathEscapeError) {
            return fail("path_escape", "path escapes repository root");
          }
          throw error;
        }
        const denied = ensureWorkspace(abs);
        if (denied) return denied;
        const maxBytes =
          typeof call.arguments.maxBytes === "number" ? call.arguments.maxBytes : 200_000;
        const buf = await fs.readFile(abs);
        if (buf.byteLength > maxBytes) {
          return fail("too_large", `File exceeds ${maxBytes} bytes`);
        }
        const text = buf.toString("utf8");
        return ok({
          path: rel.split(path.sep).join("/"),
          bytes: buf.byteLength,
          content: redactSecrets(text).text,
          channel: "PROJECT_DATA",
        });
      }
      case "list_files": {
        const limit = typeof call.arguments.limit === "number" ? call.arguments.limit : 200;
        const discovery = await discoverFiles({ root });
        const files = discovery.files.slice(0, limit).map((f) => f.relativePath);
        return ok({
          count: discovery.files.length,
          files,
          truncated: discovery.files.length > limit,
        });
      }
      case "search_code":
        return ok(await handleCodebaseSearch(root, asRecord(call.arguments)));
      case "find_symbol":
        return ok(await handleSymbolLookup(root, asRecord(call.arguments)));
      case "find_references": {
        const symbol = str(call.arguments, "symbol");
        if (!symbol) return fail("invalid_argument", "symbol required");
        return ok(await handleRefactorImpactTool(root, { symbol }));
      }
      case "find_callers": {
        const target = str(call.arguments, "target");
        if (!target) return fail("invalid_argument", "target required");
        const raw = (await handleCallGraphLookup(root, { symbol: target })) as {
          ok?: boolean;
          calls?: Array<{ from: string; to: string; kind?: string }>;
        };
        const edges = (raw.calls ?? []).filter((e) => e.to.includes(target));
        return ok({ ok: raw.ok, direction: "callers", target, edges });
      }
      case "find_callees": {
        const target = str(call.arguments, "target");
        if (!target) return fail("invalid_argument", "target required");
        const raw = (await handleCallGraphLookup(root, { symbol: target })) as {
          ok?: boolean;
          calls?: Array<{ from: string; to: string; kind?: string }>;
        };
        const edges = (raw.calls ?? []).filter((e) => e.from.includes(target));
        return ok({ ok: raw.ok, direction: "callees", target, edges });
      }
      case "inspect_project":
        return ok(await summarizeProjectForChat(root));
      case "inspect_architecture":
        return ok(await handleArchitectureCheckTool(root));
      case "inspect_dependencies": {
        const target = str(call.arguments, "target");
        if (!target) return fail("invalid_argument", "target required");
        return ok(await handleDependencyLookup(root, { target }));
      }
      case "inspect_tests":
        return ok(await handleTestImpactTool(root));
      case "inspect_findings": {
        const result = await scan({ cwd: root });
        return ok({
          findings: result.findings.slice(0, 50),
          summary: result.summary,
          agents: result.agents.map((a) => ({
            id: a.id,
            detected: a.detected,
            configured: a.configured,
            status: a.status,
          })),
        });
      }
      case "inspect_git_status": {
        const report = await analyzeChanges({ root });
        return ok({
          gitAvailable: report.gitAvailable,
          files: report.files.slice(0, 100),
          summary: report.summary,
        });
      }
      case "inspect_git_diff": {
        const since = str(call.arguments, "since") ?? undefined;
        const report = await analyzeChanges({
          root,
          ...(since ? { since } : {}),
          impact: true,
        });
        return ok({
          gitAvailable: report.gitAvailable,
          files: report.files.slice(0, 100),
          summary: report.summary,
          impact: report.impact ?? null,
          note: "Full unified patch text is not dumped; use change analyze for evidence.",
        });
      }
      case "create_file": {
        const rel = str(call.arguments, "path");
        const content = typeof call.arguments.content === "string" ? call.arguments.content : null;
        if (!rel || content === null) return fail("invalid_argument", "path and content required");
        let absCreate: string;
        try {
          absCreate = resolveSafeRepoPath(root, rel);
        } catch (error) {
          if (error instanceof PathEscapeError) {
            return fail("path_escape", "path escapes repository root");
          }
          throw error;
        }
        const denyCreate = ensureWorkspace(absCreate);
        if (denyCreate) return denyCreate;
        return ok(await createFileSafe(root, rel, content));
      }
      case "edit_file": {
        const rel = str(call.arguments, "path");
        if (!rel) return fail("invalid_argument", "path required");
        let absEdit: string;
        try {
          absEdit = resolveSafeRepoPath(root, rel);
        } catch (error) {
          if (error instanceof PathEscapeError) {
            return fail("path_escape", "path escapes repository root");
          }
          throw error;
        }
        const denyEdit = ensureWorkspace(absEdit);
        if (denyEdit) return denyEdit;
        const editOpts: {
          content?: string;
          oldContent?: string;
          startLine?: number;
          endLine?: number;
          replacement?: string;
        } = {};
        if (typeof call.arguments.content === "string") editOpts.content = call.arguments.content;
        if (typeof call.arguments.oldContent === "string") {
          editOpts.oldContent = call.arguments.oldContent;
        }
        if (typeof call.arguments.startLine === "number") {
          editOpts.startLine = call.arguments.startLine;
        }
        if (typeof call.arguments.endLine === "number") editOpts.endLine = call.arguments.endLine;
        if (typeof call.arguments.replacement === "string") {
          editOpts.replacement = call.arguments.replacement;
        }
        return ok(await editFileSafe(root, rel, editOpts));
      }
      case "delete_file": {
        const rel = str(call.arguments, "path");
        if (!rel) return fail("invalid_argument", "path required");
        let absDel: string;
        try {
          absDel = resolveSafeRepoPath(root, rel);
        } catch (error) {
          if (error instanceof PathEscapeError) {
            return fail("path_escape", "path escapes repository root");
          }
          throw error;
        }
        const denyDel = ensureWorkspace(absDel);
        if (denyDel) return denyDel;
        return ok(await deleteFileSafe(root, rel));
      }
      case "run_command": {
        const command = str(call.arguments, "command") ?? undefined;
        const argv = Array.isArray(call.arguments.argv)
          ? call.arguments.argv.filter((x): x is string => typeof x === "string")
          : undefined;
        if (!command && (!argv || argv.length === 0)) {
          return fail("invalid_argument", "command or argv required");
        }
        const result = await runAgentCommand({
          root,
          ...(command ? { command } : {}),
          ...(argv ? { argv } : {}),
          execute: true,
        });
        if (result.blocked) {
          return fail("blocked", result.reason);
        }
        if (!result.ok) {
          return fail(
            result.decision === "require-approval" ? "policy_approval" : "command_failed",
            result.reason || result.notice,
          );
        }
        return ok(result);
      }
      case "run_tests": {
        const command = str(call.arguments, "command");
        let argv: string[] | undefined;
        if (command) {
          // fall through to runAgentCommand with command string
        } else {
          try {
            const pkgRaw = await fs.readFile(path.join(root, "package.json"), "utf8");
            argv = inferTestArgv(JSON.parse(pkgRaw) as unknown) ?? undefined;
          } catch {
            argv = undefined;
          }
        }
        if (!command && !argv) {
          return fail(
            "no_test_runner",
            "Could not infer test command; pass command explicitly (e.g. npm test).",
          );
        }
        const result = await runAgentCommand({
          root,
          ...(command ? { command } : {}),
          ...(argv ? { argv } : {}),
          execute: true,
          timeoutMs: 120_000,
        });
        if (result.blocked) {
          return fail("blocked", result.reason);
        }
        if (!result.ok) {
          return fail(
            result.decision === "require-approval" ? "policy_approval" : "command_failed",
            result.reason || result.notice,
          );
        }
        return ok(result);
      }
      default: {
        const _exhaustive: never = call.name;
        return fail("unknown_tool", `Unhandled tool: ${_exhaustive}`);
      }
    }
  } catch (error) {
    if (error instanceof PathEscapeError) {
      return fail("path_escape", "path escapes repository root");
    }
    return fail("tool_error", error instanceof Error ? error.message : String(error));
  }
}

function redactDeep(value: unknown): unknown {
  if (typeof value === "string") return redactSecrets(value).text;
  if (Array.isArray(value)) return value.map(redactDeep);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = redactDeep(v);
    }
    return out;
  }
  return value;
}

export function isReadTool(name: AgentToolName): boolean {
  return getToolSpec(name)?.category === "read";
}
