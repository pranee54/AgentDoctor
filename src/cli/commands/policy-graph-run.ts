import { evaluateAgentAction, EVALUATE_ONLY } from "../../platform/firewall/evaluate.js";
import { runControlledCommand } from "../../enforcement/runner.js";
import {
  graphBuild,
  graphRebuild,
  graphStatus,
  graphUpdate,
} from "../../intelligence/graph/incremental.js";
import { buildIntelligenceGraph } from "../../intelligence/graph/build.js";
import { EXIT_CODES } from "../../types/index.js";
import type { GraphBuilderMode } from "../../intelligence/graph/build.js";
import { resolveCliProjectRoot } from "../safe-root.js";

function emit(json: boolean, value: unknown, human: string): void {
  if (json) {
    process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
  } else {
    process.stdout.write(`${human}\n`);
  }
}

export async function runGraphSurfaceCommand(options: {
  action: "build" | "update" | "rebuild" | "status" | "show";
  root: string;
  mode?: string;
  json?: boolean;
}): Promise<number> {
  try {
    const gated = await resolveCliProjectRoot(options.root);
    if (!gated.ok) {
      console.error(`Error: ${gated.message}`);
      return gated.code;
    }
    options = { ...options, root: gated.root };
    const mode = (options.mode as GraphBuilderMode | undefined) ?? "auto";
    if (options.action === "status") {
      const status = await graphStatus({ root: options.root });
      emit(
        Boolean(options.json),
        status,
        [
          `Graph index ${status.present ? "present" : "missing"}`,
          `  path: ${status.path}`,
          `  nodes=${status.nodeCount} edges=${status.edgeCount} files=${status.fileCount}`,
          `  builder=${status.builder ?? "n/a"}`,
          `  stale=${status.staleFiles.length} missing=${status.missingFiles.length}`,
          status.corrupt ? `  corrupt: ${status.error}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
      );
      return EXIT_CODES.SUCCESS;
    }
    if (options.action === "update") {
      const result = await graphUpdate({ root: options.root, mode });
      emit(
        Boolean(options.json),
        result,
        `graph update rebuilt=${result.rebuilt} reason=${result.reason} changed=${result.changedFiles.length} nodes=${result.snapshot.nodes.length}`,
      );
      return EXIT_CODES.SUCCESS;
    }
    if (options.action === "rebuild") {
      const result = await graphRebuild({ root: options.root, mode });
      emit(
        Boolean(options.json),
        result,
        `graph rebuild nodes=${result.snapshot.nodes.length} edges=${result.snapshot.edges.length} builder=${result.snapshot.builder}`,
      );
      return EXIT_CODES.SUCCESS;
    }
    // build / show (backward-compat one-shot)
    if (options.action === "show") {
      const graph = await buildIntelligenceGraph({ root: options.root, mode });
      emit(
        Boolean(options.json),
        graph,
        `graph builder=${graph.builder} nodes=${graph.nodes.length} edges=${graph.edges.length} astFiles=${graph.astFilesParsed}`,
      );
      return EXIT_CODES.SUCCESS;
    }
    const result = await graphBuild({ root: options.root, mode });
    emit(
      Boolean(options.json),
      result,
      `graph build nodes=${result.snapshot.nodes.length} edges=${result.snapshot.edges.length} builder=${result.snapshot.builder} path=${result.path}`,
    );
    return EXIT_CODES.SUCCESS;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Error: ${message}\n`);
    return EXIT_CODES.INTERNAL_ERROR;
  }
}

export async function runPolicyCheckCommand(options: {
  root: string;
  command: string;
  json?: boolean;
  failClosed?: boolean;
}): Promise<number> {
  try {
    const verdict = await evaluateAgentAction(
      options.root,
      {
        actionId: `policy-check-${Date.now()}`,
        agentId: "cli",
        timestamp: new Date().toISOString(),
        type: "shell",
        params: { command: options.command },
        repositoryRoot: options.root,
      },
      { failClosed: options.failClosed === true },
    );
    emit(
      Boolean(options.json),
      { ...verdict, notice: EVALUATE_ONLY },
      `policy check decision=${verdict.decision} risk=${verdict.riskLevel}\n  ${verdict.reason}\n  ${EVALUATE_ONLY}`,
    );
    return EXIT_CODES.SUCCESS;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Error: ${message}\n`);
    return EXIT_CODES.INTERNAL_ERROR;
  }
}

export async function runPolicyExplainCommand(options: {
  root: string;
  command: string;
  json?: boolean;
  failClosed?: boolean;
}): Promise<number> {
  try {
    const verdict = await evaluateAgentAction(
      options.root,
      {
        actionId: `policy-explain-${Date.now()}`,
        agentId: "cli",
        timestamp: new Date().toISOString(),
        type: "shell",
        params: { command: options.command },
        repositoryRoot: options.root,
      },
      { failClosed: options.failClosed === true },
    );
    const explanation = {
      command: options.command,
      decision: verdict.decision,
      reason: verdict.reason,
      policyId: verdict.policyId ?? null,
      riskLevel: verdict.riskLevel,
      approvalStatus: verdict.approvalStatus,
      executionResult: verdict.executionResult,
      notice: EVALUATE_ONLY,
      meaning:
        verdict.decision === "allow"
          ? "Allowlisted or matched an allow rule — still evaluate-only unless agentdoctor run / enforce --execute is used."
          : verdict.decision === "block" || verdict.decision === "deny-network"
            ? "Would be blocked by AgentDoctor-controlled runner if executed through it."
            : "Requires human approval or further policy before controlled execution.",
    };
    emit(
      Boolean(options.json),
      explanation,
      [
        `policy explain: ${options.command}`,
        `  decision: ${verdict.decision}`,
        `  policyId: ${verdict.policyId ?? "n/a"}`,
        `  risk: ${verdict.riskLevel}`,
        `  reason: ${verdict.reason}`,
        `  ${explanation.meaning}`,
      ].join("\n"),
    );
    return EXIT_CODES.SUCCESS;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Error: ${message}\n`);
    return EXIT_CODES.INTERNAL_ERROR;
  }
}

export async function runPolicyEnforceCommand(options: {
  root: string;
  command: string;
  execute?: boolean;
  json?: boolean;
  failClosed?: boolean;
}): Promise<number> {
  try {
    const result = await runControlledCommand({
      root: options.root,
      command: options.command,
      executeIfAllowed: options.execute === true,
      failClosed: options.failClosed === true,
    });
    emit(
      Boolean(options.json),
      result,
      [
        `policy enforce decision=${result.decision.decision} status=${result.decision.executionStatus}`,
        `  enforced=${result.enforced}`,
        `  ${result.notice}`,
      ].join("\n"),
    );
    return EXIT_CODES.SUCCESS;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Error: ${message}\n`);
    return EXIT_CODES.INTERNAL_ERROR;
  }
}

export async function runRunExplainCommand(options: {
  root: string;
  command: string;
  json?: boolean;
  failClosed?: boolean;
  shell?: boolean;
}): Promise<number> {
  try {
    const { explainControlledRun } = await import("../../enforcement/runner.js");
    const explanation = await explainControlledRun({
      root: options.root,
      command: options.command,
      failClosed: options.failClosed === true,
      useShell: options.shell === true,
    });
    emit(
      Boolean(options.json),
      explanation,
      [
        `run explain: ${explanation.command}`,
        `  decision: ${explanation.decision}`,
        `  policyId: ${explanation.policyId ?? "n/a"}`,
        `  risk: ${explanation.riskLevel}`,
        `  wouldExecute: ${explanation.wouldExecute}`,
        `  ${explanation.meaning}`,
        `  ${explanation.notice}`,
      ].join("\n"),
    );
    return EXIT_CODES.SUCCESS;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Error: ${message}\n`);
    return EXIT_CODES.INTERNAL_ERROR;
  }
}

