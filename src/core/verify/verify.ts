import { PACKAGE_VERSION } from "../../constants.js";
import { scan } from "../scanner/scan.js";
import type { Scores, ScanResult } from "../../types/index.js";
import { compareFindings, type FindingCompareResult } from "./compare.js";
import { loadBaselineFindings, resolveBaselinePath } from "./load-baseline.js";

export interface VerifyOptions {
  cwd?: string;
  /** Path to a prior scan JSON report. Defaults to agentdoctor-report.json if present. */
  baselinePath?: string;
  verbose?: boolean;
}

export interface VerifyResult extends FindingCompareResult {
  version: string;
  repositoryRoot: string;
  baselinePath: string;
  after: ScanResult;
  scores: Scores | null;
  scoringAvailable: boolean;
  timing: {
    totalMs: number;
    scanMs: number;
    compareMs: number;
  };
}

/**
 * Re-scan the repository and compare against a prior scan JSON baseline.
 * Reuses the public `scan()` pipeline — no duplicated rule engine.
 */
export async function verify(options: VerifyOptions = {}): Promise<VerifyResult> {
  const totalStarted = performance.now();
  const cwd = options.cwd ?? process.cwd();

  const resolvedBaseline = await resolveBaselinePath(cwd, options.baselinePath);
  if (!resolvedBaseline) {
    throw new Error(
      "No verify baseline found. Run `agentdoctor scan --json > agentdoctor-report.json`, apply fixes, then re-run verify.",
    );
  }

  const baseline = await loadBaselineFindings(resolvedBaseline);

  const scanStarted = performance.now();
  const after = await scan({
    cwd,
    verbose: options.verbose ?? false,
  });
  const scanMs = Math.round(performance.now() - scanStarted);

  const compareStarted = performance.now();
  const compared = compareFindings(baseline.findings, after.findings);
  const compareMs = Math.round(performance.now() - compareStarted);

  return {
    version: PACKAGE_VERSION,
    repositoryRoot: after.repository.root,
    baselinePath: baseline.path,
    ...compared,
    after,
    scores: after.scores,
    scoringAvailable: after.scoringAvailable,
    timing: {
      totalMs: Math.round(performance.now() - totalStarted),
      scanMs,
      compareMs,
    },
  };
}
