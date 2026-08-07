import { Command, InvalidArgumentError } from "commander";

import { PACKAGE_VERSION } from "../constants.js";
import { parseFailOnRules, parseSeverityGate } from "../core/policy/evaluate.js";
import { EXIT_CODES } from "../types/index.js";
import { runDoctorCommand } from "./commands/doctor.js";
import { runExplainCommand } from "./commands/explain.js";
import { runFixCommand } from "./commands/fix.js";
import { resolveTargetArgument, runScanCommand } from "./commands/scan.js";
import { runVerifyCommand } from "./commands/verify.js";

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
    .description(
      "Apply safe automatic fixes (Cursor .cursorignore, Claude Code Read deny, and Codex filesystem deny for safe context findings)",
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
