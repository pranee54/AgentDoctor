import { describe, expect, it } from "vitest";

import type { VerifyResult } from "../../../src/core/verify/verify.js";
import {
  renderVerifyNextSteps,
  renderVerifyTerminalReport,
} from "../../../src/reporters/verify/terminal.js";
import type { ScanResult } from "../../../src/types/index.js";

function emptyScan(): ScanResult {
  return {
    version: "0.0.0-test",
    repository: {
      root: "/tmp",
      filesScanned: 0,
      primaryFramework: "unknown",
      frameworks: ["unknown"],
      primaryLanguage: "unknown",
      languages: ["unknown"],
      primaryPackageManager: "unknown",
      packageManagers: ["unknown"],
      monorepo: "none",
    },
    agents: [],
    findings: [],
    summary: { total: 0, critical: 0, warning: 0, info: 0 },
    scores: null,
    scoringAvailable: false,
    agentSecurityAnalysis: "full",
    timing: { discoveryMs: 0, detectionMs: 0, agentsMs: 0, rulesMs: 0, totalMs: 0 },
  };
}

function baseResult(
  overrides: Partial<VerifyResult> & { summary: VerifyResult["summary"] },
): VerifyResult {
  return {
    version: "0.0.0-test",
    repositoryRoot: "/tmp",
    baselinePath: "/tmp/agentdoctor-report.json",
    fixed: [],
    remaining: [],
    new: [],
    unchanged: [],
    after: emptyScan(),
    scores: { overall: 100, byCategory: {}, byAgent: {} },
    scoringAvailable: true,
    timing: { scanMs: 1, compareMs: 1, totalMs: 2 },
    ...overrides,
  };
}

describe("verify Next steps", () => {
  it("when findings remain, points at fix / explain / re-verify", () => {
    const result = baseResult({
      summary: { fixed: 1, remaining: 2, new: 0, unchanged: 1, before: 3, after: 2 },
      remaining: [
        {
          id: "a",
          ruleId: "security/env-file-exposure",
          title: "env",
          message: "m",
          severity: "critical",
          evidence: { path: ".env" },
        },
      ],
    });

    const next = renderVerifyNextSteps(result).join("\n");
    expect(next).toContain("Next");
    expect(next).toContain("still open");
    expect(next).toContain("agentdoctor fix --dry-run");
    expect(next).toContain("agentdoctor explain <rule-id>");
    expect(next).toContain("agentdoctor verify --baseline agentdoctor-report.json");
  });

  it("when clean vs baseline, points at optional CI gate", () => {
    const result = baseResult({
      summary: { fixed: 2, remaining: 0, new: 0, unchanged: 0, before: 2, after: 0 },
    });

    const output = renderVerifyTerminalReport(result);
    expect(output).toContain("Next");
    expect(output).toContain("All tracked findings cleared");
    expect(output).toContain("agentdoctor scan --ci");
  });

  it("when new findings appear, points at scan", () => {
    const result = baseResult({
      summary: { fixed: 0, remaining: 0, new: 1, unchanged: 0, before: 0, after: 1 },
      new: [
        {
          id: "n",
          ruleId: "context/generated-directory",
          title: "dist",
          message: "m",
          severity: "info",
          evidence: { path: "dist" },
        },
      ],
    });

    const next = renderVerifyNextSteps(result).join("\n");
    expect(next).toContain("new finding(s) appeared");
    expect(next).toContain("agentdoctor scan");
  });
});
