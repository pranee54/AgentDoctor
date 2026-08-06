import { describe, expect, it } from "vitest";

import { computeReadinessScores } from "../../src/core/scoring/compute-scores.js";
import { computePlaceholderScores } from "../../src/core/scoring/placeholder.js";
import type {
  AgentId,
  Finding,
  FindingEvidence,
  RuleCategory,
  Severity,
} from "../../src/types/index.js";

function finding(partial: {
  id: string;
  ruleId: string;
  category?: RuleCategory;
  severity: Severity;
  affectedAgents?: AgentId[];
  evidence?: FindingEvidence;
}): Finding {
  return {
    id: partial.id,
    ruleId: partial.ruleId,
    category: partial.category ?? "security",
    severity: partial.severity,
    title: partial.ruleId,
    message: partial.ruleId,
    whyItMatters: "test",
    affectedAgents: partial.affectedAgents ?? [],
    ...(partial.evidence !== undefined ? { evidence: partial.evidence } : {}),
    fixability: "review",
  };
}

describe("computePlaceholderScores (historical)", () => {
  it("returns scores between 0 and 100", () => {
    const scores = computePlaceholderScores(10);
    expect(scores.overall).toBeGreaterThanOrEqual(0);
    expect(scores.overall).toBeLessThanOrEqual(100);
    expect(scores.categories.security).toBeGreaterThanOrEqual(0);
    expect(scores.categories.security).toBeLessThanOrEqual(100);
    expect(scores.agents.cursor).toBeGreaterThanOrEqual(0);
    expect(scores.agents.cursor).toBeLessThanOrEqual(100);
  });

  it("is deterministic", () => {
    expect(computePlaceholderScores(50)).toEqual(computePlaceholderScores(50));
  });

  it("does not award a perfect 100 for a typical clean repo", () => {
    const scores = computePlaceholderScores(20);
    expect(scores.overall).toBeLessThan(100);
  });

  it("increases slightly with more files, with a cap", () => {
    const small = computePlaceholderScores(1);
    const large = computePlaceholderScores(10_000);
    expect(large.overall).toBeGreaterThanOrEqual(small.overall);
    expect(large.overall).toBeLessThanOrEqual(80);
  });
});

