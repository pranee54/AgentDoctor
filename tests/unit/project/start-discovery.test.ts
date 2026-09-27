/**
 * Regression: `agentdoctor start` must agree with DNA/detectProject for cwd / `.`
 * when classic manifests are absent, without weakening ownership or broad-root gates.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { runDnaCommand, runStartCommand } from "../../../src/cli/commands/start.js";
import { resolveCliProjectRoot } from "../../../src/cli/safe-root.js";
import { discoverProjectRoots } from "../../../src/product/discovery/roots.js";
import { buildProjectDna } from "../../../src/product/dna/build.js";
import { EXIT_CODES } from "../../../src/types/index.js";

const temps: string[] = [];

async function mkProject(prefix: string): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  temps.push(root);
  return root;
}

afterEach(async () => {
  while (temps.length) {
    const p = temps.pop();
    if (p) await fs.rm(p, { recursive: true, force: true });
  }
});

describe("start discovery aligns with DNA / detectProject", () => {
  it("selects cwd without path when detectProject finds languages (no package.json)", async () => {
    const root = await mkProject("ad-start-cwd-");
    await fs.mkdir(path.join(root, "src"), { recursive: true });
    await fs.writeFile(path.join(root, "src", "main.py"), "print('ok')\n");

    const prev = process.cwd();
    try {
      process.chdir(root);
      const code = await runStartCommand({ json: true, initBrain: false });
      expect(code).toBe(EXIT_CODES.SUCCESS);
    } finally {
      process.chdir(prev);
    }

    const report = await discoverProjectRoots({ cwd: root, prefer: root, autoSelect: true });
    expect(report.blocked).toBe(false);
    expect(report.selected?.root).toBe(root);
    expect(report.candidates.some((c) => c.root === root)).toBe(true);
  });

  it("start . and discoverProjectRoots agree for the same directory", async () => {
    const root = await mkProject("ad-start-dot-");
    await fs.mkdir(path.join(root, "lib"), { recursive: true });
    await fs.writeFile(path.join(root, "lib", "app.js"), "export const x = 1;\n");

    const report = await discoverProjectRoots({
      cwd: root,
      prefer: root,
      autoSelect: true,
    });
    expect(report.selected?.root).toBe(root);

    const code = await runStartCommand({ root, json: true, initBrain: false });
    expect(code).toBe(EXIT_CODES.SUCCESS);
  });

  it("start and dna agree on project root for the same fixture", async () => {
    const root = await mkProject("ad-start-dna-");
    await fs.mkdir(path.join(root, "src"), { recursive: true });
    await fs.writeFile(path.join(root, "src", "index.ts"), "export {};\n");
    await fs.writeFile(path.join(root, "package.json"), JSON.stringify({ name: "agree-me" }));

    const dna = await buildProjectDna(root);
    const report = await discoverProjectRoots({ cwd: root, prefer: root, autoSelect: true });
    expect(report.selected?.root).toBe(root);
    expect(dna.root).toBe(root);

    expect(await runDnaCommand({ root, json: true })).toBe(EXIT_CODES.SUCCESS);
    expect(await runStartCommand({ root, json: true, initBrain: false })).toBe(EXIT_CODES.SUCCESS);
  });

  it("nested directory resolves upward to package.json project root", async () => {
    const root = await mkProject("ad-start-nested-");
    await fs.mkdir(path.join(root, "src", "auth"), { recursive: true });
    await fs.writeFile(path.join(root, "package.json"), JSON.stringify({ name: "nested-app" }));
    await fs.writeFile(path.join(root, "src", "auth", "login.ts"), "export {};\n");

    const nested = path.join(root, "src", "auth");
    const report = await discoverProjectRoots({ cwd: nested, autoSelect: true });
    expect(report.selected?.root).toBe(root);
  });

  it("multi-project parent lists siblings and does not silently auto-select one", async () => {
    const parent = await mkProject("ad-start-multi-");
    const a = path.join(parent, "app-a");
    const b = path.join(parent, "app-b");
    await fs.mkdir(a, { recursive: true });
    await fs.mkdir(b, { recursive: true });
    await fs.writeFile(path.join(a, "package.json"), JSON.stringify({ name: "app-a" }));
    await fs.writeFile(path.join(b, "package.json"), JSON.stringify({ name: "app-b" }));

    // Match `start` which always passes prefer=cwd via resolveCliProjectRoot.
    const report = await discoverProjectRoots({ cwd: parent, prefer: parent, autoSelect: true });
    expect(report.candidates.filter((c) => c.root === a || c.root === b).length).toBe(2);
    // Must not absorb siblings via detectProject on the parent.
    expect(report.candidates.some((c) => c.root === parent)).toBe(false);
    expect(report.selected).toBeNull();
  });

  it("empty directory is not promoted via detectProject unknown language", async () => {
    const root = await mkProject("ad-start-empty-");
    const report = await discoverProjectRoots({ cwd: root, prefer: root, autoSelect: true });
    expect(report.candidates).toHaveLength(0);
    expect(report.selected).toBeNull();
  });

  it("never treats .private as a project candidate", async () => {
    const root = await mkProject("ad-start-private-");
    const priv = path.join(root, ".private");
    await fs.mkdir(priv, { recursive: true });
    await fs.writeFile(path.join(priv, "secret.py"), "SECRET = 1\n");

    const report = await discoverProjectRoots({ cwd: priv, prefer: priv, autoSelect: true });
    expect(report.candidates.some((c) => c.root === priv)).toBe(false);
    expect(report.selected).toBeNull();
  });

  it("nested foreign .git sibling is a separate candidate, not absorbed into parent without markers", async () => {
    const parent = await mkProject("ad-start-nested-git-");
    await fs.mkdir(path.join(parent, "src"), { recursive: true });
    await fs.writeFile(path.join(parent, "src", "a.py"), "x = 1\n");
    const nested = path.join(parent, "vendor-app");
    await fs.mkdir(path.join(nested, ".git"), { recursive: true });
    await fs.writeFile(path.join(nested, "package.json"), JSON.stringify({ name: "vendor" }));

    const report = await discoverProjectRoots({ cwd: parent, prefer: parent, autoSelect: true });
    expect(report.candidates.some((c) => c.root === parent)).toBe(true);
    expect(report.candidates.some((c) => c.root === nested)).toBe(true);
    // Both strong → do not silently pick one when prefer is parent (prefer wins if listed).
    expect(report.selected?.root).toBe(parent);
  });

  it("symlink escape / broad-root / home remain denied", async () => {
    const home = os.homedir();
    expect((await resolveCliProjectRoot(home)).ok).toBe(false);
    expect((await discoverProjectRoots({ cwd: home })).blocked).toBe(true);

    const root = await mkProject("ad-start-symlink-");
    await fs.writeFile(path.join(root, "package.json"), JSON.stringify({ name: "sym" }));
    const escape = path.join(root, "escape-link");
    try {
      await fs.symlink(home, escape, "dir");
    } catch {
      // Some CI hosts disallow symlink creation — skip soft.
      return;
    }
    // Starting ON the symlink to home must refuse as broad root once resolved.
    const gated = await resolveCliProjectRoot(escape);
    // resolve may follow to home → blocked, or fail closed; never ok on home.
    if (gated.ok) {
      expect(gated.root).not.toBe(path.resolve(home));
    } else {
      expect(gated.ok).toBe(false);
    }
  });

  it("explicit path continues to work for a classic package.json project", async () => {
    const root = await mkProject("ad-start-explicit-");
    await fs.writeFile(path.join(root, "package.json"), JSON.stringify({ name: "explicit" }));
    await fs.mkdir(path.join(root, "src"), { recursive: true });
    await fs.writeFile(path.join(root, "src", "i.ts"), "export {};\n");

    const code = await runStartCommand({ root, json: true, initBrain: false });
    expect(code).toBe(EXIT_CODES.SUCCESS);
    const report = await discoverProjectRoots({ cwd: root, prefer: root, autoSelect: true });
    expect(report.selected?.root).toBe(root);
  });
});
