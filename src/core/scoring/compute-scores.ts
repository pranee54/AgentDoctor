import type { Finding, Scores, Severity } from "../../types/index.js";

const SEVERITY_BASE: Record<Severity, number> = {
  critical: 35,
  warning: 10,
  info: 2,
};

const SEVERITY_SORT_RANK: Record<Severity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

/**
 * v1 readiness scores from post-dedupe findings.
 * Spec: docs/scoring.md
 */
export function computeReadinessScores(findings: readonly Finding[]): Scores {
  const overallRaw = 100 - sumDeductions(findings);
  const overall = clampScore(applySecurityCaps(overallRaw, findings));

  return {
    overall,
    categories: {
      security: scoreSubset(findings.filter((f) => f.category === "security")),
      context: scoreSubset(findings.filter((f) => f.category === "context")),
      instructions: scoreSubset(findings.filter((f) => f.category === "instructions")),
      mcp: scoreSubset(findings.filter((f) => f.category === "mcp")),
      compatibility: scoreSubset(findings.filter((f) => f.category === "compatibility")),
      performance: scoreSubset(findings.filter((f) => f.category === "performance")),
    },
    agents: {
      cursor: scoreSubset(findings.filter((f) => f.affectedAgents.includes("cursor"))),
      "claude-code": scoreSubset(findings.filter((f) => f.affectedAgents.includes("claude-code"))),
      codex: scoreSubset(findings.filter((f) => f.affectedAgents.includes("codex"))),
    },
  };
}

function scoreSubset(findings: readonly Finding[]): number {
  return clampScore(100 - sumDeductions(findings));
}

function sumDeductions(findings: readonly Finding[]): number {
  const sorted = sortFindings(findings);
  const severityIndex: Record<Severity, number> = {
    critical: 0,
    warning: 0,
    info: 0,
  };

  let total = 0;
  for (const finding of sorted) {
    const occurrence = severityIndex[finding.severity];
    severityIndex[finding.severity] = occurrence + 1;
    total += SEVERITY_BASE[finding.severity] * diminishingMultiplier(occurrence);
  }
  return total;
}

function diminishingMultiplier(zeroBasedIndex: number): number {
  if (zeroBasedIndex === 0) return 1;
  if (zeroBasedIndex === 1) return 0.7;
  if (zeroBasedIndex === 2) return 0.5;
  return 0.35;
}

function sortFindings(findings: readonly Finding[]): Finding[] {
  return [...findings].sort((a, b) => {
    const sev = SEVERITY_SORT_RANK[a.severity] - SEVERITY_SORT_RANK[b.severity];
    if (sev !== 0) return sev;
    const rule = a.ruleId.localeCompare(b.ruleId);
    if (rule !== 0) return rule;
    const pathA = a.evidence?.path ?? "";
    const pathB = b.evidence?.path ?? "";
    const pathCmp = pathA.localeCompare(pathB);
    if (pathCmp !== 0) return pathCmp;
    return a.id.localeCompare(b.id);
  });
}

function applySecurityCaps(overall: number, findings: readonly Finding[]): number {
  const securityCriticals = findings.filter(
    (f) => f.category === "security" && f.severity === "critical",
  ).length;
  if (securityCriticals >= 2) {
    return Math.min(overall, 49);
  }
  if (securityCriticals >= 1) {
    return Math.min(overall, 69);
  }
  return overall;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
