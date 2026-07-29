import { AGENT_DISPLAY_NAMES } from "../../constants.js";
import {
  deriveStatus,
  inspectRepoFile,
  pathExistsInsideRoot,
  toAgentConfigFile,
  tryParseJson,
} from "../inspect.js";
import type {
  AgentAdapter,
  AgentConfigFile,
  AgentDetectionContext,
  AgentDetectionResult,
  AgentDiagnostic,
} from "../types.js";
import { basenameOf, isRootLevel } from "../types.js";

/**
 * Claude Code project configuration detection.
 *
 * Official sources (code.claude.com docs):
 * - Project instructions: `./CLAUDE.md` or `./.claude/CLAUDE.md`
 * - Local (gitignored) instructions: `./CLAUDE.local.md`
 * - Nested `CLAUDE.md` / `CLAUDE.local.md` in subdirectories (on-demand load)
 * - Modular rules: .claude/rules/ markdown files (recursive)
 * - Project settings: .claude/settings.json, .claude/settings.local.json
 *
 * We do NOT inspect ~/.claude or managed org policies — repository only.
 * Claude Code does not read AGENTS.md directly (docs recommend importing via CLAUDE.md).
 */
export async function detectClaudeCode(
  context: AgentDetectionContext,
): Promise<AgentDetectionResult> {
  const { root, discovery, maxFileSizeBytes } = context;
  const configFiles: AgentConfigFile[] = [];
  const diagnostics: AgentDiagnostic[] = [];
  const seen = new Set<string>();
  const metadata: Record<string, unknown> = {
    claudeMdCount: 0,
    claudeLocalCount: 0,
    rulesCount: 0,
    hasClaudeDirectory: false,
    hasSettings: false,
    hasLocalSettings: false,
  };

  const hasClaudeDir = await pathExistsInsideRoot(root, ".claude");
  metadata.hasClaudeDirectory = hasClaudeDir;

  async function addMarkdownInstruction(
    relativePath: string,
    kind: "claude-md" | "claude-local-md" | "claude-rule-md",
  ): Promise<void> {
    if (seen.has(relativePath)) {
      return;
    }
    seen.add(relativePath);
    const inspected = await inspectRepoFile(root, relativePath, maxFileSizeBytes);
    const scope =
      relativePath === "CLAUDE.md" ||
      relativePath === ".claude/CLAUDE.md" ||
      relativePath === "CLAUDE.local.md"
        ? "root"
        : isRootLevel(relativePath)
          ? "root"
          : "nested";

    configFiles.push(
      toAgentConfigFile(inspected, kind, {
        legacy: false,
        scope,
      }),
    );

    if (kind === "claude-md") {
      metadata.claudeMdCount = Number(metadata.claudeMdCount) + 1;
    } else if (kind === "claude-local-md") {
      metadata.claudeLocalCount = Number(metadata.claudeLocalCount) + 1;
    } else {
      metadata.rulesCount = Number(metadata.rulesCount) + 1;
    }

    if (!inspected.exists) {
      return;
    }
    if (!inspected.readable && inspected.error) {
      diagnostics.push({
        code: "claude/unreadable-file",
        severity: "warning",
        message: `Could not read Claude Code file: ${inspected.error}`,
        file: relativePath,
      });
    } else if (inspected.empty) {
      diagnostics.push({
        code: "claude/empty-instruction",
        severity: "info",
        message: "Claude Code instruction file is empty",
        file: relativePath,
      });
    }
  }

  async function addSettingsFile(
    relativePath: string,
    kind: "claude-settings" | "claude-settings-local",
  ): Promise<void> {
    if (seen.has(relativePath)) {
      return;
    }
    seen.add(relativePath);
    const inspected = await inspectRepoFile(root, relativePath, maxFileSizeBytes);
    let parseError: string | undefined;

    if (inspected.readable && inspected.text !== null && !inspected.empty) {
      const parsed = tryParseJson(inspected.text);
      if (!parsed.ok) {
        parseError = parsed.error;
        diagnostics.push({
          code: "claude/malformed-settings",
          severity: "warning",
          message: `${relativePath} could not be parsed: ${parsed.error}`,
          file: relativePath,
        });
      }
      // Count setting keys only — do not surface setting values.
      if (parsed.ok && parsed.data && typeof parsed.data === "object") {
        metadata[`${kind}Keys`] = Object.keys(parsed.data as Record<string, unknown>).length;
      }
    } else if (inspected.exists && inspected.empty) {
      diagnostics.push({
        code: "claude/empty-settings",
        severity: "info",
        message: `${relativePath} is empty`,
        file: relativePath,
      });
    } else if (inspected.exists && !inspected.readable && inspected.error) {
      diagnostics.push({
        code: "claude/unreadable-settings",
        severity: "warning",
        message: `Could not read ${relativePath}: ${inspected.error}`,
        file: relativePath,
      });
    }

    configFiles.push(
      toAgentConfigFile(inspected, kind, {
        legacy: false,
        scope: "root",
        ...(parseError !== undefined ? { parseError } : {}),
      }),
    );

    if (kind === "claude-settings") {
      metadata.hasSettings = true;
    } else {
      metadata.hasLocalSettings = true;
    }
  }

  // Targeted root/project paths (may be empty and missing from discovery)
  const targeted = [
    "CLAUDE.md",
    ".claude/CLAUDE.md",
    "CLAUDE.local.md",
    ".claude/settings.json",
    ".claude/settings.local.json",
  ];

  for (const relative of targeted) {
    if (await pathExistsInsideRoot(root, relative)) {
      if (relative.endsWith("settings.json") || relative.endsWith("settings.local.json")) {
        await addSettingsFile(
          relative,
          relative.endsWith("settings.local.json") ? "claude-settings-local" : "claude-settings",
        );
      } else if (relative.endsWith("CLAUDE.local.md")) {
        await addMarkdownInstruction(relative, "claude-local-md");
      } else {
        await addMarkdownInstruction(relative, "claude-md");
      }
    }
  }

  // Nested CLAUDE.md / CLAUDE.local.md and .claude/rules from discovery
  for (const file of discovery.files) {
    const relative = file.relativePath;
    const base = basenameOf(relative);

    if (base === "CLAUDE.md") {
      await addMarkdownInstruction(relative, "claude-md");
      continue;
    }
    if (base === "CLAUDE.local.md") {
      await addMarkdownInstruction(relative, "claude-local-md");
      continue;
    }
    if (relative.includes(".claude/rules/") && base.endsWith(".md")) {
      await addMarkdownInstruction(relative, "claude-rule-md");
    }
  }

  const usableInstruction = configFiles.some(
    (f) =>
      f.readable &&
      !f.empty &&
      (f.kind === "claude-md" ||
        f.kind === "claude-local-md" ||
        f.kind === "claude-rule-md" ||
        ((f.kind === "claude-settings" || f.kind === "claude-settings-local") &&
          f.parseError === undefined)),
  );

  const detected =
    hasClaudeDir ||
    Number(metadata.claudeMdCount) > 0 ||
    Number(metadata.claudeLocalCount) > 0 ||
    Number(metadata.rulesCount) > 0 ||
    Boolean(metadata.hasSettings) ||
    Boolean(metadata.hasLocalSettings);

  const configured = usableInstruction;
  const hasErrors = diagnostics.some((d) => d.severity === "error");
  // Malformed settings alone without instructions → misconfigured if detected
  const hasParseProblems = configFiles.some((f) => f.parseError !== undefined);
  const status = deriveStatus({
    detected,
    configured,
    hasErrors: hasErrors || (hasParseProblems && !configured),
  });

  const parts: string[] = [];
  if (Number(metadata.claudeMdCount) > 0) {
    parts.push("CLAUDE.md");
  }
  if (Number(metadata.rulesCount) > 0) {
    parts.push(`${metadata.rulesCount} rule${Number(metadata.rulesCount) === 1 ? "" : "s"}`);
  }
  if (metadata.hasSettings || metadata.hasLocalSettings) {
    parts.push("settings");
  }

  let summary: string;
  if (!detected) {
    summary = "not configured";
  } else if (configured) {
    summary = parts.length > 0 ? parts.join(", ") : "configured";
  } else {
    summary = "detected but not configured";
  }

  return {
    id: "claude-code",
    displayName: AGENT_DISPLAY_NAMES["claude-code"],
    detected,
    configured,
    status,
    summary,
    configFiles,
    configPaths: configFiles.map((f) => f.relativePath),
    diagnostics,
    metadata,
  };
}

export const claudeAdapter: AgentAdapter = {
  id: "claude-code",
  displayName: AGENT_DISPLAY_NAMES["claude-code"],
  detect: detectClaudeCode,
};
