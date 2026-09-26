import { Command, InvalidArgumentError } from "commander";

import { PACKAGE_VERSION } from "../constants.js";
import { parseFailOnRules, parseSeverityGate } from "../core/policy/evaluate.js";
import { EXIT_CODES } from "../types/index.js";
import { runBrainMcpCommand } from "./commands/brain-mcp.js";
import { runBrainCommand } from "./commands/brain.js";
import { runDoctorCommand } from "./commands/doctor.js";
import { runExplainCommand } from "./commands/explain.js";
import { runFixCommand } from "./commands/fix.js";
import { resolveTargetArgument, runScanCommand } from "./commands/scan.js";
import { runVerifyCommand } from "./commands/verify.js";
import {
  runBaselineCommand,
  runChangesCommand,
  runContextHealthCommand,
  runDashboardCommand,
  runFixHistoryCommand,
  runFixUndoCommand,
  runLocalAiCommand,
  runPackagesCommand,
  runPluginsCommand,
  runPrReviewCommand,
  runSecretsCommand,
} from "./commands/v2.js";
import { runPlatformCommand } from "./commands/platform.js";
import { runInitCommand, runV2SurfaceCommand } from "./commands/complete.js";
import { runMcpCommand } from "./commands/mcp.js";
import {
  runChangeAnalyzeCommand,
  runChangeDiffCommand,
  runChangeExplainCommand,
  runChangeStatusCommand,
  runChangeVerifyCommand,
  runEvidenceInspectCommand,
  runEvidenceVerifyCommand,
  runProofBuildCommand,
  runProofExplainCommand,
  runProofExportCommand,
  runProofInspectCommand,
  runProofVerifyCommand,
} from "./commands/assurance.js";
import {
  runGraphSurfaceCommand,
  runPolicyCheckCommand,
  runPolicyEnforceCommand,
  runPolicyExplainCommand,
  runRunCommand,
  runRunExplainCommand,
} from "./commands/policy-graph-run.js";
import { runArchitectureCommand } from "./commands/architecture.js";
import { runWorkspaceCommand } from "./commands/workspace.js";
import { runAskCommand, runChatCommand } from "./commands/chat.js";
import { runAgentCommand, runPlanCommand } from "./commands/agent.js";
import { runLearnCommand } from "./commands/learn.js";
import { runProductCommand } from "./commands/product.js";
import { runStartCommand, runDnaCommand } from "./commands/start.js";
import type { AgentRole } from "../agent/roles.js";
import { collectOpsHealth } from "../ops/health.js";
import { listSessions, loadSession } from "../platform/sessions/store.js";
import { exportReports } from "../platform/reports/export.js";
import { runPlatformScan } from "../platform/index.js";
import {
  analyzeTestImpact,
  formatTestImpactHuman,
  persistTestImpactReport,
} from "../platform/test-impact/analyze.js";
import { resolveRepoRoot } from "../utils/path.js";

function parseMinScore(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
    throw new InvalidArgumentError("--min-score must be a number between 0 and 100");
  }
  return parsed;
}

function readMinScore(options: { minScore?: unknown }): number | undefined {
  if (typeof options.minScore === "number") {
    return options.minScore;
  }
  if (typeof options.minScore === "string") {
    return parseMinScore(options.minScore);
  }
  return undefined;
}

function collectFailOnRules(value: string, previous: string[]): string[] {
  return [...previous, ...parseFailOnRules(value)];
}

function readFailOnSeverity(options: {
  failOnSeverity?: unknown;
}): ReturnType<typeof parseSeverityGate> | undefined {
  if (typeof options.failOnSeverity !== "string" || options.failOnSeverity.length === 0) {
    return undefined;
  }
  return parseSeverityGate(options.failOnSeverity);
}

function readFailOnRules(options: { failOnRule?: unknown }): string[] {
  if (Array.isArray(options.failOnRule)) {
    return options.failOnRule.filter((item): item is string => typeof item === "string");
  }
  if (typeof options.failOnRule === "string") {
    return parseFailOnRules(options.failOnRule);
  }
  return [];
}

/**
 * Scan flags are declared on both the root program and the `scan` subcommand
 * so `--help` stays accurate. Commander stores overlapping flags on the parent
 * when `scan` is invoked, so callers must read `optsWithGlobals()`.
 */
function addScanOptions(command: Command): Command {
  return command
    .option("--json", "Emit machine-readable JSON (no decorative output)", false)
    .option(
      "--ci",
      "CI mode: exit 1 when any critical finding exists (override with --fail-on-severity)",
      false,
    )
    .option("--verbose", "Show timing and extra diagnostics", false)
    .option(
      "--min-score <number>",
      "Exit 1 when overall readiness score is below this (0-100)",
      parseMinScore,
    )
    .option(
      "--fail-on-severity <level>",
      "Exit 1 when any finding has this severity or higher (critical|warning|info)",
      parseSeverityGate,
    )
    .option(
      "--fail-on-rule <id>",
      "Exit 1 when a finding matches this rule id (repeatable or comma-separated)",
      collectFailOnRules,
      [],
    )
    .option(
      "--summary",
      "Write a GitHub Actions step summary when GITHUB_STEP_SUMMARY is set",
      false,
    )
    .option("--annotations", "Emit GitHub Actions annotations for findings (stderr)", false);
}

async function runScanFromCli(pathArg: string | undefined, command: Command): Promise<void> {
  const options = command.optsWithGlobals() as {
    json?: boolean;
    ci?: boolean;
    verbose?: boolean;
    minScore?: unknown;
    failOnSeverity?: unknown;
    failOnRule?: unknown;
    summary?: boolean;
    annotations?: boolean;
  };
  const minScore = readMinScore(options);
  const failOnSeverity = readFailOnSeverity(options);
  const failOnRules = readFailOnRules(options);
  const code = await runScanCommand({
    targetPath: resolveTargetArgument(pathArg),
    json: Boolean(options.json),
    ci: Boolean(options.ci),
    verbose: Boolean(options.verbose),
    summary: Boolean(options.summary),
    annotations: Boolean(options.annotations),
    ...(minScore !== undefined ? { minScore } : {}),
    ...(failOnSeverity !== undefined ? { failOnSeverity } : {}),
    ...(failOnRules.length > 0 ? { failOnRules } : {}),
  });
  process.exitCode = code;
}

