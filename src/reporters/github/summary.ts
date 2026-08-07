import type { Finding, ScanResult, Severity } from "../../types/index.js";
import type { PolicyViolation } from "../../core/policy/evaluate.js";

export interface GithubSummaryInput {
  title: string;
  overallScore: number | null;
  findings: Finding[];
  violations: PolicyViolation[];
  mode: "scan" | "verify";
  verifySummary?: { fixed: number; remaining: number; new: number; unchanged: number };
}

/**
 * Markdown for `$GITHUB_STEP_SUMMARY`.
 */
export function renderGithubStepSummary(input: GithubSummaryInput): string {
  const lines: string[] = [];
  lines.push(`# AgentDoctor ${input.mode === "verify" ? "Verify" : "Scan"}`);
  lines.push("");

  if (input.overallScore !== null) {
    lines.push(`**Readiness:** ${input.overallScore}/100`);
    lines.push("");
  }

  if (input.violations.length > 0) {
    lines.push("## Policy violations");
    lines.push("");
    for (const violation of input.violations) {
      lines.push(`- ${violation.message}`);
    }
    lines.push("");
  } else {
    lines.push("Policy gates: **passed**");
    lines.push("");
  }

  if (input.verifySummary) {
    lines.push("## Verify delta");
    lines.push("");
    lines.push(`| Fixed | Remaining | New | Unchanged |`);
    lines.push(`| ---: | ---: | ---: | ---: |`);
    lines.push(
      `| ${input.verifySummary.fixed} | ${input.verifySummary.remaining} | ${input.verifySummary.new} | ${input.verifySummary.unchanged} |`,
    );
    lines.push("");
  }

  const critical = input.findings.filter((f) => f.severity === "critical").length;
  const warning = input.findings.filter((f) => f.severity === "warning").length;
  const info = input.findings.filter((f) => f.severity === "info").length;

  lines.push("## Findings");
  lines.push("");
  lines.push(`| Severity | Count |`);
  lines.push(`| --- | ---: |`);
  lines.push(`| Critical | ${critical} |`);
  lines.push(`| Warning | ${warning} |`);
  lines.push(`| Info | ${info} |`);
  lines.push(`| **Total** | **${input.findings.length}** |`);
  lines.push("");

  if (input.findings.length > 0) {
    lines.push("### Top findings");
    lines.push("");
    const top = [...input.findings]
      .sort((a, b) => severityOrder(b.severity) - severityOrder(a.severity))
      .slice(0, 20);
    for (const finding of top) {
      const path = finding.evidence?.path ? ` \`${finding.evidence.path}\`` : "";
      lines.push(`- **${finding.severity}** \`${finding.ruleId}\`${path} — ${finding.title}`);
    }
    lines.push("");
  }

  if (input.violations.length > 0) {
    lines.push(...renderGithubNextSteps(input));
  }

  return `${lines.join("\n")}\n`;
}

/**
 * Shortest path back to green when the Action failed a policy gate.
 * Shown only on failure — success summaries stay quiet.
 */
function renderGithubNextSteps(input: GithubSummaryInput): string[] {
  const lines: string[] = [];
  lines.push("## Next");
  lines.push("");
  lines.push("Policy gate failed. Shortest path back to green:");
  lines.push("");

  const hasSafe = input.findings.some((f) => f.fixability === "safe");
  const topRule = [...input.findings].sort(
    (a, b) => severityOrder(b.severity) - severityOrder(a.severity),
  )[0]?.ruleId;

  if (input.mode === "verify") {
    lines.push("1. Reproduce locally: `npx @praneeth_54/agentdoctor verify`");
    if (hasSafe) {
      lines.push("2. Apply safe fixes: `npx @praneeth_54/agentdoctor fix -y`");
      lines.push("3. Re-check: `npx @praneeth_54/agentdoctor verify`");
    } else {
      lines.push(
        `2. Inspect a finding: \`npx @praneeth_54/agentdoctor explain ${topRule ?? "<rule-id>"}\``,
      );
      lines.push("3. Fix or baseline, then re-run this Action");
    }
  } else {
    lines.push("1. Reproduce locally: `npx @praneeth_54/agentdoctor scan --ci`");
    if (hasSafe) {
      lines.push("2. Apply safe fixes: `npx @praneeth_54/agentdoctor fix -y`");
      lines.push("3. Confirm: `npx @praneeth_54/agentdoctor scan --ci`");
    } else {
      lines.push(
        `2. Inspect a finding: \`npx @praneeth_54/agentdoctor explain ${topRule ?? "<rule-id>"}\``,
      );
      lines.push("3. Fix the gated findings, then re-run this Action");
    }
  }

  lines.push("");
  lines.push("Preview before applying: `npx @praneeth_54/agentdoctor fix --dry-run`");
  lines.push("");
  return lines;
}

export function renderGithubStepSummaryForScan(
  result: ScanResult,
  violations: PolicyViolation[],
): string {
  return renderGithubStepSummary({
    title: "AgentDoctor Scan",
    overallScore: result.scores?.overall ?? null,
    findings: result.findings,
    violations,
    mode: "scan",
  });
}

function severityOrder(severity: Severity): number {
  return severity === "critical" ? 3 : severity === "warning" ? 2 : 1;
}
