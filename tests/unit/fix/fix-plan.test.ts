import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { scan, buildFixPlan, applyFixPlan } from "../../../src/index.js";
import { patternForFinding } from "../../../src/core/fix/patterns.js";
import { previewCursorignoreActions } from "../../../src/core/fix/writers/cursorignore.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixturesRoot = path.resolve(here, "../../../fixtures");
const scratchRoot = path.resolve(here, "../../../test-results");

/**
 * Minimal Cursor-detected repo without creating a `.cursor/` directory
 * (some environments block mkdir of `.cursor` outside fixtures).
 */
async function makeCursorFixSandbox(options?: {
  withBuild?: boolean;
  withLog?: boolean;
  existingCursorignore?: string;
}): Promise<string> {
  await fs.mkdir(scratchRoot, { recursive: true });
  const root = await fs.mkdtemp(path.join(scratchRoot, "fix-sandbox-"));
  await fs.writeFile(
    path.join(root, "package.json"),
    JSON.stringify({ name: "fix-sandbox", private: true }),
    "utf8",
  );
  await fs.writeFile(path.join(root, "AGENTS.md"), "# Agents\n\nUse AgentDoctor.\n", "utf8");

  if (options?.withBuild !== false) {
    await fs.mkdir(path.join(root, "build"), { recursive: true });
    await fs.writeFile(path.join(root, "build", "out.txt"), "generated\n", "utf8");
  }

  if (options?.withLog) {
    // Large enough to trip large-log threshold (256 KB default in thresholds)
    const big = Buffer.alloc(300 * 1024, 0x61);
    await fs.writeFile(path.join(root, "debug-app.log"), big);
  }

  if (options?.existingCursorignore !== undefined) {
    await fs.writeFile(path.join(root, ".cursorignore"), options.existingCursorignore, "utf8");
  }

  return root;
}

describe("fix patterns", () => {
  it("adds trailing slash for generated directories", () => {
    const pattern = patternForFinding({
      id: "x",
      ruleId: "context/generated-directory",
      category: "context",
      severity: "info",
      title: "t",
      message: "m",
      whyItMatters: "w",
      affectedAgents: ["cursor"],
      fixability: "safe",
      evidence: { path: "build" },
    });
    expect(pattern).toBe("build/");
  });

  it("keeps file path for large logs", () => {
    const pattern = patternForFinding({
      id: "x",
      ruleId: "context/large-log-file",
      category: "context",
      severity: "info",
      title: "t",
      message: "m",
      whyItMatters: "w",
      affectedAgents: ["cursor"],
      fixability: "safe",
      evidence: { path: "debug-app.log" },
    });
    expect(pattern).toBe("debug-app.log");
  });
});

describe("fix plan + cursorignore writer", () => {
  it("dry-run proposes .cursorignore patterns for fixture unignored build/", async () => {
    const result = await scan({
      cwd: path.join(fixturesRoot, "generated-root-unignored"),
    });
    const plan = await buildFixPlan(result);

    expect(plan.actions.some((a) => a.pattern === "build/" && a.agent === "cursor")).toBe(true);
    expect(plan.actions.every((a) => a.targetRelativePath === ".cursorignore")).toBe(true);

    const preview = previewCursorignoreActions(null, plan.actions);
    expect(preview).not.toBeNull();
    expect(preview?.patternsToAdd).toContain("build/");
    expect(preview?.after).toContain("build/");
    expect(preview?.after).toContain("Added by AgentDoctor");
  });

  it("apply writes .cursorignore and clears generated-directory finding", async () => {
    const root = await makeCursorFixSandbox();
    try {
      const before = await scan({ cwd: root });
      expect(
        before.findings.some(
          (f) => f.ruleId === "context/generated-directory" && f.evidence?.path === "build",
        ),
      ).toBe(true);

      const plan = await buildFixPlan(before);
      expect(plan.actions.some((a) => a.pattern === "build/")).toBe(true);

      const applyResult = await applyFixPlan(plan, { dryRun: false });
      expect(applyResult.writtenFiles).toEqual([".cursorignore"]);

      const written = await fs.readFile(path.join(root, ".cursorignore"), "utf8");
      expect(written).toContain("build/");

      const after = await scan({ cwd: root });
      expect(
        after.findings.some(
          (f) => f.ruleId === "context/generated-directory" && f.evidence?.path === "build",
        ),
      ).toBe(false);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("apply is idempotent when pattern already present", async () => {
    const root = await makeCursorFixSandbox();
    try {
      const firstScan = await scan({ cwd: root });
      const plan1 = await buildFixPlan(firstScan);
      await applyFixPlan(plan1, { dryRun: false });

      const secondScan = await scan({ cwd: root });
      const plan2 = await buildFixPlan(secondScan);
      expect(plan2.actions.filter((a) => a.agent === "cursor")).toHaveLength(0);

      const apply2 = await applyFixPlan(plan2, { dryRun: false });
      expect(apply2.writtenFiles).toHaveLength(0);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("dry-run does not write files", async () => {
    const root = await makeCursorFixSandbox();
    try {
      const result = await scan({ cwd: root });
      const plan = await buildFixPlan(result);
      await applyFixPlan(plan, { dryRun: true });
      await expect(fs.access(path.join(root, ".cursorignore"))).rejects.toMatchObject({
        code: "ENOENT",
      });
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("proposes exclusion for large log files", async () => {
    const root = await makeCursorFixSandbox({ withBuild: false, withLog: true });
    try {
      const result = await scan({ cwd: root });
      const plan = await buildFixPlan(result);
      expect(plan.actions.some((a) => a.pattern === "debug-app.log" && a.agent === "cursor")).toBe(
        true,
      );
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("records skip reasons for review/manual findings instead of silent empty plan", async () => {
    const result = await scan({
      cwd: path.join(fixturesRoot, "insecure-agent-project"),
    });
    expect(result.findings.length).toBeGreaterThan(0);
    expect(result.findings.every((f) => f.fixability !== "safe")).toBe(true);

    const plan = await buildFixPlan(result);
    expect(plan.actions).toHaveLength(0);
    expect(plan.skipped.length).toBe(result.findings.length);
    expect(
      plan.skipped.every(
        (s) =>
          s.reason.includes("review") ||
          s.reason.includes("Manual") ||
          s.reason.includes("Not auto-fixable"),
      ),
    ).toBe(true);
  });
});
