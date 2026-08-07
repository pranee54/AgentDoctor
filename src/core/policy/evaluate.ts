import { InvalidArgumentError } from "commander";

import type { Finding, ScanResult, Scores, Severity } from "../../types/index.js";

export type PolicyViolationCode =
  "minimum-score" | "fail-on-severity" | "fail-on-rule" | "fail-on-new";

export interface PolicyOptions {
  /** Fail when overall score is strictly below this value (0–100). */
  minimumScore?: number;
  /** Fail when any finding has this severity or higher. */
  failOnSeverity?: Severity;
  /** Fail when any finding matches one of these rule IDs. */
  failOnRules?: string[];
  /** Fail when verify reports new findings not present in the baseline. */
  failOnNew?: boolean;
}

export interface PolicyViolation {
  code: PolicyViolationCode;
  message: string;
  /** Rule IDs or finding IDs related to this violation, when applicable. */
  details?: string[];
}

export interface PolicyInput {
  findings: Finding[];
  scores: Scores | null;
  /** Count of new findings from verify; omit for scan-only. */
  newFindingCount?: number;
  /** When limited, --min-score cannot be treated as agent-readiness enforcement. */
  agentSecurityAnalysis?: "full" | "limited";
}

const SEVERITY_RANK: Record<Severity, number> = {
  critical: 3,
  warning: 2,
  info: 1,
};

export function severityRank(severity: Severity): number {
  return SEVERITY_RANK[severity];
}

export function parseSeverityGate(value: string): Severity {
  const normalized = value.trim().toLowerCase();
  if (normalized === "critical" || normalized === "warning" || normalized === "info") {
    return normalized;
  }
  throw new InvalidArgumentError(
    `--fail-on-severity must be critical, warning, or info (got "${value}")`,
  );
}

export function parseFailOnRules(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

/**
 * Evaluate CI / Action policy against scan or verify results.
 * Deterministic: same input → same violations in stable order.
 */
export function evaluatePolicy(input: PolicyInput, options: PolicyOptions): PolicyViolation[] {
  const violations: PolicyViolation[] = [];

  if (options.minimumScore !== undefined) {
    if (input.agentSecurityAnalysis === "limited") {
      violations.push({
        code: "minimum-score",
        message: `CI check failed: no supported coding-agent configuration detected; cannot enforce --min-score ${options.minimumScore}`,
      });
    } else if (input.scores === null) {
      violations.push({
        code: "minimum-score",
        message: `CI check failed: readiness scores unavailable; cannot enforce --min-score ${options.minimumScore}`,
      });
    } else if (input.scores.overall < options.minimumScore) {
      violations.push({
        code: "minimum-score",
        message: `CI check failed: overall score ${input.scores.overall} is below --min-score ${options.minimumScore}`,
      });
    }
  }

  if (options.failOnSeverity !== undefined) {
    const threshold = severityRank(options.failOnSeverity);
    const matched = input.findings.filter((f) => severityRank(f.severity) >= threshold);
    if (matched.length > 0) {
      const bySeverity = countBySeverity(matched);
      violations.push({
        code: "fail-on-severity",
        message: `CI check failed: ${matched.length} finding(s) at or above ${options.failOnSeverity} (${formatSeverityCounts(bySeverity)})`,
        details: [...new Set(matched.map((f) => f.ruleId))].sort(),
      });
    }
  }

  if (options.failOnRules && options.failOnRules.length > 0) {
    const wanted = new Set(options.failOnRules);
    const matched = input.findings.filter((f) => wanted.has(f.ruleId));
    if (matched.length > 0) {
      const rules = [...new Set(matched.map((f) => f.ruleId))].sort();
      violations.push({
        code: "fail-on-rule",
        message: `CI check failed: ${matched.length} finding(s) match fail-on-rule (${rules.join(", ")})`,
        details: rules,
      });
    }
  }

  if (options.failOnNew === true) {
    const newCount = input.newFindingCount ?? 0;
    if (newCount > 0) {
      violations.push({
        code: "fail-on-new",
        message: `CI check failed: verify found ${newCount} new finding(s) not present in the baseline`,
      });
    }
  }

  return violations;
}

export function evaluateScanPolicy(result: ScanResult, options: PolicyOptions): PolicyViolation[] {
  const { failOnNew: _ignored, ...scanOptions } = options;
  return evaluatePolicy(
    {
      findings: result.findings,
      scores: result.scores,
      agentSecurityAnalysis: result.agentSecurityAnalysis,
    },
    scanOptions,
  );
}

export function evaluateVerifyPolicy(
  result: {
    findings?: Finding[];
    after: ScanResult;
    scores: Scores | null;
    summary: { new: number };
    newFindings?: Finding[];
  },
  options: PolicyOptions,
): PolicyViolation[] {
  const findings = result.after.findings;
  return evaluatePolicy(
    {
      findings,
      scores: result.scores,
      newFindingCount: result.summary.new,
      agentSecurityAnalysis: result.after.agentSecurityAnalysis,
    },
    options,
  );
}

function countBySeverity(findings: Finding[]): Record<Severity, number> {
  const counts: Record<Severity, number> = { critical: 0, warning: 0, info: 0 };
  for (const finding of findings) {
    counts[finding.severity] += 1;
  }
  return counts;
}

function formatSeverityCounts(counts: Record<Severity, number>): string {
  const parts: string[] = [];
  if (counts.critical > 0) {
    parts.push(`${counts.critical} critical`);
  }
  if (counts.warning > 0) {
    parts.push(`${counts.warning} warning`);
  }
  if (counts.info > 0) {
    parts.push(`${counts.info} info`);
  }
  return parts.join(", ");
}
