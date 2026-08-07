import fs from "node:fs/promises";

import type { PolicyViolation } from "../../core/policy/evaluate.js";
import type { Finding } from "../../types/index.js";
import { renderGithubAnnotations } from "./annotations.js";
import { renderGithubStepSummary } from "./summary.js";

export interface GithubReportOptions {
  summary?: boolean;
  annotations?: boolean;
}

export async function emitGithubReports(options: {
  mode: "scan" | "verify";
  findings: Finding[];
  overallScore: number | null;
  violations: PolicyViolation[];
  verifySummary?: { fixed: number; remaining: number; new: number; unchanged: number };
  summary?: boolean;
  annotations?: boolean;
  /** Override for tests */
  stepSummaryPath?: string | null;
  annotationsWrite?: (text: string) => void;
}): Promise<void> {
  if (options.annotations) {
    const text = renderGithubAnnotations(options.findings);
    if (text.length > 0) {
      const write = options.annotationsWrite ?? ((chunk: string) => process.stderr.write(chunk));
      write(text);
    }
  }

  if (!options.summary) {
    return;
  }

  const markdown = renderGithubStepSummary({
    title: options.mode === "verify" ? "AgentDoctor Verify" : "AgentDoctor Scan",
    overallScore: options.overallScore,
    findings: options.findings,
    violations: options.violations,
    mode: options.mode,
    ...(options.verifySummary ? { verifySummary: options.verifySummary } : {}),
  });
  const summaryPath =
    options.stepSummaryPath !== undefined
      ? options.stepSummaryPath
      : (process.env.GITHUB_STEP_SUMMARY ?? null);
  if (summaryPath) {
    await fs.appendFile(summaryPath, markdown, "utf8");
    return;
  }
  process.stderr.write(
    "Note: --summary set but GITHUB_STEP_SUMMARY is unset; skipping step summary write.\n",
  );
}
