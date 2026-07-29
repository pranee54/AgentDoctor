import { Command } from "commander";

import { PACKAGE_VERSION } from "../constants.js";
import { runDoctorCommand } from "./commands/doctor.js";
import { runExplainCommand } from "./commands/explain.js";
import { runFixCommand } from "./commands/fix.js";
import { resolveTargetArgument, runScanCommand } from "./commands/scan.js";
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

export function createProgram(): Command {
  const program = new Command();

  program
    .name("agentdoctor")
    .description(
      "Lighthouse for AI coding agents — audit, score, secure, and optimize your repository.",
    )
    .version(PACKAGE_VERSION, "-V, --version", "Print AgentDoctor version")
    .argument("[path]", "Repository path to scan (default: current directory)")
    .option("--json", "Emit machine-readable JSON (no decorative output)", false)
    .option("--ci", "CI mode (non-interactive; use with --min-score)", false)
    .option("--verbose", "Show timing and extra diagnostics", false)
    .option("--min-score <number>", "Fail CI when overall score is below this", parseMinScore)
    .action(async (pathArg: string | undefined, options) => {
      const minScore = readMinScore(options);
      const code = await runScanCommand({
        targetPath: resolveTargetArgument(pathArg),
        json: Boolean(options.json),
        ci: Boolean(options.ci),
        verbose: Boolean(options.verbose),
        ...(minScore !== undefined ? { minScore } : {}),
      });
      process.exitCode = code;
    });

  program
    .command("scan")
    .description("Scan a repository for AI coding agent readiness (default command)")
    .argument("[path]", "Repository path to scan")
    .option("--json", "Emit machine-readable JSON", false)
    .option("--ci", "CI mode", false)
    .option("--verbose", "Show timing and extra diagnostics", false)
    .option("--min-score <number>", "Fail when overall score is below this", parseMinScore)
    .action(async (pathArg: string | undefined, options) => {
      const minScore = readMinScore(options);
      const code = await runScanCommand({
        targetPath: resolveTargetArgument(pathArg),
        json: Boolean(options.json),
        ci: Boolean(options.ci),
        verbose: Boolean(options.verbose),
        ...(minScore !== undefined ? { minScore } : {}),
      });
      process.exitCode = code;
    });

  program
    .command("fix")
    .description("Apply safe automatic fixes (not implemented yet)")
    .option("--dry-run", "Show proposed fixes without writing files", false)
    .option("-y, --yes", "Skip confirmation prompts", false)
    .action(async (options) => {
      const code = await runFixCommand({
        dryRun: Boolean(options.dryRun),
        yes: Boolean(options.yes),
      });
      process.exitCode = code;
    });

  program
    .command("explain")
    .description("Explain a rule by id")
    .argument("<rule>", "Rule id, e.g. security/env-exposure")
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
