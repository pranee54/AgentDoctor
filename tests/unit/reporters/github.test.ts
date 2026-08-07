import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { emitGithubReports } from "../../../src/reporters/github/emit.js";
import { renderGithubAnnotations } from "../../../src/reporters/github/annotations.js";
import { renderGithubStepSummary } from "../../../src/reporters/github/summary.js";
import type { Finding } from "../../../src/types/index.js";

const sampleFindings: Finding[] = [
  {
    id: "f1",
    ruleId: "security/env-file-exposure",
    category: "security",
    severity: "critical",
    title: "Sensitive environment file may enter agent context",
    message: ".env may be readable",
    whyItMatters: "secrets",
    affectedAgents: ["cursor"],
    evidence: { path: ".env", line: 1 },
    fixability: "review",
  },
  {
    id: "f2",
    ruleId: "context/generated-directory",
    category: "context",
    severity: "info",
    title: "Generated directory may enter agent context",
    message: "build/ present",
    whyItMatters: "noise",
    affectedAgents: ["codex"],
    evidence: { path: "build" },
    fixability: "safe",
  },
];

describe("github reporters", () => {
  it("renders workflow annotations to stderr-safe commands", () => {
    const text = renderGithubAnnotations(sampleFindings);
    expect(text).toContain("::error file=.env,line=1,title=");
    expect(text).toContain("security/env-file-exposure");
    expect(text).toContain("::notice file=build,title=");
    expect(text.split("\n").filter(Boolean)).toHaveLength(2);
  });

  it("renders step summary markdown with policy section", () => {
    const md = renderGithubStepSummary({
      title: "AgentDoctor Scan",
      overallScore: 84,
      findings: sampleFindings,
      violations: [
        {
          code: "minimum-score",
          message: "CI check failed: overall score 84 is below --min-score 90",
        },
      ],
      mode: "scan",
    });
    expect(md).toContain("**Readiness:** 84/100");
    expect(md).toContain("Policy violations");
    expect(md).toContain("below --min-score 90");
    expect(md).toContain("`security/env-file-exposure`");
    expect(md).toContain("## Next");
    expect(md).toContain("scan --ci");
    expect(md).toContain("fix -y");
  });

  it("omits Next section when policy gates pass", () => {
    const md = renderGithubStepSummary({
      title: "AgentDoctor Scan",
      overallScore: 95,
      findings: sampleFindings,
      violations: [],
      mode: "scan",
    });
    expect(md).toContain("Policy gates: **passed**");
    expect(md).not.toContain("## Next");
  });

  it("emitGithubReports writes summary file and annotations", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "agentdoctor-gh-"));
    const summaryPath = path.join(dir, "summary.md");
    const annotations: string[] = [];
    try {
      await emitGithubReports({
        mode: "scan",
        findings: sampleFindings,
        overallScore: 70,
        violations: [],
        summary: true,
        annotations: true,
        stepSummaryPath: summaryPath,
        annotationsWrite: (chunk) => annotations.push(chunk),
      });
      const summary = await fs.readFile(summaryPath, "utf8");
      expect(summary).toContain("Policy gates: **passed**");
      expect(annotations.join("")).toContain("::error");
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });
});
