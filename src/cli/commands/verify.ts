import { evaluateVerifyPolicy, type PolicyOptions } from "../../core/policy/evaluate.js";
import { verify } from "../../core/verify/verify.js";
import { emitGithubReports } from "../../reporters/github/emit.js";
import { renderVerifyJsonReport } from "../../reporters/verify/json.js";
import { renderVerifyTerminalReport } from "../../reporters/verify/terminal.js";
import { EXIT_CODES, type ExitCode } from "../../types/index.js";
import { isDirectory } from "../../utils/fs.js";
import { resolveRepoRoot } from "../../utils/path.js";

export interface VerifyCommandOptions {
  targetPath?: string;
  baselinePath?: string;
  json?: boolean;
  ci?: boolean;
  verbose?: boolean;
  minScore?: number;
  failOnSeverity?: PolicyOptions["failOnSeverity"];
  failOnRules?: string[];
  failOnNew?: boolean;
  summary?: boolean;
  annotations?: boolean;
}

/**
 * Verify: re-scan after Fix and compare against a prior scan JSON baseline.
 */
export async function runVerifyCommand(options: VerifyCommandOptions): Promise<ExitCode> {
  const target = resolveRepoRoot(options.targetPath ?? process.cwd());

  if (!(await isDirectory(target))) {
    console.error(`Error: not a directory: ${target}`);
    return EXIT_CODES.USAGE_ERROR;
  }

  try {
    const result = await verify({
      cwd: target,
      verbose: options.verbose ?? false,
      ...(options.baselinePath !== undefined ? { baselinePath: options.baselinePath } : {}),
    });

    if (options.json) {
      process.stdout.write(renderVerifyJsonReport(result));
    } else {
      process.stdout.write(renderVerifyTerminalReport(result, options.verbose === true));
    }

    const failOnNew = options.failOnNew === true || options.ci === true;
    const policy = {
      ...(options.minScore !== undefined ? { minimumScore: options.minScore } : {}),
      ...(options.failOnSeverity !== undefined ? { failOnSeverity: options.failOnSeverity } : {}),
      ...(options.failOnRules && options.failOnRules.length > 0
        ? { failOnRules: options.failOnRules }
        : {}),
      ...(failOnNew ? { failOnNew: true } : {}),
    };
    const violations = evaluateVerifyPolicy(result, policy);

    await emitGithubReports({
      mode: "verify",
      findings: result.after.findings,
      overallScore: result.scores?.overall ?? null,
      violations,
      verifySummary: result.summary,
      summary: options.summary === true,
      annotations: options.annotations === true,
    });

    if (violations.length > 0) {
      if (!options.json) {
        for (const violation of violations) {
          console.error(`\n${violation.message}`);
        }
      }
      return EXIT_CODES.ISSUES_OR_THRESHOLD;
    }

    return EXIT_CODES.SUCCESS;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    if (options.verbose && error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    if (message.includes("baseline") || message.includes("No verify baseline")) {
      return EXIT_CODES.USAGE_ERROR;
    }
    return EXIT_CODES.INTERNAL_ERROR;
  }
}