describe("computeReadinessScores (docs/scoring.md)", () => {
  it("scores a clean repository at 100 across overall, categories, and agents", () => {
    const scores = computeReadinessScores([]);
    expect(scores.overall).toBe(100);
    expect(scores.categories).toEqual({
      security: 100,
      context: 100,
      instructions: 100,
      mcp: 100,
      compatibility: 100,
      performance: 100,
    });
    expect(scores.agents).toEqual({
      cursor: 100,
      "claude-code": 100,
      codex: 100,
    });
  });

  it("deducts 35 for one critical", () => {
    const scores = computeReadinessScores([
      finding({
        id: "f1",
        ruleId: "context/missing-readme",
        category: "context",
        severity: "critical",
      }),
    ]);
    expect(scores.overall).toBe(65);
    expect(scores.categories.context).toBe(65);
    expect(scores.categories.security).toBe(100);
  });

  it("applies diminishing returns for two criticals", () => {
    // 35 + 35*0.7 = 59.5 → round(100 - 59.5) = 41
    const scores = computeReadinessScores([
      finding({ id: "f1", ruleId: "context/a", category: "context", severity: "critical" }),
      finding({ id: "f2", ruleId: "context/b", category: "context", severity: "critical" }),
    ]);
    expect(scores.overall).toBe(41);
    expect(scores.categories.context).toBe(41);
  });

  it("scores warnings only", () => {
    expect(
      computeReadinessScores([
        finding({
          id: "w1",
          ruleId: "instructions/a",
          category: "instructions",
          severity: "warning",
        }),
      ]).overall,
    ).toBe(90);

    // 10 + 7 = 17 → 83
    expect(
      computeReadinessScores([
        finding({
          id: "w1",
          ruleId: "instructions/a",
          category: "instructions",
          severity: "warning",
        }),
        finding({
          id: "w2",
          ruleId: "instructions/b",
          category: "instructions",
          severity: "warning",
        }),
      ]).overall,
    ).toBe(83);
  });

  it("scores infos only", () => {
    expect(
      computeReadinessScores([
        finding({
          id: "i1",
          ruleId: "performance/a",
          category: "performance",
          severity: "info",
        }),
      ]).overall,
    ).toBe(98);

    // 2 + 1.4 + 1 = 4.4 → 96
    expect(
      computeReadinessScores([
        finding({ id: "i1", ruleId: "performance/a", category: "performance", severity: "info" }),
        finding({ id: "i2", ruleId: "performance/b", category: "performance", severity: "info" }),
        finding({ id: "i3", ruleId: "performance/c", category: "performance", severity: "info" }),
      ]).overall,
    ).toBe(96);
  });

  it("scores mixed severities with deterministic severity-first order", () => {
    // critical 35 + warning 10 + info 2 = 47 → 53
    const scores = computeReadinessScores([
      finding({ id: "i1", ruleId: "z", category: "mcp", severity: "info" }),
      finding({ id: "c1", ruleId: "a", category: "mcp", severity: "critical" }),
      finding({ id: "w1", ruleId: "m", category: "mcp", severity: "warning" }),
    ]);
    expect(scores.overall).toBe(53);
    expect(scores.categories.mcp).toBe(53);
  });

  it("applies security caps on overall only", () => {
    const one = computeReadinessScores([
      finding({
        id: "s1",
        ruleId: "security/a",
        category: "security",
        severity: "critical",
        affectedAgents: ["cursor"],
      }),
      finding({
        id: "w1",
        ruleId: "context/w",
        category: "context",
        severity: "warning",
      }),
    ]);
    // 35 + 10 = 45 → 55; category security uncapped at 65
    expect(one.overall).toBe(55);
    expect(one.overall).toBeLessThanOrEqual(69);
    expect(one.categories.security).toBe(65);
    expect(one.categories.context).toBe(90);

    const two = computeReadinessScores([
      finding({ id: "s1", ruleId: "security/a", category: "security", severity: "critical" }),
      finding({ id: "s2", ruleId: "security/b", category: "security", severity: "critical" }),
      finding({ id: "i1", ruleId: "performance/x", category: "performance", severity: "info" }),
    ]);
    // 35 + 24.5 + 2 = 61.5 → 39; ≥2 security criticals → max 49
    expect(two.overall).toBe(39);
    expect(two.overall).toBeLessThanOrEqual(49);
    expect(two.categories.security).toBe(41);
    expect(two.categories.performance).toBe(98);
  });

  it("never exceeds security caps when security criticals are present", () => {
    const cases: Finding[][] = [
      [finding({ id: "s1", ruleId: "s/a", category: "security", severity: "critical" })],
      [
        finding({ id: "s1", ruleId: "s/a", category: "security", severity: "critical" }),
        finding({ id: "s2", ruleId: "s/b", category: "security", severity: "critical" }),
      ],
      [
        finding({ id: "c1", ruleId: "c/a", category: "context", severity: "info" }),
        finding({ id: "s1", ruleId: "s/a", category: "security", severity: "critical" }),
      ],
      [
        finding({ id: "w1", ruleId: "w/a", category: "instructions", severity: "warning" }),
        finding({ id: "s1", ruleId: "s/a", category: "security", severity: "critical" }),
        finding({ id: "s2", ruleId: "s/b", category: "security", severity: "critical" }),
      ],
      [
        finding({ id: "c1", ruleId: "aaa", category: "context", severity: "critical" }),
        finding({ id: "c2", ruleId: "bbb", category: "context", severity: "critical" }),
        finding({ id: "c3", ruleId: "ccc", category: "context", severity: "critical" }),
        finding({ id: "s1", ruleId: "security/late", category: "security", severity: "critical" }),
      ],
    ];

    for (const findings of cases) {
      const scores = computeReadinessScores(findings);
      const securityCriticals = findings.filter(
        (f) => f.category === "security" && f.severity === "critical",
      ).length;
      if (securityCriticals >= 2) {
        expect(scores.overall).toBeLessThanOrEqual(49);
      } else if (securityCriticals >= 1) {
        expect(scores.overall).toBeLessThanOrEqual(69);
      }
    }
  });

  it("scores a single post-dedupe multi-agent finding once overall and per agent", () => {
    const scores = computeReadinessScores([
      finding({
        id: "merged",
        ruleId: "security/env-file-exposure",
        category: "security",
        severity: "critical",
        affectedAgents: ["cursor", "claude-code", "codex"],
        evidence: { path: ".env" },
      }),
    ]);
    expect(scores.overall).toBe(65);
    expect(scores.categories.security).toBe(65);
    expect(scores.agents.cursor).toBe(65);
    expect(scores.agents["claude-code"]).toBe(65);
    expect(scores.agents.codex).toBe(65);
  });

  it("computes independent agent scores from affectedAgents", () => {
    const scores = computeReadinessScores([
      finding({
        id: "f1",
        ruleId: "security/a",
        category: "security",
        severity: "warning",
        affectedAgents: ["cursor"],
      }),
      finding({
        id: "f2",
        ruleId: "mcp/b",
        category: "mcp",
        severity: "warning",
        affectedAgents: ["claude-code"],
      }),
      finding({
        id: "f3",
        ruleId: "context/c",
        category: "context",
        severity: "info",
        affectedAgents: [],
      }),
    ]);
    // warnings 10+7 + info 2 = 19 → 81
    expect(scores.overall).toBe(81);
    expect(scores.agents.cursor).toBe(90);
    expect(scores.agents["claude-code"]).toBe(90);
    expect(scores.agents.codex).toBe(100);
  });

  it("computes independent category scores", () => {
    const scores = computeReadinessScores([
      finding({ id: "f1", ruleId: "security/a", category: "security", severity: "critical" }),
      finding({
        id: "f2",
        ruleId: "compatibility/a",
        category: "compatibility",
        severity: "warning",
      }),
      finding({
        id: "f3",
        ruleId: "compatibility/b",
        category: "compatibility",
        severity: "warning",
      }),
    ]);
    expect(scores.categories.security).toBe(65);
    expect(scores.categories.compatibility).toBe(83);
    expect(scores.categories.mcp).toBe(100);
    // 35 + 10 + 7 = 52 → 48
    expect(scores.overall).toBe(48);
  });

  it("is deterministic regardless of input order", () => {
    const a = finding({
      id: "z",
      ruleId: "r/b",
      category: "mcp",
      severity: "warning",
      evidence: { path: "b.json" },
    });
    const b = finding({
      id: "a",
      ruleId: "r/a",
      category: "mcp",
      severity: "critical",
      evidence: { path: "a.json" },
    });
    const c = finding({
      id: "m",
      ruleId: "r/a",
      category: "mcp",
      severity: "critical",
      evidence: { path: "z.json" },
    });

    expect(computeReadinessScores([a, b, c])).toEqual(computeReadinessScores([c, a, b]));
    expect(computeReadinessScores([c, a, b])).toEqual(computeReadinessScores([b, c, a]));
  });

  it("uses evidence.path and id as sort tiebreakers", () => {
    const first = finding({
      id: "id-b",
      ruleId: "same/rule",
      category: "instructions",
      severity: "warning",
      evidence: { path: "a.md" },
    });
    const second = finding({
      id: "id-a",
      ruleId: "same/rule",
      category: "instructions",
      severity: "warning",
      evidence: { path: "b.md" },
    });
    expect(computeReadinessScores([second, first]).overall).toBe(83);
    expect(computeReadinessScores([first, second]).overall).toBe(83);

    const samePathA = finding({
      id: "id-a",
      ruleId: "same/rule",
      category: "instructions",
      severity: "warning",
      evidence: { path: "x.md" },
    });
    const samePathB = finding({
      id: "id-b",
      ruleId: "same/rule",
      category: "instructions",
      severity: "warning",
      evidence: { path: "x.md" },
    });
    expect(computeReadinessScores([samePathB, samePathA])).toEqual(
      computeReadinessScores([samePathA, samePathB]),
    );
  });

  it("clamps at 0 when deductions exceed 100", () => {
    const findings = Array.from({ length: 10 }, (_, i) =>
      finding({
        id: `c${i}`,
        ruleId: `context/${String(i).padStart(2, "0")}`,
        category: "context",
        severity: "critical",
      }),
    );
    expect(computeReadinessScores(findings).overall).toBe(0);
    expect(computeReadinessScores(findings).categories.context).toBe(0);
  });

  it("does not penalize overall merely for empty affectedAgents", () => {
    const scores = computeReadinessScores([
      finding({
        id: "repo-risk",
        ruleId: "security/env-file-exposure",
        category: "security",
        severity: "critical",
        affectedAgents: [],
      }),
    ]);
    expect(scores.overall).toBe(65);
    expect(scores.agents).toEqual({
      cursor: 100,
      "claude-code": 100,
      codex: 100,
    });
  });
});
