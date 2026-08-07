import { verify } from "../../core/verify/verify.js";
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

    if (options.minScore !== undefined && result.scores !== null) {
      if (result.scores.overall < options.minScore) {
        if (!options.json) {
          console.error(
            `\nCI check failed: overall score ${result.scores.overall} is below --min-score ${options.minScore}`,
          );
        }
        return EXIT_CODES.ISSUES_OR_THRESHOLD;
      }
    }

    // In CI, newly introduced findings are regressions after Fix.
    if (options.ci === true && result.summary.new > 0) {
      if (!options.json) {
        console.error(
          `\nCI check failed: verify found ${result.summary.new} new finding(s) not present in the baseline`,
        );
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