export function createProgram(): Command {
  const program = new Command();

  addScanOptions(
    program
      .name("agentdoctor")
      .description(
        "Engineering intelligence and safety for AI coding agents — scan, knowledge, MCP, and verification (local, deterministic; no API key required for core flows).",
      )
      .version(PACKAGE_VERSION, "-V, --version", "Print AgentDoctor version")
      .argument("[path]", "Repository path to scan (default: current directory)"),
  ).action(async (pathArg: string | undefined, _options, command: Command) => {
    await runScanFromCli(pathArg, command);
  });

  addScanOptions(
    program
      .command("scan")
      .description("Scan a repository for AI coding agent configuration issues (default command)")
      .argument("[path]", "Repository path to scan"),
  ).action(async (pathArg: string | undefined, _options, command: Command) => {
    await runScanFromCli(pathArg, command);
  });

  program
    .command("fix")
    .description(
      "Apply safe automatic fixes (.cursorignore, Claude Code Read deny, Codex filesystem deny, .geminiignore, .aiderignore for safe context findings)",
    )
    .argument("[path]", "Repository path (default: current directory)")
    .option("--dry-run", "Show proposed fixes without writing files", false)
    .option("-y, --yes", "Skip confirmation prompts", false)
    .action(async (pathArg: string | undefined, options) => {
      const code = await runFixCommand({
        targetPath: resolveTargetArgument(pathArg),
        dryRun: Boolean(options.dryRun),
        yes: Boolean(options.yes),
      });
      process.exitCode = code;
    });

  program
    .command("fix-undo")
    .description("Restore files from a Safe Fix audit backup")
    .argument("<auditId>", "Audit id from fix-history")
    .argument("[path]", "Repository path (default: current directory)")
    .action(async (auditId: string, pathArg: string | undefined) => {
      process.exitCode = await runFixUndoCommand({
        auditId,
        root: resolveTargetArgument(pathArg),
      });
    });

  program
    .command("fix-history")
    .description("List Safe Fix audit / backup records")
    .argument("[path]", "Repository path (default: current directory)")
    .option("--json", "Emit JSON", false)
    .action(async (pathArg: string | undefined, options: { json?: boolean }) => {
      process.exitCode = await runFixHistoryCommand({
        root: resolveTargetArgument(pathArg),
        json: Boolean(options.json),
      });
    });

  const brain = program.command("brain").description("Project Brain CLI (local, deterministic)");
  brain
    .command("init")
    .description("Ensure Project Brain store directories exist")
    .argument("[path]", "Repository path")
    .option("--json", "Emit JSON", false)
    .action(async (pathArg: string | undefined, _options, command: Command) => {
      const options = command.optsWithGlobals() as { json?: boolean };
      process.exitCode = await runBrainCommand({
        action: "init",
        root: resolveTargetArgument(pathArg),
        json: Boolean(options.json),
      });
    });
  brain
    .command("status")
    .description("Show Project Brain store status")
    .argument("[path]", "Repository path")
    .option("--json", "Emit JSON", false)
    .action(async (pathArg: string | undefined, _options, command: Command) => {
      const options = command.optsWithGlobals() as { json?: boolean };
      process.exitCode = await runBrainCommand({
        action: "status",
        root: resolveTargetArgument(pathArg),
        json: Boolean(options.json),
      });
    });
  brain
    .command("inspect")
    .description("Inspect latest Project Brain summary")
    .argument("[path]", "Repository path")
    .option("--json", "Emit JSON", false)
    .action(async (pathArg: string | undefined, _options, command: Command) => {
      const options = command.optsWithGlobals() as { json?: boolean };
      process.exitCode = await runBrainCommand({
        action: "inspect",
        root: resolveTargetArgument(pathArg),
        json: Boolean(options.json),
      });
    });
  brain
    .command("rebuild")
    .description("Compile and save a new Project Brain snapshot")
    .argument("[path]", "Repository path")
    .option("--json", "Emit JSON", false)
    .action(async (pathArg: string | undefined, _options, command: Command) => {
      const options = command.optsWithGlobals() as { json?: boolean };
      process.exitCode = await runBrainCommand({
        action: "rebuild",
        root: resolveTargetArgument(pathArg),
        json: Boolean(options.json),
      });
    });
  brain
    .command("history")
    .description("List Project Brain snapshots")
    .argument("[path]", "Repository path")
    .option("--json", "Emit JSON", false)
    .action(async (pathArg: string | undefined, _options, command: Command) => {
      const options = command.optsWithGlobals() as { json?: boolean };
      process.exitCode = await runBrainCommand({
        action: "history",
        root: resolveTargetArgument(pathArg),
        json: Boolean(options.json),
      });
    });
  brain
    .command("search")
    .description("Search claims/components in the latest brain")
    .argument("<query>", "Search text")
    .argument("[path]", "Repository path")
    .option("--json", "Emit JSON", false)
    .action(async (query: string, pathArg: string | undefined, _options, command: Command) => {
      const options = command.optsWithGlobals() as { json?: boolean };
      process.exitCode = await runBrainCommand({
        action: "search",
        query,
        root: resolveTargetArgument(pathArg),
        json: Boolean(options.json),
      });
    });
  brain
    .command("export")
    .description("Export a redacted brain snapshot to JSON")
    .requiredOption("--file <path>", "Output file")
    .option("--snapshot <id>", "Snapshot id (default: latest)")
    .argument("[path]", "Repository path")
    .action(async (pathArg: string | undefined, options: { file: string; snapshot?: string }) => {
      process.exitCode = await runBrainCommand({
        action: "export",
        file: options.file,
        ...(options.snapshot ? { snapshotId: options.snapshot } : {}),
        root: resolveTargetArgument(pathArg),
      });
    });
  brain
    .command("import")
    .description("Import a brain JSON snapshot into the local store")
    .requiredOption("--file <path>", "Input file")
    .argument("[path]", "Repository path")
    .action(async (pathArg: string | undefined, options: { file: string }) => {
      process.exitCode = await runBrainCommand({
        action: "import",
        file: options.file,
        root: resolveTargetArgument(pathArg),
      });
    });
  brain
    .command("snapshot")
    .description("Create Brain + Repository Brain product snapshots")
    .argument("[path]", "Repository path")
    .option("--json", "Emit JSON", false)
    .action(async (pathArg: string | undefined, _options, command: Command) => {
      const options = command.optsWithGlobals() as { json?: boolean };
      process.exitCode = await runBrainCommand({
        action: "snapshot",
        root: resolveTargetArgument(pathArg),
        json: Boolean(options.json),
      });
    });
  brain
    .command("update")
    .description("Rebuild Project Brain and write product snapshot")
    .argument("[path]", "Repository path")
    .option("--json", "Emit JSON", false)
    .action(async (pathArg: string | undefined, _options, command: Command) => {
      const options = command.optsWithGlobals() as { json?: boolean };
      process.exitCode = await runBrainCommand({
        action: "update",
        root: resolveTargetArgument(pathArg),
        json: Boolean(options.json),
      });
    });
  brain
    .command("review")
    .description("Human review of Repository Brain proposals (never auto-approves)")
    .requiredOption("--artifact <id>", "Proposal artifact id")
    .requiredOption("--decision <status>", "approved|rejected|pending-review|deprecated")
    .option("--note <text>", "Review note")
    .argument("[path]", "Repository path")
    .option("--json", "Emit JSON", false)
    .action(async (pathArg: string | undefined, _options, command: Command) => {
      const options = command.optsWithGlobals() as {
        artifact: string;
        decision: "approved" | "rejected" | "pending-review" | "deprecated";
        note?: string;
        json?: boolean;
      };
      process.exitCode = await runBrainCommand({
        action: "review",
        artifactId: options.artifact,
        decision: options.decision,
        ...(options.note ? { note: options.note } : {}),
        root: resolveTargetArgument(pathArg),
        json: Boolean(options.json),
      });
    });
  brain
    .command("proposals")
    .description("List Repository Brain proposal artifacts")
    .argument("[path]", "Repository path")
    .option("--json", "Emit JSON", false)
    .action(async (pathArg: string | undefined, _options, command: Command) => {
      const options = command.optsWithGlobals() as { json?: boolean };
      process.exitCode = await runBrainCommand({
        action: "proposals",
        root: resolveTargetArgument(pathArg),
        json: Boolean(options.json),
      });
    });

  program
    .command("init")
    .description("Repository Brain initializer — PROPOSED artifacts only (not approved facts)")
    .argument("[path]", "Repository path")
    .option("--name <name>", "Project name")
    .option("--domain <domain>", "Business domain")
    .option("--json", "Emit JSON", false)
    .action(async (pathArg: string | undefined, _options, command: Command) => {
      const options = command.optsWithGlobals() as {
        name?: string;
        domain?: string;
        json?: boolean;
      };
      process.exitCode = await runInitCommand({
        root: resolveTargetArgument(pathArg),
        json: Boolean(options.json),
        ...(options.name ? { name: options.name } : {}),
        ...(options.domain ? { domain: options.domain } : {}),
      });
    });

  const graph = program
    .command("graph")
    .description(
      "Build / update intelligence graph (TypeScript AST when available; regex fallback). Bare `graph` aliases build.",
    )
    .argument("[path]", "Repository path")
    .option("--mode <mode>", "auto|regex|typescript-ast", "auto")
    .option("--json", "Emit JSON", false)
    .action(async (pathArg: string | undefined, _options, command: Command) => {
      const options = command.optsWithGlobals() as { mode?: string; json?: boolean };
      // Backward compat: `agentdoctor graph --json` → build + persist
      process.exitCode = await runGraphSurfaceCommand({
        action: "build",
        root: resolveTargetArgument(pathArg),
        mode: options.mode ?? "auto",
        json: Boolean(options.json),
      });
    });
  graph
    .command("build")
    .description("Build graph and persist .agentdoctor/graph/index.json")
    .argument("[path]", "Repository path")
    .option("--mode <mode>", "auto|regex|typescript-ast", "auto")
    .option("--json", "Emit JSON", false)
    .action(async (pathArg: string | undefined, options: { mode?: string; json?: boolean }) => {
      process.exitCode = await runGraphSurfaceCommand({
        action: "build",
        root: resolveTargetArgument(pathArg),
        mode: options.mode ?? "auto",
        json: Boolean(options.json),
      });
    });
  graph
    .command("update")
    .description("Incrementally update graph from git/hash changes (rebuilds on corruption)")
    .argument("[path]", "Repository path")
    .option("--mode <mode>", "auto|regex|typescript-ast", "auto")
    .option("--json", "Emit JSON", false)
    .action(async (pathArg: string | undefined, options: { mode?: string; json?: boolean }) => {
      process.exitCode = await runGraphSurfaceCommand({
        action: "update",
        root: resolveTargetArgument(pathArg),
        mode: options.mode ?? "auto",
        json: Boolean(options.json),
      });
    });
  graph
    .command("rebuild")
    .description("Force full graph rebuild")
    .argument("[path]", "Repository path")
    .option("--mode <mode>", "auto|regex|typescript-ast", "auto")
    .option("--json", "Emit JSON", false)
    .action(async (pathArg: string | undefined, options: { mode?: string; json?: boolean }) => {
      process.exitCode = await runGraphSurfaceCommand({
        action: "rebuild",
        root: resolveTargetArgument(pathArg),
        mode: options.mode ?? "auto",
        json: Boolean(options.json),
      });
    });
  graph
    .command("status")
    .description("Show persisted graph index status")
    .argument("[path]", "Repository path")
    .option("--json", "Emit JSON", false)
    .action(async (pathArg: string | undefined, options: { json?: boolean }) => {
      process.exitCode = await runGraphSurfaceCommand({
        action: "status",
        root: resolveTargetArgument(pathArg),
        json: Boolean(options.json),
      });
    });

  program
    .command("health")
    .description("Git hotspot / engineering intelligence report")
    .argument("[path]", "Repository path")
    .option("--json", "Emit JSON", false)
    .action(async (pathArg: string | undefined, _options, command: Command) => {
      const options = command.optsWithGlobals() as { json?: boolean };
      process.exitCode = await runV2SurfaceCommand({
        action: "health",
        root: resolveTargetArgument(pathArg),
        json: Boolean(options.json),
      });
    });

  program
    .command("impact")
    .description(
      "Change/test impact analysis (heuristic by default; coverage-backed with --coverage)",
    )
    .argument("[path]", "Repository path")
    .option("--coverage <path>", "LCOV / Istanbul JSON / Cobertura XML coverage file")
    .option("--since <ref>", "Diff since git ref")
    .option("--json", "Emit JSON", false)
    .action(async (pathArg: string | undefined, _options, command: Command) => {
      const options = command.optsWithGlobals() as {
        json?: boolean;
        coverage?: string;
        since?: string;
      };
      const root = resolveTargetArgument(pathArg);
      try {
        const impact = await analyzeTestImpact({
          root,
          ...(options.coverage ? { coveragePath: options.coverage } : {}),
          ...(options.since ? { since: options.since } : {}),
        });
        if (options.json) {
          process.stdout.write(`${JSON.stringify(impact, null, 2)}\n`);
        } else {
          process.stdout.write(formatTestImpactHuman(impact));
        }
        process.exitCode = EXIT_CODES.SUCCESS;
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exitCode = EXIT_CODES.INTERNAL_ERROR;
      }
    });

  program
    .command("test-impact")
    .description("Test-impact analysis (alias of impact)")
    .argument("[path]", "Repository path")
    .option("--coverage <path>", "LCOV / Istanbul JSON / Cobertura XML coverage file")
    .option("--since <ref>", "Diff since git ref")
    .option("--json", "Emit JSON", false)
    .action(async (pathArg: string | undefined, _options, command: Command) => {
      const options = command.optsWithGlobals() as {
        json?: boolean;
        coverage?: string;
        since?: string;
      };
      const root = resolveTargetArgument(pathArg);
      try {
        const impact = await analyzeTestImpact({
          root,
          ...(options.coverage ? { coveragePath: options.coverage } : {}),
          ...(options.since ? { since: options.since } : {}),
        });
        const out = await persistTestImpactReport(resolveRepoRoot(root), impact);
        if (options.json) {
          process.stdout.write(`${JSON.stringify({ ...impact, reportPath: out }, null, 2)}\n`);
        } else {
          process.stdout.write(formatTestImpactHuman(impact));
          process.stdout.write(`  wrote: ${out}\n`);
        }
        process.exitCode = EXIT_CODES.SUCCESS;
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exitCode = EXIT_CODES.INTERNAL_ERROR;
      }
    });

  program
    .command("refactor-impact")
    .description("Refactor/rename blast-radius analysis")
    .requiredOption("--symbol <name>", "Symbol to analyze")
    .argument("[path]", "Repository path")
    .option("--json", "Emit JSON", false)
    .action(async (pathArg: string | undefined, _options, command: Command) => {
      const options = command.optsWithGlobals() as { symbol: string; json?: boolean };
      process.exitCode = await runV2SurfaceCommand({
        action: "refactor-impact",
        root: resolveTargetArgument(pathArg),
        symbol: options.symbol,
        json: Boolean(options.json),
      });
    });

  program
    .command("session")
    .description("List or show agent sessions")
    .argument("[path]", "Repository path")
    .option("--id <id>", "Session id to show")
    .option("--json", "Emit JSON", false)
    .action(async (pathArg: string | undefined, _options, command: Command) => {
      const options = command.optsWithGlobals() as { id?: string; json?: boolean };
      const root = resolveTargetArgument(pathArg);
      try {
        if (options.id) {
          const session = await loadSession(root, options.id);
          if (options.json) process.stdout.write(`${JSON.stringify(session, null, 2)}\n`);
          else process.stdout.write(`${session?.id ?? "not-found"}\n`);
        } else {
          const sessions = await listSessions(root);
          if (options.json) process.stdout.write(`${JSON.stringify(sessions, null, 2)}\n`);
          else for (const id of sessions) process.stdout.write(`${id}\n`);
        }
        process.exitCode = EXIT_CODES.SUCCESS;
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exitCode = EXIT_CODES.INTERNAL_ERROR;
      }
    });

  program
    .command("report")
    .description("Run platform scan and export local reports")
    .argument("[path]", "Repository path")
    .option("--json", "Emit JSON", false)
    .action(async (pathArg: string | undefined, _options, command: Command) => {
      const options = command.optsWithGlobals() as { json?: boolean };
      const root = resolveTargetArgument(pathArg);
      try {
        const result = await runPlatformScan(root);
        const paths = await exportReports({
          root,
          findings: result.snapshot.findings,
          readiness: result.snapshot.readiness,
          snapshot: result.snapshot,
        });
        if (options.json)
          process.stdout.write(`${JSON.stringify({ ...result.reportPaths, ...paths }, null, 2)}\n`);
        else process.stdout.write(`Reports written under .agentdoctor/platform/\n`);
        process.exitCode = EXIT_CODES.SUCCESS;
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exitCode = EXIT_CODES.INTERNAL_ERROR;
      }
    });

  program
    .command("c4")
    .description("C4-style architecture views from graph evidence")
    .argument("[path]", "Repository path")
    .option("--json", "Emit JSON", false)
    .action(async (pathArg: string | undefined, _options, command: Command) => {
      const options = command.optsWithGlobals() as { json?: boolean };
      process.exitCode = await runV2SurfaceCommand({
        action: "c4",
        root: resolveTargetArgument(pathArg),
        json: Boolean(options.json),
      });
    });

  const architecture = program
    .command("architecture")
    .description(
      "Architecture contract + C4 views (rules are advisory until you treat check as a gate)",
    );
  architecture
    .command("init")
    .description("Write default .agentdoctor/architecture.json if missing")
    .argument("[path]", "Repository path")
    .option("--json", "Emit JSON", false)
    .action(async (pathArg: string | undefined, options: { json?: boolean }) => {
      process.exitCode = await runArchitectureCommand({
        action: "init",
        root: resolveTargetArgument(pathArg),
        json: Boolean(options.json),
      });
    });
  architecture
    .command("analyze")
    .description("C4 views + architecture contract summary")
    .argument("[path]", "Repository path")
    .option("--json", "Emit JSON", false)
    .action(async (pathArg: string | undefined, options: { json?: boolean }) => {
      process.exitCode = await runArchitectureCommand({
        action: "analyze",
        root: resolveTargetArgument(pathArg),
        json: Boolean(options.json),
      });
    });
  architecture
    .command("check")
    .description("Check import edges against .agentdoctor/architecture.json|.yml")
    .argument("[path]", "Repository path")
    .option("--json", "Emit JSON", false)
    .action(async (pathArg: string | undefined, options: { json?: boolean }) => {
      process.exitCode = await runArchitectureCommand({
        action: "check",
        root: resolveTargetArgument(pathArg),
        json: Boolean(options.json),
      });
    });
  architecture
    .command("explain")
    .description("Explain architecture layers, forbidden/allowed rules, and recent violations")
    .argument("[path]", "Repository path")
    .option("--json", "Emit JSON", false)
    .action(async (pathArg: string | undefined, options: { json?: boolean }) => {
      process.exitCode = await runArchitectureCommand({
        action: "explain",
        root: resolveTargetArgument(pathArg),
        json: Boolean(options.json),
      });
    });

  program
    .command("knowledge")
    .description("List governed knowledge records")
    .argument("[path]", "Repository path")
    .option("--json", "Emit JSON", false)
    .action(async (pathArg: string | undefined, _options, command: Command) => {
      const options = command.optsWithGlobals() as { json?: boolean };
      process.exitCode = await runV2SurfaceCommand({
        action: "knowledge-list",
        root: resolveTargetArgument(pathArg),
        json: Boolean(options.json),
      });
    });

  program
    .command("knowledge-create")
    .description("Create a draft knowledge record")
    .requiredOption("--title <title>", "Title")
    .requiredOption("--content <text>", "Content")
    .argument("[path]", "Repository path")
    .option("--json", "Emit JSON", false)
    .action(async (pathArg: string | undefined, _options, command: Command) => {
      const options = command.optsWithGlobals() as {
        title: string;
        content: string;
        json?: boolean;
      };
      process.exitCode = await runV2SurfaceCommand({
        action: "knowledge-create",
        root: resolveTargetArgument(pathArg),
        title: options.title,
        content: options.content,
        json: Boolean(options.json),
      });
    });

  program
    .command("knowledge-approve")
    .description("Transition knowledge record (explicit human approval)")
    .requiredOption("--id <id>", "Record id")
    .requiredOption("--decision <status>", "approved|rejected|pending-review|deprecated|draft")
    .argument("[path]", "Repository path")
    .option("--json", "Emit JSON", false)
    .action(async (pathArg: string | undefined, _options, command: Command) => {
      const options = command.optsWithGlobals() as { id: string; decision: string; json?: boolean };
      process.exitCode = await runV2SurfaceCommand({
        action: "knowledge-transition",
        root: resolveTargetArgument(pathArg),
        id: options.id,
        decision: options.decision,
        json: Boolean(options.json),
      });
    });

  program
    .command("enforce")
    .description("AgentDoctor-controlled runner policy check (does not execute by default)")
    .requiredOption("--command <cmd>", "Command string")
    .argument("[path]", "Repository path")
    .option("--json", "Emit JSON", false)
    .action(async (pathArg: string | undefined, _options, command: Command) => {
      const options = command.optsWithGlobals() as { command: string; json?: boolean };
      process.exitCode = await runV2SurfaceCommand({
        action: "enforce-check",
        root: resolveTargetArgument(pathArg),
        command: options.command,
        json: Boolean(options.json),
      });
    });

  program
    .command("team-register")
    .description("Register local-dev team user (NOT enterprise SSO)")
    .requiredOption("--username <name>", "Username")
    .requiredOption("--password <password>", "Password (min 8)")
    .argument("[path]", "Repository path")
    .option("--json", "Emit JSON", false)
    .action(async (pathArg: string | undefined, _options, command: Command) => {
      const options = command.optsWithGlobals() as {
        username: string;
        password: string;
        json?: boolean;
      };
      process.exitCode = await runV2SurfaceCommand({
        action: "team-register",
        root: resolveTargetArgument(pathArg),
        username: options.username,
        password: options.password,
        json: Boolean(options.json),
      });
    });

  program
    .command("team-login")
    .description("Authenticate local-dev team user (NOT enterprise SSO)")
    .requiredOption("--username <name>", "Username")
    .requiredOption("--password <password>", "Password")
    .argument("[path]", "Repository path")
    .option("--json", "Emit JSON", false)
    .action(async (pathArg: string | undefined, _options, command: Command) => {
      const options = command.optsWithGlobals() as {
        username: string;
        password: string;
        json?: boolean;
      };
      process.exitCode = await runV2SurfaceCommand({
        action: "team-login",
        root: resolveTargetArgument(pathArg),
        username: options.username,
        password: options.password,
        json: Boolean(options.json),
      });
    });

  const change = program
    .command("change")
    .description(
      "Change assurance — structured assessment and evidence (never claims verified without evidence)",
    );
  change
    .command("analyze")
    .description("Assemble a ChangeAssessment from git, graph, policy, knowledge, and test signals")
    .argument("[path]", "Repository path")
    .option("--since <ref>", "Diff since git ref (e.g. main)")
    .option("--coverage <path>", "LCOV / Istanbul JSON / Cobertura XML coverage file")
    .option("--json", "Emit JSON", false)
    .action(
      async (
        pathArg: string | undefined,
        options: { since?: string; coverage?: string; json?: boolean },
      ) => {
        process.exitCode = await runChangeAnalyzeCommand({
          root: resolveTargetArgument(pathArg),
          ...(options.since ? { since: options.since } : {}),
          ...(options.coverage ? { coverage: options.coverage } : {}),
          json: Boolean(options.json),
        });
      },
    );
  change
    .command("verify")
    .description(
      "Produce a durable evidence bundle under .agentdoctor/evidence/<id>/ (status: evidence-produced)",
    )
    .argument("[path]", "Repository path")
    .option("--since <ref>", "Diff since git ref (e.g. main)")
    .option("--change-id <id>", "Reuse a change id")
    .option("--coverage <path>", "LCOV / Istanbul JSON / Cobertura XML coverage file")
    .option("--json", "Emit JSON", false)
    .action(
      async (
        pathArg: string | undefined,
        options: { since?: string; changeId?: string; coverage?: string; json?: boolean },
      ) => {
        process.exitCode = await runChangeVerifyCommand({
          root: resolveTargetArgument(pathArg),
          ...(options.since ? { since: options.since } : {}),
          ...(options.changeId ? { changeId: options.changeId } : {}),
          ...(options.coverage ? { coverage: options.coverage } : {}),
          json: Boolean(options.json),
        });
      },
    );
  change
    .command("explain")
    .description("Human explanation of a change assessment (does not claim correctness)")
    .argument("[path]", "Repository path")
    .option("--since <ref>", "Diff since git ref")
    .option("--change-id <id>", "Change id")
    .option("--coverage <path>", "LCOV / Istanbul JSON / Cobertura XML coverage file")
    .option("--json", "Emit JSON", false)
    .action(
      async (
        pathArg: string | undefined,
        options: { since?: string; changeId?: string; coverage?: string; json?: boolean },
      ) => {
        process.exitCode = await runChangeExplainCommand({
          root: resolveTargetArgument(pathArg),
          ...(options.since ? { since: options.since } : {}),
          ...(options.changeId ? { changeId: options.changeId } : {}),
          ...(options.coverage ? { coverage: options.coverage } : {}),
          json: Boolean(options.json),
        });
      },
    );
  change
    .command("diff")
    .description("Summarize base/target file diffs from git")
    .argument("[path]", "Repository path")
    .option("--since <ref>", "Diff since git ref")
    .option("--change-id <id>", "Change id (label only)")
    .option("--json", "Emit JSON", false)
    .action(
      async (
        pathArg: string | undefined,
        options: { since?: string; changeId?: string; json?: boolean },
      ) => {
        process.exitCode = await runChangeDiffCommand({
          root: resolveTargetArgument(pathArg),
          ...(options.since ? { since: options.since } : {}),
          ...(options.changeId ? { changeId: options.changeId } : {}),
          json: Boolean(options.json),
        });
      },
    );
  change
    .command("status")
    .description("Verification / evidence status for latest or --change-id")
    .argument("[path]", "Repository path")
    .option("--change-id <id>", "Change id")
    .option("--json", "Emit JSON", false)
    .action(async (pathArg: string | undefined, options: { changeId?: string; json?: boolean }) => {
      process.exitCode = await runChangeStatusCommand({
        root: resolveTargetArgument(pathArg),
        ...(options.changeId ? { changeId: options.changeId } : {}),
        json: Boolean(options.json),
      });
    });

  const evidence = program
    .command("evidence")
    .description("Inspect and hash-verify change evidence bundles");
  evidence
    .command("inspect")
    .description("List evidence artifacts for a change id")
    .argument("<changeId>", "Change id (chg_…)")
    .argument("[path]", "Repository path")
    .option("--json", "Emit JSON", false)
    .action(async (changeId: string, pathArg: string | undefined, options: { json?: boolean }) => {
      process.exitCode = await runEvidenceInspectCommand({
        root: resolveTargetArgument(pathArg),
        changeId,
        json: Boolean(options.json),
      });
    });
  evidence
    .command("verify")
    .description("Hash-check evidence bundle; status verified only when all hashes match")
    .argument("<changeId>", "Change id (chg_…)")
    .argument("[path]", "Repository path")
    .option("--json", "Emit JSON", false)
    .action(async (changeId: string, pathArg: string | undefined, options: { json?: boolean }) => {
      process.exitCode = await runEvidenceVerifyCommand({
        root: resolveTargetArgument(pathArg),
        changeId,
        json: Boolean(options.json),
      });
    });

  const proof = program
    .command("proof")
    .description(
      "ChangeProof — hash integrity over evidence (never claims engineering correctness)",
    );
  proof
    .command("build")
    .description("Build a ChangeProof from an evidence bundle")
    .argument("<changeId>", "Change id (chg_…)")
    .argument("[path]", "Repository path")
    .option("--json", "Emit JSON", false)
    .action(async (changeId: string, pathArg: string | undefined, options: { json?: boolean }) => {
      process.exitCode = await runProofBuildCommand({
        root: resolveTargetArgument(pathArg),
        changeId,
        json: Boolean(options.json),
      });
    });
  proof
    .command("inspect")
    .description("Inspect a proof by proofId or changeId")
    .argument("<id>", "proofId or changeId")
    .argument("[path]", "Repository path")
    .option("--json", "Emit JSON", false)
    .action(async (id: string, pathArg: string | undefined, options: { json?: boolean }) => {
      process.exitCode = await runProofInspectCommand({
        root: resolveTargetArgument(pathArg),
        id,
        json: Boolean(options.json),
      });
    });
  proof
    .command("explain")
    .description("Human explanation of a ChangeProof (does not claim correctness)")
    .argument("<id>", "proofId or changeId")
    .argument("[path]", "Repository path")
    .option("--json", "Emit JSON", false)
    .action(async (id: string, pathArg: string | undefined, options: { json?: boolean }) => {
      process.exitCode = await runProofExplainCommand({
        root: resolveTargetArgument(pathArg),
        id,
        json: Boolean(options.json),
      });
    });
  proof
    .command("verify")
    .description("Re-hash evidence and compare to proof (integrity only)")
    .argument("<id>", "proofId or changeId")
    .argument("[path]", "Repository path")
    .option("--json", "Emit JSON", false)
    .action(async (id: string, pathArg: string | undefined, options: { json?: boolean }) => {
      process.exitCode = await runProofVerifyCommand({
        root: resolveTargetArgument(pathArg),
        id,
        json: Boolean(options.json),
      });
    });
  proof
    .command("export")
    .description("Export a proof JSON file")
    .argument("<id>", "proofId or changeId")
    .requiredOption("--out <file>", "Output file path")
    .argument("[path]", "Repository path")
    .option("--json", "Emit JSON", false)
    .action(
      async (id: string, pathArg: string | undefined, options: { out: string; json?: boolean }) => {
        process.exitCode = await runProofExportCommand({
          root: resolveTargetArgument(pathArg),
          id,
          out: options.out,
          json: Boolean(options.json),
        });
      },
    );

  const policy = program
    .command("policy")
    .description("Action policy check / explain / enforce (controlled runner)");
  policy
    .command("check")
    .description("Evaluate a command against local policy (evaluate-only)")
    .requiredOption("--command <cmd>", "Command string")
    .argument("[path]", "Repository path")
    .option("--fail-closed", "Deny on invalid local policy", false)
    .option("--json", "Emit JSON", false)
    .action(
      async (
        pathArg: string | undefined,
        options: { command: string; failClosed?: boolean; json?: boolean },
      ) => {
        process.exitCode = await runPolicyCheckCommand({
          root: resolveTargetArgument(pathArg),
          command: options.command,
          failClosed: Boolean(options.failClosed),
          json: Boolean(options.json),
        });
      },
    );
  policy
    .command("explain")
    .description("Explain why a command receives its policy decision")
    .requiredOption("--command <cmd>", "Command string")
    .argument("[path]", "Repository path")
    .option("--fail-closed", "Deny on invalid local policy", false)
    .option("--json", "Emit JSON", false)
    .action(
      async (
        pathArg: string | undefined,
        options: { command: string; failClosed?: boolean; json?: boolean },
      ) => {
        process.exitCode = await runPolicyExplainCommand({
          root: resolveTargetArgument(pathArg),
          command: options.command,
          failClosed: Boolean(options.failClosed),
          json: Boolean(options.json),
        });
      },
    );
  policy
    .command("enforce")
    .description("Evaluate policy; optionally execute when --execute and decision=allow")
    .requiredOption("--command <cmd>", "Command string")
    .option("--execute", "Execute via controlled runner when allowed", false)
    .argument("[path]", "Repository path")
    .option("--fail-closed", "Deny on invalid local policy", false)
    .option("--json", "Emit JSON", false)
    .action(
      async (
        pathArg: string | undefined,
        options: { command: string; execute?: boolean; failClosed?: boolean; json?: boolean },
      ) => {
        process.exitCode = await runPolicyEnforceCommand({
          root: resolveTargetArgument(pathArg),
          command: options.command,
          execute: Boolean(options.execute),
          failClosed: Boolean(options.failClosed),
          json: Boolean(options.json),
        });
      },
    );

  const runCmd = program
    .command("run")
    .description(
      "Controlled execution (shell=false by default). Prefer: agentdoctor run -- <cmd> <args...>",
    );
  runCmd
    .command("explain")
    .description("Explain controlled-runner decision for a command (evaluate-only, never executes)")
    .requiredOption("--command <cmd>", "Command string")
    .argument("[path]", "Repository path")
    .option("--shell", "Explain as if shell=true were requested", false)
    .option("--fail-closed", "Deny on invalid local policy", false)
    .option("--json", "Emit JSON", false)
    .action(
      async (
        pathArg: string | undefined,
        options: { command: string; shell?: boolean; failClosed?: boolean; json?: boolean },
      ) => {
        process.exitCode = await runRunExplainCommand({
          root: resolveTargetArgument(pathArg),
          command: options.command,
          shell: Boolean(options.shell),
          failClosed: Boolean(options.failClosed),
          json: Boolean(options.json),
        });
      },
    );
  runCmd
    .option("--shell", "HIGH RISK: allow shell interpretation (still requires policy allow)", false)
    .option("--timeout <ms>", "Kill after timeout milliseconds", "30000")
    .option("--fail-closed", "Deny on invalid local policy", false)
    .option("--json", "Emit JSON", false)
    .argument("[path]", "Repository path (ignored when -- separates args; use cwd)")
    .argument("[command...]", "Command argv after --")
    .allowUnknownOption(false)
    .action(
      async (pathArg: string | undefined, commandParts: string[] | undefined, cmd: Command) => {
        const options = cmd.opts() as {
          shell?: boolean;
          timeout?: string;
          failClosed?: boolean;
          json?: boolean;
        };
        // Commander may put path as first arg when no `--`; prefer argv after `--` via raw args.
        const raw = cmd.args as string[];
        let root = process.cwd();
        let argv: string[] = [];
        // If first token looks like a path-only invocation without command, treat as root.
        if (commandParts && commandParts.length > 0) {
          argv = commandParts;
          if (pathArg) root = resolveTargetArgument(pathArg);
        } else if (pathArg && !pathArg.startsWith("-")) {
          // `run npm --version` style: pathArg is actually first command token
          argv = [pathArg, ...(raw.slice(1) ?? [])];
        }
        // Prefer explicit `--` remainder from process.argv
        const dd = process.argv.indexOf("--");
        if (dd >= 0) {
          argv = process.argv.slice(dd + 1);
          root = process.cwd();
        }
        const timeoutMs = Number(options.timeout ?? 30000);
        process.exitCode = await runRunCommand({
          root: resolveTargetArgument(root),
          argv,
          shell: Boolean(options.shell),
          timeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : 30000,
          failClosed: Boolean(options.failClosed),
          json: Boolean(options.json),
        });
      },
    );

  const workspace = program
    .command("workspace")
    .description("Multi-repo workspace model under .agentdoctor/workspaces/ (local isolation)");
  workspace
    .command("init")
    .description("Create a workspace JSON record")
    .requiredOption("--name <name>", "Workspace display name")
    .option("--id <id>", "Optional workspace id")
    .option("--repo <path>", "Initial repository root to add")
    .option("--allow-cross-read", "Allow reading other member repos (default false)", false)
    .argument("[path]", "Control root (stores .agentdoctor/workspaces)")
    .option("--json", "Emit JSON", false)
    .action(
      async (
        pathArg: string | undefined,
        options: {
          name: string;
          id?: string;
          repo?: string;
          allowCrossRead?: boolean;
          json?: boolean;
        },
      ) => {
        process.exitCode = await runWorkspaceCommand({
          action: "init",
          root: resolveTargetArgument(pathArg),
          name: options.name,
          ...(options.id ? { id: options.id } : {}),
          ...(options.repo ? { repositoryRoot: resolveTargetArgument(options.repo) } : {}),
          allowCrossRead: Boolean(options.allowCrossRead),
          json: Boolean(options.json),
        });
      },
    );
  workspace
    .command("add")
    .description("Add a repository root to a workspace")
    .requiredOption("--id <id>", "Workspace id")
    .requiredOption("--repo <path>", "Repository root to add")
    .argument("[path]", "Control root")
    .option("--json", "Emit JSON", false)
    .action(
      async (
        pathArg: string | undefined,
        options: { id: string; repo: string; json?: boolean },
      ) => {
        process.exitCode = await runWorkspaceCommand({
          action: "add",
          root: resolveTargetArgument(pathArg),
          id: options.id,
          repositoryRoot: resolveTargetArgument(options.repo),
          json: Boolean(options.json),
        });
      },
    );
  workspace
    .command("list")
    .description("List workspaces")
    .argument("[path]", "Control root")
    .option("--json", "Emit JSON", false)
    .action(async (pathArg: string | undefined, options: { json?: boolean }) => {
      process.exitCode = await runWorkspaceCommand({
        action: "list",
        root: resolveTargetArgument(pathArg),
        json: Boolean(options.json),
      });
    });
  workspace
    .command("status")
    .description("Show workspace membership and missing roots")
    .requiredOption("--id <id>", "Workspace id")
    .argument("[path]", "Control root")
    .option("--json", "Emit JSON", false)
    .action(async (pathArg: string | undefined, options: { id: string; json?: boolean }) => {
      process.exitCode = await runWorkspaceCommand({
        action: "status",
        root: resolveTargetArgument(pathArg),
        id: options.id,
        json: Boolean(options.json),
      });
    });
  workspace
    .command("remove")
    .description("Delete a workspace record")
    .requiredOption("--id <id>", "Workspace id")
    .argument("[path]", "Control root")
    .option("--json", "Emit JSON", false)
    .action(async (pathArg: string | undefined, options: { id: string; json?: boolean }) => {
      process.exitCode = await runWorkspaceCommand({
        action: "remove",
        root: resolveTargetArgument(pathArg),
        id: options.id,
        json: Boolean(options.json),
      });
    });

  program
    .command("changes")
    .description("Analyze git working-tree / range changes")
    .argument("[path]", "Repository path")
    .option("--since <ref>", "Diff since git ref (e.g. main)")
    .option(
      "--impact",
      "Compute dependency impact from Project Brain (UNKNOWN when edges are missing)",
      false,
    )
    .option("--json", "Emit JSON", false)
    .action(
      async (
        pathArg: string | undefined,
        options: { since?: string; impact?: boolean; json?: boolean },
      ) => {
        process.exitCode = await runChangesCommand({
          root: resolveTargetArgument(pathArg),
          ...(options.since ? { since: options.since } : {}),
          impact: Boolean(options.impact),
          json: Boolean(options.json),
        });
      },
    );
  program
    .command("context-health")
    .description("Detect instruction / ignore surface conflicts")
    .argument("[path]", "Repository path")
    .option("--json", "Emit JSON", false)
    .action(async (pathArg: string | undefined, options: { json?: boolean }) => {
      process.exitCode = await runContextHealthCommand({
        root: resolveTargetArgument(pathArg),
        json: Boolean(options.json),
      });
    });

  program
    .command("secrets")
    .description("Opt-in content secret scan (findings are always redacted)")
    .argument("[path]", "Repository path")
    .option("--json", "Emit JSON", false)
    .action(async (pathArg: string | undefined, options: { json?: boolean }) => {
      process.exitCode = await runSecretsCommand({
        root: resolveTargetArgument(pathArg),
        json: Boolean(options.json),
      });
    });

  const baseline = program.command("baseline").description("Named scan baselines");
  baseline
    .command("save")
    .description("Save current scan as a named baseline")
    .requiredOption("--name <name>", "Baseline name")
    .argument("[path]", "Repository path")
    .action(async (pathArg: string | undefined, options: { name: string }) => {
      process.exitCode = await runBaselineCommand({
        action: "save",
        name: options.name,
        root: resolveTargetArgument(pathArg),
      });
    });
  baseline
    .command("list")
    .description("List named baselines")
    .argument("[path]", "Repository path")
    .option("--json", "Emit JSON", false)
    .action(async (pathArg: string | undefined, options: { json?: boolean }) => {
      process.exitCode = await runBaselineCommand({
        action: "list",
        root: resolveTargetArgument(pathArg),
        json: Boolean(options.json),
      });
    });
  baseline
    .command("diff")
    .description("Compare current scan to a named baseline")
    .requiredOption("--name <name>", "Baseline name")
    .argument("[path]", "Repository path")
    .option("--json", "Emit JSON", false)
    .action(async (pathArg: string | undefined, options: { name: string; json?: boolean }) => {
      process.exitCode = await runBaselineCommand({
        action: "diff",
        name: options.name,
        root: resolveTargetArgument(pathArg),
        json: Boolean(options.json),
      });
    });
  baseline
    .command("delete")
    .description("Delete a named baseline (fails if missing)")
    .requiredOption("--name <name>", "Baseline name")
    .argument("[path]", "Repository path")
    .action(async (pathArg: string | undefined, options: { name: string }) => {
      process.exitCode = await runBaselineCommand({
        action: "delete",
        name: options.name,
        root: resolveTargetArgument(pathArg),
      });
    });
  baseline
    .command("trends")
    .description("Show baseline count trends over time (no causality claimed)")
    .argument("[path]", "Repository path")
    .option("--json", "Emit JSON", false)
    .action(async (pathArg: string | undefined, options: { json?: boolean }) => {
      process.exitCode = await runBaselineCommand({
        action: "trends",
        root: resolveTargetArgument(pathArg),
        json: Boolean(options.json),
      });
    });

  program
    .command("packages")
    .description("Detect workspace packages / optional per-package scan")
    .argument("[path]", "Repository path")
    .option("--scan", "Run a scan per package", false)
    .option("--json", "Emit JSON", false)
    .action(async (pathArg: string | undefined, options: { scan?: boolean; json?: boolean }) => {
      process.exitCode = await runPackagesCommand({
        root: resolveTargetArgument(pathArg),
        scan: Boolean(options.scan),
        json: Boolean(options.json),
      });
    });

  program
    .command("pr-review")
    .description("Local PR review dry-run (never posts to GitHub)")
    .argument("[path]", "Repository path")
    .option("--base <ref>", "Base git ref")
    .option("--json", "Emit JSON", false)
    .action(async (pathArg: string | undefined, options: { base?: string; json?: boolean }) => {
      process.exitCode = await runPrReviewCommand({
        root: resolveTargetArgument(pathArg),
        ...(options.base ? { base: options.base } : {}),
        json: Boolean(options.json),
      });
    });

  program
    .command("dashboard")
    .description("Start local read-only dashboard (loopback only by default)")
    .argument("[path]", "Repository path")
    .option("--host <host>", "Bind host (default 127.0.0.1)", "127.0.0.1")
    .option("--port <port>", "Bind port", "8787")
    .option(
      "--allow-non-loopback",
      "Unsafe: allow binding outside 127.0.0.1/::1/localhost (not an enterprise security boundary)",
      false,
    )
    .action(
      async (
        pathArg: string | undefined,
        options: { host?: string; port?: string; allowNonLoopback?: boolean },
      ) => {
        process.exitCode = await runDashboardCommand({
          root: resolveTargetArgument(pathArg),
          host: options.host ?? "127.0.0.1",
          port: Number(options.port ?? 8787),
          allowNonLoopback: Boolean(options.allowNonLoopback),
        });
      },
    );

  program
    .command("plugins")
    .description("List / validate local plugins under .agentdoctor/plugins")
    .argument("[path]", "Repository path")
    .option("--run", "Execute analyzer plugin hooks (isolated; timeouts apply)", false)
    .option("--json", "Emit JSON", false)
    .action(async (pathArg: string | undefined, options: { json?: boolean; run?: boolean }) => {
      process.exitCode = await runPluginsCommand({
        root: resolveTargetArgument(pathArg),
        json: Boolean(options.json),
        run: Boolean(options.run),
      });
    });

  program
    .command("local-ai")
    .description("Optional local AI provider probe (default: none; core stays deterministic)")
    .option("--provider <id>", "none | mock | ollama", "none")
    .option("--prompt <text>", "Prompt text")
    .option("--json", "Emit JSON", false)
    .action(async (options: { provider?: string; prompt?: string; json?: boolean }) => {
      process.exitCode = await runLocalAiCommand({
        ...(options.provider ? { provider: options.provider } : {}),
        ...(options.prompt ? { prompt: options.prompt } : {}),
        json: Boolean(options.json),
      });
    });

  program
    .command("chat")
    .description(
      "Project Chat (2.1): evidence-backed conversation about this repository (requires AI provider)",
    )
    .argument("[path]", "Repository path (default: current directory)")
    .action(async (pathArg: string | undefined) => {
      process.exitCode = await runChatCommand({
        root: resolveTargetArgument(pathArg),
      });
    });

  program
    .command("ask")
    .description("One-shot Project Chat question (same engine as chat)")
    .argument("<question>", "Question about the project")
    .argument("[path]", "Repository path (default: current directory)")
    .option("--json", "Emit JSON response", false)
    .action(async (question: string, pathArg: string | undefined, options: { json?: boolean }) => {
      process.exitCode = await runAskCommand({
        question,
        root: resolveTargetArgument(pathArg),
        json: Boolean(options.json),
      });
    });

  program
    .command("plan")
    .description(
      "Project Agent plan (2.1 M3): understand goal, list likely files, request approval — no file edits",
    )
    .argument("<goal>", "What you want to build or change")
    .argument("[path]", "Repository path (default: current directory)")
    .option("--json", "Emit JSON plan", false)
    .option("--approve", "Record human approval (still no writes in M3)", false)
    .action(
      async (
        goal: string,
        pathArg: string | undefined,
        options: { json?: boolean; approve?: boolean },
      ) => {
        process.exitCode = await runPlanCommand({
          goal,
          root: resolveTargetArgument(pathArg),
          json: Boolean(options.json),
          approve: Boolean(options.approve),
        });
      },
    );

  program
    .command("agent")
    .description(
      "Project Agent (2.1): list tools, run tools, plan, or apply approved file/command changes",
    )
    .argument("[path]", "Repository path (default: current directory)")
    .option("--list-tools", "List available agent tools", false)
    .option("--tool <name>", "Run a single tool by name")
    .option("--goal <text>", "Build a change plan for this goal")
    .option(
      "--role <role>",
      "Specialized role for plan/apply (planner, coder, tester, reviewer, security, …)",
    )
    .option("--approve", "Record explicit human approval", false)
    .option("--apply", "Apply approved changes (requires --approve)", false)
    .option("--apply-ops <json>", "JSON array of {name, arguments} tool ops for --apply")
    .option("--skip-verify", "Skip post-change verification after apply", false)
    .option("--run-tests", "Run controlled tests during verification", false)
    .option("--json", "Emit JSON", false)
    .action(
      async (
        pathArg: string | undefined,
        options: {
          listTools?: boolean;
          tool?: string;
          goal?: string;
          role?: string;
          approve?: boolean;
          apply?: boolean;
          applyOps?: string;
          skipVerify?: boolean;
          runTests?: boolean;
          json?: boolean;
        },
      ) => {
        process.exitCode = await runAgentCommand({
          root: resolveTargetArgument(pathArg),
          listTools: Boolean(options.listTools),
          ...(options.tool !== undefined ? { tool: options.tool } : {}),
          ...(options.goal !== undefined ? { goal: options.goal } : {}),
          ...(options.role !== undefined ? { role: options.role as AgentRole } : {}),
          approve: Boolean(options.approve),
          apply: Boolean(options.apply),
          ...(options.applyOps !== undefined ? { applyOpsJson: options.applyOps } : {}),
          verify: !options.skipVerify,
          runTests: Boolean(options.runTests),
          json: Boolean(options.json),
        });
      },
    );

  program
    .command("learn")
    .description(
      "Student Learn mode (2.1 M6): explain project, viva questions, grounded documentation",
    )
    .argument("[path]", "Repository path (default: current directory)")
    .option("--mode <mode>", "LEARN | BUILD_WITH_ME | BUILD_FOR_ME | DEVELOPER", "LEARN")
    .option("--viva", "Generate viva questions from detected stack", false)
    .option("--docs", "Generate project documentation sections", false)
    .option("--build <goal>", "BUILD_WITH_ME / BUILD_FOR_ME: explain, plan, then coding loop")
    .option("--approve", "Human approval required before BUILD writes", false)
    .option("--apply-ops <json>", "Deterministic tool ops JSON array for --build --approve")
    .option("--json", "Emit JSON", false)
    .option("--mock", "Use MockModelProvider", false)
    .action(
      async (
        pathArg: string | undefined,
        options: {
          mode?: string;
          viva?: boolean;
          docs?: boolean;
          build?: string;
          approve?: boolean;
          applyOps?: string;
          json?: boolean;
          mock?: boolean;
        },
      ) => {
        process.exitCode = await runLearnCommand({
          root: resolveTargetArgument(pathArg),
          ...(options.mode !== undefined ? { mode: options.mode } : {}),
          viva: Boolean(options.viva),
          docs: Boolean(options.docs),
          ...(options.build !== undefined ? { build: options.build } : {}),
          approve: Boolean(options.approve),
          ...(options.applyOps !== undefined ? { applyOpsJson: options.applyOps } : {}),
          json: Boolean(options.json),
          useMock: Boolean(options.mock),
        });
      },
    );

  const platform = program
    .command("platform")
    .description(
      "AgentDoctor 2.0 local platform (intelligence, Action Policy Evaluator, sessions, reports)",
    );
  platform
    .command("scan")
    .description("Run integrated platform scan and write local reports")
    .argument("[path]", "Repository path")
    .option("--json", "Emit JSON", false)
    .action(async (pathArg: string | undefined, _options, command: Command) => {
      const options = command.optsWithGlobals() as { json?: boolean };
      process.exitCode = await runPlatformCommand({
        action: "scan",
        root: resolveTargetArgument(pathArg),
        json: Boolean(options.json),
      });
    });
  platform
    .command("graph")
    .description("Build repository intelligence graph")
    .argument("[path]", "Repository path")
    .option("--json", "Emit JSON", false)
    .action(async (pathArg: string | undefined, _options, command: Command) => {
      const options = command.optsWithGlobals() as { json?: boolean };
      process.exitCode = await runPlatformCommand({
        action: "graph",
        root: resolveTargetArgument(pathArg),
        json: Boolean(options.json),
      });
    });
  platform
    .command("test-impact")
    .description(
      "Analyze which tests relate to git changes (heuristic; coverage-backed with --coverage; does not run tests)",
    )
    .argument("[path]", "Repository path")
    .option("--coverage <path>", "LCOV / Istanbul JSON / Cobertura XML coverage file")
    .option("--since <ref>", "Diff since git ref")
    .option("--json", "Emit JSON", false)
    .action(async (pathArg: string | undefined, _options, command: Command) => {
      const options = command.optsWithGlobals() as {
        json?: boolean;
        coverage?: string;
        since?: string;
      };
      process.exitCode = await runPlatformCommand({
        action: "test-impact",
        root: resolveTargetArgument(pathArg),
        json: Boolean(options.json),
        ...(options.coverage ? { coverage: options.coverage } : {}),
        ...(options.since ? { since: options.since } : {}),
      });
    });

  const registerPolicyCheck = (name: string, aliasNote: string) => {
    platform
      .command(name)
      .description(
        `Action Policy Evaluator${aliasNote}: evaluate an agent action (never executes; no agent interception)`,
      )
      .argument("[path]", "Repository path")
      .option("--type <type>", "Action type", "shell")
      .option("--command <cmd>", "Shell command string")
      .option("--path <file>", "Target path")
      .option(
        "--fail-closed",
        "If local policy JSON is invalid, deny the action instead of falling back to defaults",
        false,
      )
      .option("--json", "Emit JSON", false)
      .action(async (pathArg: string | undefined, _options, cmd: Command) => {
        const options = cmd.optsWithGlobals() as {
          type?: string;
          command?: string;
          path?: string;
          json?: boolean;
          failClosed?: boolean;
        };
        process.exitCode = await runPlatformCommand({
          action: "policy-check",
          root: resolveTargetArgument(pathArg),
          ...(options.type ? { actionType: options.type } : {}),
          ...(options.command ? { command: options.command } : {}),
          ...(options.path ? { path: options.path } : {}),
          json: Boolean(options.json),
          failClosed: Boolean(options.failClosed),
        });
      });
  };
  registerPolicyCheck("policy-check", "");
  registerPolicyCheck("firewall-check", " (alias)");
  platform
    .command("session-list")
    .description("List recorded agent sessions")
    .argument("[path]", "Repository path")
    .option("--json", "Emit JSON", false)
    .action(async (pathArg: string | undefined, _options, command: Command) => {
      const options = command.optsWithGlobals() as { json?: boolean };
      process.exitCode = await runPlatformCommand({
        action: "session-list",
        root: resolveTargetArgument(pathArg),
        json: Boolean(options.json),
      });
    });
  platform
    .command("session-show")
    .description("Show / export an agent session")
    .requiredOption("--session <id>", "Session id")
    .argument("[path]", "Repository path")
    .option("--json", "Emit JSON", false)
    .action(async (pathArg: string | undefined, _options, command: Command) => {
      const options = command.optsWithGlobals() as { session: string; json?: boolean };
      process.exitCode = await runPlatformCommand({
        action: "session-show",
        sessionId: options.session,
        root: resolveTargetArgument(pathArg),
        json: Boolean(options.json),
      });
    });
  platform
    .command("demo-session")
    .description(
      "Record a demo session with Action Policy Evaluator (evaluate-only; no command execution)",
    )
    .argument("[path]", "Repository path")
    .option("--json", "Emit JSON", false)
    .action(async (pathArg: string | undefined, _options, command: Command) => {
      const options = command.optsWithGlobals() as { json?: boolean };
      process.exitCode = await runPlatformCommand({
        action: "demo-session",
        root: resolveTargetArgument(pathArg),
        json: Boolean(options.json),
      });
    });
  platform
    .command("provenance")
    .description("Build a provenance record for a file (unknown fields marked)")
    .requiredOption("--path <file>", "File path")
    .argument("[repo]", "Repository path")
    .option("--json", "Emit JSON", false)
    .action(async (repo: string | undefined, _options, command: Command) => {
      const options = command.optsWithGlobals() as { path: string; json?: boolean };
      process.exitCode = await runPlatformCommand({
        action: "provenance",
        path: options.path,
        root: resolveTargetArgument(repo),
        json: Boolean(options.json),
      });
    });
  platform
    .command("context")
    .description("Plan token-optimized context for a query")
    .option("--query <text>", "Query", "src")
    .argument("[path]", "Repository path")
    .option("--json", "Emit JSON", false)
    .action(async (pathArg: string | undefined, _options, command: Command) => {
      const options = command.optsWithGlobals() as { query?: string; json?: boolean };
      process.exitCode = await runPlatformCommand({
        action: "context",
        query: options.query ?? "src",
        root: resolveTargetArgument(pathArg),
        json: Boolean(options.json),
      });
    });
  platform
    .command("refactor")
    .description("Analyze rename impact for a symbol (does not apply edits)")
    .requiredOption("--symbol <name>", "Symbol name")
    .argument("[path]", "Repository path")
    .option("--json", "Emit JSON", false)
    .action(async (pathArg: string | undefined, _options, command: Command) => {
      const options = command.optsWithGlobals() as { symbol: string; json?: boolean };
      process.exitCode = await runPlatformCommand({
        action: "refactor",
        symbol: options.symbol,
        root: resolveTargetArgument(pathArg),
        json: Boolean(options.json),
      });
    });
  platform
    .command("time-machine")
    .description("Compare two git refs")
    .requiredOption("--left <ref>", "Left ref")
    .requiredOption("--right <ref>", "Right ref")
    .argument("[path]", "Repository path")
    .option("--json", "Emit JSON", false)
    .action(async (pathArg: string | undefined, _options, command: Command) => {
      const options = command.optsWithGlobals() as {
        left: string;
        right: string;
        json?: boolean;
      };
      process.exitCode = await runPlatformCommand({
        action: "time-machine",
        left: options.left,
        right: options.right,
        root: resolveTargetArgument(pathArg),
        json: Boolean(options.json),
      });
    });

  program
    .command("verify")
    .description("Re-scan and compare against a prior scan JSON baseline (Scan → Fix → Verify)")
    .argument("[path]", "Repository path (default: current directory)")
    .option("--json", "Emit machine-readable JSON", false)
    .option(
      "--ci",
      "CI mode: exit 1 when new findings appear (also honors other policy flags)",
      false,
    )
    .option("--fail-on-new", "Exit 1 when new findings appear relative to the baseline", false)
    .option("--verbose", "Show timing and extra diagnostics", false)
    .option(
      "--baseline <file>",
      "Prior scan JSON report (default: agentdoctor-report.json or .agentdoctor-baseline.json)",
    )
    .option(
      "--min-score <number>",
      "Exit 1 when overall readiness score is below this (0-100)",
      parseMinScore,
    )
    .option(
      "--fail-on-severity <level>",
      "Exit 1 when any finding has this severity or higher (critical|warning|info)",
      parseSeverityGate,
    )
    .option(
      "--fail-on-rule <id>",
      "Exit 1 when a finding matches this rule id (repeatable or comma-separated)",
      collectFailOnRules,
      [],
    )
    .option(
      "--summary",
      "Write a GitHub Actions step summary when GITHUB_STEP_SUMMARY is set",
      false,
    )
    .option("--annotations", "Emit GitHub Actions annotations for findings (stderr)", false)
    .action(async (pathArg: string | undefined, _options, command: Command) => {
      const options = command.optsWithGlobals() as {
        json?: boolean;
        ci?: boolean;
        failOnNew?: boolean;
        verbose?: boolean;
        baseline?: string;
        minScore?: unknown;
        failOnSeverity?: unknown;
        failOnRule?: unknown;
        summary?: boolean;
        annotations?: boolean;
      };
      const minScore = readMinScore(options);
      const failOnSeverity = readFailOnSeverity(options);
      const failOnRules = readFailOnRules(options);
      const code = await runVerifyCommand({
        targetPath: resolveTargetArgument(pathArg),
        json: Boolean(options.json),
        ci: Boolean(options.ci),
        failOnNew: Boolean(options.failOnNew),
        verbose: Boolean(options.verbose),
        summary: Boolean(options.summary),
        annotations: Boolean(options.annotations),
        ...(typeof options.baseline === "string" ? { baselinePath: options.baseline } : {}),
        ...(minScore !== undefined ? { minScore } : {}),
        ...(failOnSeverity !== undefined ? { failOnSeverity } : {}),
        ...(failOnRules.length > 0 ? { failOnRules } : {}),
      });
      process.exitCode = code;
    });

  program
    .command("explain")
    .description("Explain a rule by id")
    .argument("<rule>", "Rule id, e.g. security/env-file-exposure")
    .action(async (rule: string) => {
      const code = await runExplainCommand(rule);
      process.exitCode = code;
    });

  function bindProductCommand(
    name: string,
    description: string,
    action: Parameters<typeof runProductCommand>[0]["action"],
  ): void {
    program
      .command(name)
      .description(description)
      .argument("[path]", "Repository path")
      .option("--json", "Emit JSON report", false)
      .action(async (pathArg: string | undefined, _options, command: Command) => {
        const options = command.optsWithGlobals() as { json?: boolean };
        process.exitCode = await runProductCommand({
          action,
          root: resolveTargetArgument(pathArg),
          json: Boolean(options.json),
        });
      });
  }

  program
    .command("start")
    .description(
      "Safe project discovery: detect project root, build Project DNA, initialize Project Brain",
    )
    .argument("[path]", "Optional project path (default: cwd)")
    .option("--list", "List candidates without initializing", false)
    .option("--select <path>", "Explicitly select a project root")
    .option("--max-entries <n>", "Refuse scans larger than this entry budget", "25000")
    .option("--no-init-brain", "Skip Project Brain store initialization")
    .option("--rebuild-brain", "Compile Project Brain after init", false)
    .option("--json", "Emit JSON", false)
    .action(
      async (
        pathArg: string | undefined,
        options: {
          list?: boolean;
          select?: string;
          maxEntries?: string;
          initBrain?: boolean;
          rebuildBrain?: boolean;
          json?: boolean;
        },
      ) => {
        process.exitCode = await runStartCommand({
          ...(pathArg !== undefined ? { root: resolveTargetArgument(pathArg) } : {}),
          listOnly: Boolean(options.list),
          ...(options.select !== undefined ? { select: options.select } : {}),
          maxEntries: Number(options.maxEntries ?? 25000),
          initBrain: options.initBrain !== false,
          rebuildBrain: Boolean(options.rebuildBrain),
          json: Boolean(options.json),
        });
      },
    );

  program
    .command("dna")
    .description("Build deterministic Project DNA fingerprint")
    .argument("[path]", "Repository path")
    .option("--persist", "Write .agentdoctor/dna/project-dna.json", false)
    .option("--json", "Emit JSON", false)
    .action(async (pathArg: string | undefined, options: { persist?: boolean; json?: boolean }) => {
      process.exitCode = await runDnaCommand({
        root: resolveTargetArgument(pathArg),
        persist: Boolean(options.persist),
        json: Boolean(options.json),
      });
    });

  bindProductCommand(
    "requirements",
    "Trace requirements from markdown docs (evidence-backed)",
    "requirements",
  );
  bindProductCommand("api", "Discover HTTP route patterns (regex evidence)", "api");
  bindProductCommand("database", "Discover schema objects from migrations/SQL/Prisma", "database");
  bindProductCommand("events", "Detect queues, workers, cron, and event markers", "events");
  bindProductCommand(
    "dependency",
    "Analyze direct dependencies and workspace duplicates",
    "dependency",
  );
  bindProductCommand("deps", "Alias for dependency", "dependency");
  bindProductCommand(
    "health-code",
    "Aggregate code health indicators with evidence",
    "health-code",
  );
  bindProductCommand("code-health", "Alias for health-code", "health-code");
  bindProductCommand("map", "Build navigable software map from project layout", "map");
  bindProductCommand("decisions", "Load ADR files and decision ledger", "decisions");
  bindProductCommand("forensic", "Read-only forensic analysis (git + ledgers + brain)", "forensic");
  bindProductCommand("twin", "Software digital twin snapshot", "twin");
  bindProductCommand("eval-lab", "Run evaluation lab fixture checks", "eval-lab");
  bindProductCommand("self-check", "Self-diagnosis of AgentDoctor installation", "self-check");
  bindProductCommand("infra", "Detect Docker/K8s/Terraform/CI artifacts", "infra");
  bindProductCommand("incident", "Build incident timeline hypotheses", "incident");
  bindProductCommand(
    "security-doctor",
    "Security heuristics: secrets, auth markers, dangerous patterns",
    "security-doctor",
  );
  bindProductCommand(
    "test-brain",
    "Test Brain: test-impact plus graph file↔test mapping",
    "test-brain",
  );
  bindProductCommand(
    "privacy-doctor",
    "PII-ish pattern scan (not legal compliance)",
    "privacy-doctor",
  );
  bindProductCommand(
    "tech-debt",
    "Technical debt roadmap (TODO/FIXME, architecture, tests)",
    "tech-debt",
  );
  bindProductCommand("features", "Feature intelligence (flows + API links)", "features");
  bindProductCommand("evolution", "Software evolution timeline from git + ledger", "evolution");
  bindProductCommand("org", "Load organization model (.agentdoctor/org)", "org");

  program
    .command("memory")
    .description("Query institutional memory (brain + ledgers)")
    .argument("<query>", "Memory query")
    .argument("[path]", "Repository path")
    .option("--json", "Emit JSON report", false)
    .action(async (query: string, pathArg: string | undefined, _options, command: Command) => {
      const options = command.optsWithGlobals() as { json?: boolean };
      process.exitCode = await runProductCommand({
        action: "memory",
        query,
        root: resolveTargetArgument(pathArg),
        json: Boolean(options.json),
      });
    });

  program
    .command("search")
    .description("Search symbols and concepts (brain + bounded file scan)")
    .argument("<query>", "Search query")
    .argument("[path]", "Repository path")
    .option("--json", "Emit JSON report", false)
    .action(async (query: string, pathArg: string | undefined, _options, command: Command) => {
      const options = command.optsWithGlobals() as { json?: boolean };
      process.exitCode = await runProductCommand({
        action: "search",
        query,
        root: resolveTargetArgument(pathArg),
        json: Boolean(options.json),
      });
    });

  program
    .command("role-agent")
    .description("Run the coding loop with a specialized agent role")
    .argument("[path]", "Repository path")
    .requiredOption("--role <role>", "Agent role (planner, coder, tester, reviewer, security, …)")
    .requiredOption("--goal <text>", "Goal for the role agent")
    .option("--approve", "Record human approval for writes", false)
    .option("--apply", "Apply changes (requires --approve)", false)
    .option("--json", "Emit JSON", false)
    .action(
      async (
        pathArg: string | undefined,
        options: { role: string; goal: string; approve?: boolean; apply?: boolean; json?: boolean },
      ) => {
        process.exitCode = await runProductCommand({
          action: "role-agent",
          root: resolveTargetArgument(pathArg),
          role: options.role as AgentRole,
          goal: options.goal,
          approve: Boolean(options.approve),
          apply: Boolean(options.apply),
          json: Boolean(options.json),
        });
      },
    );

  program
    .command("what-if")
    .description("Graph-backed change impact for a file or symbol")
    .argument("<target>", "File path or symbol")
    .argument("[path]", "Repository path")
    .option("--json", "Emit JSON report", false)
    .action(async (target: string, pathArg: string | undefined, _options, command: Command) => {
      const options = command.optsWithGlobals() as { json?: boolean };
      process.exitCode = await runProductCommand({
        action: "what-if",
        root: resolveTargetArgument(pathArg),
        target,
        json: Boolean(options.json),
      });
    });

  program
    .command("doctor")
    .description("Check AgentDoctor installation health")
    .option("--json", "Emit JSON ops health", false)
    .argument("[path]", "Repository path")
    .action(async (pathArg: string | undefined, _options, command: Command) => {
      const options = command.optsWithGlobals() as { json?: boolean };
      if (options.json) {
        const health = await collectOpsHealth(resolveTargetArgument(pathArg));
        process.stdout.write(`${JSON.stringify(health, null, 2)}\n`);
        process.exitCode = health.ok ? EXIT_CODES.SUCCESS : EXIT_CODES.INTERNAL_ERROR;
        return;
      }
      const code = await runDoctorCommand();
      process.exitCode = code;
    });

  program
    .command("brain-mcp")
    .description(
      "Start the local Project Brain MCP server over STDIO (evidence-backed agent context; no API key)",
    )
    .requiredOption(
      "--root <path>",
      "Absolute or relative project root (required; never uses process.cwd() implicitly)",
    )
    .option(
      "--no-build-if-missing",
      "Fail when no snapshot exists instead of compiling Project Brain",
    )
    .action(async (options: { root: string; buildIfMissing?: boolean }) => {
      const code = await runBrainMcpCommand({
        root: options.root,
        buildIfMissing: options.buildIfMissing !== false,
      });
      process.exitCode = code;
    });

  program
    .command("mcp")
    .description("Start combined AgentDoctor MCP (Brain tools + intelligence tools) over STDIO")
    .requiredOption(
      "--root <path>",
      "Absolute or relative project root (required; never uses process.cwd() implicitly)",
    )
    .option("--no-build-if-missing", "Fail when no Brain snapshot exists instead of compiling")
    .action(async (options: { root: string; buildIfMissing?: boolean }) => {
      const code = await runMcpCommand({
        root: options.root,
        buildIfMissing: options.buildIfMissing !== false,
      });
      process.exitCode = code;
    });

  program.configureOutput({
    outputError: (str, write) => write(str),
  });

  program.exitOverride();

  return program;
}

export async function runCli(argv = process.argv): Promise<void> {
  const program = createProgram();
  try {
    await program.parseAsync(argv);
  } catch (error) {
    // Commander throws on --help / --version with exitOverride
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error.code === "commander.helpDisplayed" || error.code === "commander.version")
    ) {
      process.exitCode = EXIT_CODES.SUCCESS;
      return;
    }
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      typeof error.code === "string" &&
      error.code.startsWith("commander.")
    ) {
      process.exitCode = EXIT_CODES.USAGE_ERROR;
      return;
    }
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    process.exitCode = EXIT_CODES.INTERNAL_ERROR;
  }
}
