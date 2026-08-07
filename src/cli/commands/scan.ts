import path from "node:path";

import { evaluateScanPolicy, type PolicyOptions } from "../../core/policy/evaluate.js";
import { scan } from "../../core/scanner/scan.js";
import { emitGithubReports } from "../../reporters/github/emit.js";
import { renderJsonReport } from "../../reporters/json/report.js";
import { renderTerminalReport } from "../../reporters/terminal/report.js";
import { EXIT_CODES, type ExitCode } from "../../types/index.js";
import { isDirectory } from "../../utils/fs.js";
import { resolveRepoRoot } from "../../utils/path.js";

export interface ScanCommandOptions {
  targetPath?: string;
  json?: boolean;
  ci?: boolean;
  verbose?: boolean;
  minScore?: number;
  failOnSeverity?: PolicyOptions["failOnSeverity"];
  failOnRules?: string[];
  summary?: boolean;
  annotations?: boolean;
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

    const failOnSeverity = options.failOnSeverity ?? (options.ci === true ? "critical" : undefined);
    const policy = {
      ...(options.minScore !== undefined ? { minimumScore: options.minScore } : {}),
      ...(failOnSeverity !== undefined ? { failOnSeverity } : {}),
      ...(options.failOnRules && options.failOnRules.length > 0
        ? { failOnRules: options.failOnRules }
        : {}),
    };
    const violations = evaluateScanPolicy(result, policy);

    await emitGithubReports({
      mode: "scan",
      findings: result.findings,
      overallScore: result.scores?.overall ?? null,
      violations,
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
    return EXIT_CODES.INTERNAL_ERROR;
  }
}

export function resolveTargetArgument(pathArg: string | undefined, cwd = process.cwd()): string {
  if (!pathArg) {
    return cwd;
  }
  return path.isAbsolute(pathArg) ? pathArg : path.resolve(cwd, pathArg);
}
