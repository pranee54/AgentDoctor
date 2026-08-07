import type { VerifyResult } from "../../core/verify/verify.js";
import { sanitizeForOutput } from "../../utils/path.js";

/**
 * Machine-readable verify report.
 */
export function renderVerifyJsonReport(result: VerifyResult): string {
  const payload = {
    version: result.version,
    baselinePath: sanitizeForOutput(result.baselinePath),
    repositoryRoot: sanitizeForOutput(result.repositoryRoot),
    fixed: result.fixed.map((f) => ({
      ...f,
      message: sanitizeForOutput(f.message),
      title: sanitizeForOutput(f.title),
      ...(f.evidence?.path !== undefined
        ? { evidence: { ...f.evidence, path: sanitizeForOutput(f.evidence.path) } }
        : f.evidence !== undefined
          ? { evidence: f.evidence }
          : {}),
    })),
    remaining: result.remaining.map((f) => ({
      ...f,
      message: sanitizeForOutput(f.message),
      title: sanitizeForOutput(f.title),
      ...(f.evidence?.path !== undefined
        ? { evidence: { ...f.evidence, path: sanitizeForOutput(f.evidence.path) } }
        : f.evidence !== undefined
          ? { evidence: f.evidence }
          : {}),
    })),
    new: result.new.map((f) => ({
      ...f,
      message: sanitizeForOutput(f.message),
      title: sanitizeForOutput(f.title),
      ...(f.evidence?.path !== undefined
        ? { evidence: { ...f.evidence, path: sanitizeForOutput(f.evidence.path) } }
        : f.evidence !== undefined
          ? { evidence: f.evidence }
          : {}),
    })),
    unchanged: result.unchanged.map((f) => ({
      id: f.id,
      ruleId: f.ruleId,
      severity: f.severity,
    })),
    summary: result.summary,
    scoringAvailable: result.scoringAvailable,
    scores: result.scores,
    timing: result.timing,
  };

  return `${JSON.stringify(payload, null, 2)}\n`;
}
