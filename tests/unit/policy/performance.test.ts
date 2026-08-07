import { describe, expect, it } from "vitest";

import { evaluatePolicy } from "../../../src/core/policy/evaluate.js";
import type { Finding, Scores } from "../../../src/types/index.js";

/**
 * Micro-benchmark: policy evaluation must stay negligible vs scan time.
 */
describe("policy performance", () => {
  it("evaluates large finding sets in well under 50ms", () => {
    const findings: Finding[] = [];
    for (let i = 0; i < 5000; i += 1) {
      findings.push({
        id: `f${i}`,
        ruleId: i % 7 === 0 ? "security/env-file-exposure" : `context/rule-${i % 20}`,
        category: i % 7 === 0 ? "security" : "context",
        severity: i % 11 === 0 ? "critical" : i % 3 === 0 ? "warning" : "info",
        title: "t",
        message: "m",
        whyItMatters: "w",
        affectedAgents: ["cursor"],
        fixability: "review",
        evidence: { path: `path/${i}` },
      });
    }
    const scores: Scores = {
      overall: 42,
      categories: {
        security: 40,
        context: 50,
        instructions: 60,
        mcp: 70,
        compatibility: 80,
        performance: 90,
      },
      agents: { cursor: 40, "claude-code": 40, codex: 40 },
    };

    const started = performance.now();
    const violations = evaluatePolicy(
      { findings, scores, newFindingCount: 12 },
      {
        minimumScore: 90,
        failOnSeverity: "warning",
        failOnRules: ["security/env-file-exposure"],
        failOnNew: true,
      },
    );
    const elapsedMs = performance.now() - started;

    expect(violations.length).toBe(4);
    expect(elapsedMs).toBeLessThan(50);
  });
});
