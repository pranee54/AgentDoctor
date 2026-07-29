import path from "node:path";

import { scan } from "../../core/scanner/scan.js";
import { renderJsonReport } from "../../reporters/json/report.js";
import { renderTerminalReport } from "../../reporters/terminal/report.js";
import { EXIT_CODES, type ExitCode } from "../../types/index.js";
import { resolveRepoRoot } from "../../utils/path.js";
import { isDirectory } from "../../utils/fs.js";

export interface ScanCommandOptions {
  targetPath?: string;
  json?: boolean;
  ci?: boolean;
  verbose?: boolean;
  minScore?: number;
}

export async function runScanCommand(options: ScanCommandOptions): Promise<ExitCode> {
  const target = resolveRepoRoot(options.targetPath ?? process.cwd());

  if (!(await isDirectory(target))) {
    console.error(`Error: not a directory: ${target}`);
    return EXIT_CODES.USAGE_ERROR;
  }

  try {
    const result = await scan({
      cwd: target,
      verbose: options.verbose ?? false,
    });

    if (options.json) {
      process.stdout.write(renderJsonReport(result));
    } else {
      process.stdout.write(
        renderTerminalReport(result, {
          verbose: options.verbose === true,
        }),
      );
    }

    if (options.ci || options.minScore !== undefined) {
      if (!result.scoringAvailable || result.scores === null) {
        if (!options.json) {
          console.error(
            "Note: readiness scoring is not available in this release; --min-score was ignored.",
          );
        }
      } else {
        const threshold = options.minScore ?? 0;
        if (result.scores.overall < threshold) {
          if (!options.json) {
            console.error(
              `\nCI check failed: overall score ${result.scores.overall} is below --min-score ${threshold}`,
            );
          }
          return EXIT_CODES.ISSUES_OR_THRESHOLD;
        }
      }
    }

    return EXIT_CODES.SUCCESS;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    if (options.verbose && error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    return EXIT_CODES.INTERNAL_ERROR;
  }
}

export function resolveTargetArgument(pathArg: string | undefined, cwd = process.cwd()): string {
  if (!pathArg) {
    return cwd;
  }
  return path.isAbsolute(pathArg) ? pathArg : path.resolve(cwd, pathArg);
}
