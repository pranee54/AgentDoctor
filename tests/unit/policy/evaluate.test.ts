import { describe, expect, it } from "vitest";

import {
  evaluatePolicy,
  evaluateScanPolicy,
  parseFailOnRules,
  parseSeverityGate,
  severityRank,
} from "../../../src/core/policy/evaluate.js";
import type { Finding, ScanResult, Scores } from "../../../src/types/index.js";

function finding(partial: Partial<Finding> & Pick<Finding, "id" | "ruleId" | "severity">): Finding {
  return {
    category: "security",
    title: partial.title ?? partial.ruleId,
    message: partial.message ?? partial.ruleId,
    whyItMatters: "test",
    affectedAgents: ["cursor"],
    fixability: "review",
    ...partial,
  };
}

function scores(overall: number): Scores {
  return {
    overall,
    categories: {
      security: overall,
      context: 100,
      instructions: 100,
      mcp: 100,
      compatibility: 100,
      performance: 100,
    },
    agents: { cursor: 100, "claude-code": 100, codex: 100 },
  };
}

describe("policy evaluate", () => {
  it("ranks severities deterministically", () => {
    expect(severityRank("critical")).toBeGreaterThan(severityRank("warning"));
    expect(severityRank("warning")).toBeGreaterThan(severityRank("info"));
  });

  it("parses severity and rule lists", () => {
    expect(parseSeverityGate("Critical")).toBe("critical");
    expect(parseFailOnRules(" a/b , c/d ")).toEqual(["a/b", "c/d"]);
    expect(() => parseSeverityGate("high")).toThrow(/fail-on-severity/);
  });

  it("fails minimum-score when overall is below threshold", () => {
    const violations = evaluatePolicy({ findings: [], scores: scores(84) }, { minimumScore: 90 });
    expect(violations).toHaveLength(1);
    expect(violations[0]?.code).toBe("minimum-score");
    expect(violations[0]?.message).toContain("84");
    expect(violations[0]?.message).toContain("90");
  });

  it("passes minimum-score when overall meets threshold", () => {
    expect(evaluatePolicy({ findings: [], scores: scores(90) }, { minimumScore: 90 })).toEqual([]);
  });

  it("fails fail-on-severity for matching and higher severities", () => {
    const findings = [
      finding({ id: "1", ruleId: "security/env-file-exposure", severity: "critical" }),
      finding({ id: "2", ruleId: "context/large-log-file", severity: "info" }),
    ];
    const criticalGate = evaluatePolicy(
      { findings, scores: scores(50) },
      { failOnSeverity: "critical" },
    );
    expect(criticalGate).toHaveLength(1);
    expect(criticalGate[0]?.code).toBe("fail-on-severity");
    expect(criticalGate[0]?.details).toEqual(["security/env-file-exposure"]);

    const warningGate = evaluatePolicy(
      { findings, scores: scores(50) },
      { failOnSeverity: "warning" },
    );
    expect(warningGate[0]?.details).toEqual(["security/env-file-exposure"]);

    const infoGate = evaluatePolicy({ findings, scores: scores(50) }, { failOnSeverity: "info" });
    expect(infoGate[0]?.details).toEqual(["context/large-log-file", "security/env-file-exposure"]);
  });

  it("fails fail-on-rule only for listed rule ids", () => {
    const findings = [
      finding({ id: "1", ruleId: "security/env-file-exposure", severity: "critical" }),
      finding({ id: "2", ruleId: "mcp/malformed-config", severity: "warning" }),
    ];
    const violations = evaluatePolicy(
      { findings, scores: scores(40) },
      { failOnRules: ["mcp/malformed-config"] },
    );
    expect(violations).toHaveLength(1);
    expect(violations[0]?.code).toBe("fail-on-rule");
    expect(violations[0]?.details).toEqual(["mcp/malformed-config"]);
  });

  it("fails fail-on-new when new findings exist", () => {
    const violations = evaluatePolicy(
      { findings: [], scores: scores(100), newFindingCount: 2 },
      { failOnNew: true },
    );
    expect(violations).toHaveLength(1);
    expect(violations[0]?.code).toBe("fail-on-new");
  });

  it("aggregates multiple gates in stable order", () => {
    const findings = [
      finding({ id: "1", ruleId: "security/env-file-exposure", severity: "critical" }),
    ];
    const violations = evaluatePolicy(
      { findings, scores: scores(10), newFindingCount: 1 },
      {
        minimumScore: 90,
        failOnSeverity: "critical",
        failOnRules: ["security/env-file-exposure"],
        failOnNew: true,
      },
    );
    expect(violations.map((v) => v.code)).toEqual([
      "minimum-score",
      "fail-on-severity",
      "fail-on-rule",
      "fail-on-new",
    ]);
  });

  it("evaluateScanPolicy ignores failOnNew", () => {
    const result = {
      findings: [] as Finding[],
      scores: scores(100),
      agentSecurityAnalysis: "full" as const,
    } as ScanResult;
    expect(evaluateScanPolicy(result, { failOnNew: true, minimumScore: 50 })).toEqual([]);
  });

  it("fails minimum-score when agent analysis is limited", () => {
    const violations = evaluatePolicy(
      { findings: [], scores: scores(100), agentSecurityAnalysis: "limited" },
      { minimumScore: 70 },
    );
    expect(violations).toHaveLength(1);
    expect(violations[0]?.code).toBe("minimum-score");
    expect(violations[0]?.message).toContain("no supported coding-agent configuration");
  });
});