export async function runRunCommand(options: {
  root: string;
  argv: string[];
  shell?: boolean;
  timeoutMs?: number;
  json?: boolean;
  failClosed?: boolean;
}): Promise<number> {
  try {
    if (!options.argv.length) {
      process.stderr.write(
        "Error: provide a command after -- (e.g. agentdoctor run -- npm --version)\n",
      );
      return EXIT_CODES.USAGE_ERROR;
    }
    const result = await runControlledCommand({
      root: options.root,
      argv: options.argv,
      executeIfAllowed: true,
      useShell: options.shell === true,
      ...(options.timeoutMs !== undefined ? { timeoutMs: options.timeoutMs } : {}),
      failClosed: options.failClosed === true,
    });
    emit(
      Boolean(options.json),
      result,
      [
        `run decision=${result.decision.decision} status=${result.decision.executionStatus}`,
        `  exitCode=${result.exitCode ?? "n/a"} durationMs=${result.durationMs ?? "n/a"}`,
        `  ${result.notice}`,
        result.stdout ? `--- stdout ---\n${result.stdout}` : "",
        result.stderr ? `--- stderr ---\n${result.stderr}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    );
    if (result.decision.executionStatus === "blocked-by-enforcement") {
      return EXIT_CODES.ISSUES_OR_THRESHOLD;
    }
    if (result.decision.executionStatus === "execution-failed") {
      return EXIT_CODES.INTERNAL_ERROR;
    }
    return EXIT_CODES.SUCCESS;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Error: ${message}\n`);
    return EXIT_CODES.INTERNAL_ERROR;
  }
}
