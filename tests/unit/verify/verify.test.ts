import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { compareFindings } from "../../../src/core/verify/compare.js";
import { verify } from "../../../src/core/verify/verify.js";
import { renderJsonReport } from "../../../src/reporters/json/report.js";
import { scan } from "../../../src/index.js";
import type { Finding } from "../../../src/types/index.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixturesRoot = path.resolve(here, "../../../fixtures");
const cleanProject = path.join(fixturesRoot, "clean-project");
const insecureProject = path.join(fixturesRoot, "insecure-agent-project");

const tempDirs: string[] = [];

async function tempDir(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "agentdoctor-verify-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((d) => fs.rm(d, { recursive: true, force: true })));
});

function finding(partial: Partial<Finding> & Pick<Finding, "id" | "ruleId">): Finding {
  return {
    id: partial.id,
    ruleId: partial.ruleId,
    category: partial.category ?? "security",
    severity: partial.severity ?? "warning",
    title: partial.title ?? "t",
    message: partial.message ?? "m",
    whyItMatters: partial.whyItMatters ?? "w",
    affectedAgents: partial.affectedAgents ?? [],
    fixability: partial.fixability ?? "manual",
    ...(partial.evidence !== undefined ? { evidence: partial.evidence } : {}),
  };
}

describe("compareFindings", () => {
  it("classifies fixed, remaining, new, and unchanged deterministically", () => {
    const before = [
      finding({ id: "a", ruleId: "security/env-file-exposure" }),
      finding({ id: "b", ruleId: "context/generated-directory" }),
    ];
    const after = [
      finding({ id: "b", ruleId: "context/generated-directory" }),
      finding({ id: "c", ruleId: "instructions/missing-path-reference" }),
    ];
    const result = compareFindings(before, after);
    expect(result.fixed.map((f) => f.id)).toEqual(["a"]);
    expect(result.remaining.map((f) => f.id)).toEqual(["b"]);
    expect(result.unchanged.map((f) => f.id)).toEqual(["b"]);
    expect(result.new.map((f) => f.id)).toEqual(["c"]);
    expect(result.summary).toEqual({
      fixed: 1,
      remaining: 1,
      new: 1,
      unchanged: 1,
      before: 2,
      after: 2,
    });
  });

  it("sorts ids stably for identical sets", () => {
    const findings = [finding({ id: "z", ruleId: "r1" }), finding({ id: "a", ruleId: "r2" })];
    const once = compareFindings(findings, findings);
    const twice = compareFindings(findings, findings);
    expect(once.remaining.map((f) => f.id)).toEqual(["a", "z"]);
    expect(twice).toEqual(once);
  });
});

describe("verify()", () => {
  it("compares insecure baseline to clean tree via explicit baseline path", async () => {
    const dir = await tempDir();
    const insecure = await scan({ cwd: insecureProject });
    const baselinePath = path.join(dir, "baseline.json");
    await fs.writeFile(baselinePath, renderJsonReport(insecure), "utf8");

    const result = await verify({
      cwd: cleanProject,
      baselinePath,
    });

    expect(result.summary.before).toBeGreaterThan(0);
    expect(result.summary.fixed).toBe(result.summary.before);
    expect(result.summary.remaining).toBe(0);
    expect(result.summary.new).toBe(0);
    expect(result.scores?.overall).toBe(100);
  });

  it("detects remaining findings when baseline matches current insecure scan", async () => {
    const dir = await tempDir();
    const insecure = await scan({ cwd: insecureProject });
    const baselinePath = path.join(dir, "agentdoctor-report.json");
    await fs.writeFile(baselinePath, renderJsonReport(insecure), "utf8");

    const result = await verify({
      cwd: insecureProject,
      baselinePath,
    });

    expect(result.summary.fixed).toBe(0);
    expect(result.summary.new).toBe(0);
    expect(result.summary.remaining).toBe(insecure.findings.length);
    expect(result.summary.unchanged).toBe(insecure.findings.length);
  });

  it("compare stays well under 50ms for large synthetic finding sets", () => {
    const before: Finding[] = [];
    const after: Finding[] = [];
    for (let i = 0; i < 2000; i++) {
      before.push(finding({ id: `id-${i}`, ruleId: "security/env-file-exposure" }));
      if (i % 2 === 0) {
        after.push(finding({ id: `id-${i}`, ruleId: "security/env-file-exposure" }));
      } else {
        after.push(finding({ id: `new-${i}`, ruleId: "context/generated-directory" }));
      }
    }
    const started = performance.now();
    const result = compareFindings(before, after);
    const elapsed = performance.now() - started;
    expect(result.summary.before).toBe(2000);
    expect(elapsed).toBeLessThan(50);
  });
});
