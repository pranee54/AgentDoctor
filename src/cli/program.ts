import { Command } from "commander";

import { PACKAGE_VERSION } from "../constants.js";
import { runDoctorCommand } from "./commands/doctor.js";
import { runExplainCommand } from "./commands/explain.js";
import { runFixCommand } from "./commands/fix.js";
import { resolveTargetArgument, runScanCommand } from "./commands/scan.js";
import { runVerifyCommand } from "./commands/verify.js";
import { EXIT_CODES } from "../types/index.js";

function parseMinScore(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
    throw new Error("--min-score must be a number between 0 and 100");
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

/**
 * Scan flags are declared on both the root program and the `scan` subcommand
 * so `--help` stays accurate. Commander stores overlapping flags on the parent
 * when `scan` is invoked, so callers must read `optsWithGlobals()`.
 */
function addScanOptions(command: Command): Command {
  return command
    .option("--json", "Emit machine-readable JSON (no decorative output)", false)
    .option("--ci", "CI mode (non-interactive; report-only unless --min-score is set)", false)
    .option("--verbose", "Show timing and extra diagnostics", false)
    .option(
      "--min-score <number>",
      "Exit 1 when overall readiness score is below this (0-100)",
      parseMinScore,
    );
}

async function runScanFromCli(pathArg: string | undefined, command: Command): Promise<void> {
  const options = command.optsWithGlobals() as {
    json?: boolean;
    ci?: boolean;
    verbose?: boolean;
    minScore?: unknown;
  };
  const minScore = readMinScore(options);
  const code = await runScanCommand({
    targetPath: resolveTargetArgument(pathArg),
    json: Boolean(options.json),
    ci: Boolean(options.ci),
    verbose: Boolean(options.verbose),
    ...(minScore !== undefined ? { minScore } : {}),
  });
  process.exitCode = code;
}

export function createProgram(): Command {
  const program = new Command();

  addScanOptions(
    program
      .name("agentdoctor")
      .description(
        "Audit AI coding agent configuration in a repository (local, deterministic, no API key).",
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
    .description("Apply safe automatic fixes (Cursor .cursorignore for safe context findings)")
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
    .command("verify")
    .description("Re-scan and compare against a prior scan JSON baseline (Scan → Fix → Verify)")
    .argument("[path]", "Repository path (default: current directory)")
    .option("--json", "Emit machine-readable JSON", false)
    .option("--ci", "CI mode: exit 1 when new findings appear (also honors --min-score)", false)
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
    .action(async (pathArg: string | undefined, _options, command: Command) => {
      const options = command.optsWithGlobals() as {
        json?: boolean;
        ci?: boolean;
        verbose?: boolean;
        baseline?: string;
        minScore?: unknown;
      };
      const minScore = readMinScore(options);
      const code = await runVerifyCommand({
        targetPath: resolveTargetArgument(pathArg),
        json: Boolean(options.json),
        ci: Boolean(options.ci),
        verbose: Boolean(options.verbose),
        ...(typeof options.baseline === "string" ? { baselinePath: options.baseline } : {}),
        ...(minScore !== undefined ? { minScore } : {}),
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

  program
    .command("doctor")
    .description("Check AgentDoctor installation health")
    .action(async () => {
      const code = await runDoctorCommand();
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
