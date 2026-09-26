import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { buildSoftwareEvolutionTimeline } from "../../../src/product/evolution/timeline.js";

describe("software evolution timeline", () => {
  it("returns empty timeline without git", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ad-evo-"));
    try {
      await fs.writeFile(path.join(root, "README.md"), "# x\n", "utf8");
      const report = await buildSoftwareEvolutionTimeline(root);
      expect(report.gitAvailable).toBe(false);
      expect(report.events).toEqual([]);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("parses git log when repository initialized", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ad-evo-git-"));
    try {
      const { execSync } = await import("node:child_process");
      execSync("git init", { cwd: root, env: { ...process.env, GIT_TEMPLATE_DIR: "" } });
      execSync('git config user.email "t@example.com"', { cwd: root });
      execSync('git config user.name "Test"', { cwd: root });
      await fs.writeFile(path.join(root, "a.txt"), "1\n", "utf8");
      execSync("git add a.txt && git commit -m 'init'", { cwd: root, shell: "/bin/sh" });
      const report = await buildSoftwareEvolutionTimeline(root, { maxCommits: 10 });
      expect(report.gitAvailable).toBe(true);
      expect(report.events.length).toBeGreaterThan(0);
      expect(report.trends.some((t) => t.truth === "INFERRED")).toBe(true);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
