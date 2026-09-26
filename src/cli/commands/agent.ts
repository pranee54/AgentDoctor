import { approvePlan, buildAgentPlan, formatAgentPlan } from "../../agent/plan.js";
import { evaluateApproval, formatApprovalPrompt } from "../../agent/approvals.js";
import { runCodingLoop } from "../../agent/loop.js";
import { runRoleAgent, type AgentRole } from "../../agent/roles.js";
import {
  executeAgentTool,
  getToolSpec,
  listAgentToolSpecs,
  newToolCall,
} from "../../agent/tools/index.js";
import type { AgentToolName } from "../../agent/tools/types.js";
import { EXIT_CODES, type ExitCode } from "../../types/index.js";
import { resolveRepoRoot } from "../../utils/path.js";
import { colors } from "../../utils/colors.js";

/**
 * agentdoctor plan — produce an implementation plan (no writes unless --apply elsewhere).
 */
export async function runPlanCommand(options: {
  goal: string;
  root?: string;
  json?: boolean;
  approve?: boolean;
}): Promise<ExitCode> {
  const root = resolveRepoRoot(options.root ?? process.cwd());
  const plan = await buildAgentPlan({ root, goal: options.goal });

  if (options.approve) {
    const approved = approvePlan(plan, true);
    if (options.json) {
      process.stdout.write(
        `${JSON.stringify({ ...approved, note: "Approval recorded; use agent --apply to mutate" }, null, 2)}\n`,
      );
    } else {
      process.stdout.write(formatAgentPlan(approved));
      process.stdout.write(
        `${colors.yellow('\nApproval recorded. Use: agentdoctor agent --goal "..." --approve --apply\n')}\n`,
      );
    }
    return EXIT_CODES.SUCCESS;
  }

  if (options.json) {
    process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
  } else {
    process.stdout.write(formatAgentPlan(plan));
  }
  return EXIT_CODES.SUCCESS;
}

/**
 * agentdoctor agent — inspect, plan, and (with --approve) mutate via controlled tools.
 */
export async function runAgentCommand(options: {
  root?: string;
  goal?: string;
  tool?: string;
  toolArgs?: Record<string, unknown>;
  listTools?: boolean;
  json?: boolean;
  approve?: boolean;
  apply?: boolean;
  /** JSON array of {name, arguments} for deterministic apply */
  applyOpsJson?: string;
  verify?: boolean;
  runTests?: boolean;
  role?: AgentRole;
}): Promise<ExitCode> {
  const root = resolveRepoRoot(options.root ?? process.cwd());
  const approvedByHuman = options.approve === true;

  if (options.listTools) {
    const tools = listAgentToolSpecs({ includeWrite: true, includeExecute: true });
    if (options.json) {
      process.stdout.write(`${JSON.stringify(tools, null, 2)}\n`);
    } else {
      process.stdout.write(`\n${colors.bold("AgentDoctor tools")}\n\n`);
      for (const t of tools) {
        process.stdout.write(`  [${t.risk}] ${t.name} (${t.category}) — ${t.description}\n`);
      }
      process.stdout.write("\n");
    }
    return EXIT_CODES.SUCCESS;
  }

  if (options.tool) {
    const name = options.tool as AgentToolName;
    const spec = getToolSpec(name);
    if (!spec) {
      process.stderr.write(`Unknown tool: ${name}\n`);
      return EXIT_CODES.USAGE_ERROR;
    }
    const approval = evaluateApproval(
      { action: `tool:${name}`, risk: spec.risk, toolName: name },
      { approvedByHuman },
    );
    if (approval.needsHumanApproval) {
      process.stderr.write(
        formatApprovalPrompt(
          { action: `tool:${name}`, risk: approval.risk, toolName: name },
          approval,
        ),
      );
      process.stderr.write("Re-run with --approve for write/execute tools.\n");
      return EXIT_CODES.USAGE_ERROR;
    }
    const call = newToolCall("cli-agent", name, options.toolArgs ?? {});
    const result = await executeAgentTool(root, call, {
      allowWrite: approvedByHuman,
      allowExecute: approvedByHuman,
      approvedByHuman,
    });
    if (options.json) {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    } else if (result.ok) {
      process.stdout.write(`${JSON.stringify(result.data, null, 2)}\n`);
    } else {
      process.stderr.write(`Tool failed: ${result.error?.code} — ${result.error?.message}\n`);
      return EXIT_CODES.INTERNAL_ERROR;
    }
    return EXIT_CODES.SUCCESS;
  }

  if (options.goal && options.apply) {
    if (!approvedByHuman) {
      process.stderr.write("Refusing --apply without --approve (human approval required).\n");
      return EXIT_CODES.USAGE_ERROR;
    }
    let toolCalls: Array<{ name: AgentToolName; arguments: Record<string, unknown> }> | undefined;
    if (options.applyOpsJson) {
      try {
        const parsed = JSON.parse(options.applyOpsJson) as unknown;
        if (!Array.isArray(parsed)) throw new Error("expected array");
        toolCalls = parsed.map((item) => {
          const row = item as { name?: string; arguments?: Record<string, unknown> };
          if (!row.name || typeof row.name !== "string") throw new Error("ops need name");
          return {
            name: row.name as AgentToolName,
            arguments: row.arguments ?? {},
          };
        });
      } catch (error) {
        process.stderr.write(
          `Invalid --apply-ops JSON: ${error instanceof Error ? error.message : String(error)}\n`,
        );
        return EXIT_CODES.USAGE_ERROR;
      }
    }
    const result = options.role
      ? await runRoleAgent({
          role: options.role,
          root,
          goal: options.goal,
          approvedByHuman: true,
          ...(toolCalls ? { toolCalls } : {}),
          verify: options.verify !== false,
          runTests: options.runTests === true,
        })
      : await runCodingLoop({
          root,
          goal: options.goal,
          approvedByHuman: true,
          ...(toolCalls ? { toolCalls } : {}),
          verify: options.verify !== false,
          runTests: options.runTests === true,
        });
    if (options.json) {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    } else {
      process.stdout.write(result.responseText);
    }
    if (result.stoppedReason === "awaiting-approval") return EXIT_CODES.USAGE_ERROR;
    if (result.stoppedReason === "failed" || result.stoppedReason === "limit") {
      return EXIT_CODES.INTERNAL_ERROR;
    }
    return EXIT_CODES.SUCCESS;
  }

  if (options.goal) {
    return runPlanCommand({
      goal: options.goal,
      root,
      ...(options.json !== undefined ? { json: options.json } : {}),
      ...(approvedByHuman ? { approve: true } : {}),
    });
  }

  process.stderr.write(
    [
      "",
      "AgentDoctor agent (Milestone 4)",
      "",
      "Usage:",
      "  agentdoctor agent --list-tools",
      "  agentdoctor agent --tool inspect_project [path]",
      '  agentdoctor plan "Add registration" [path]',
      "  agentdoctor agent --goal \"Add registration\" --approve --apply --apply-ops '[...]' [path]",
      "",
      "Writes require --approve. Unrestricted shell is never exposed.",
      "",
    ].join("\n"),
  );
  return EXIT_CODES.USAGE_ERROR;
}
