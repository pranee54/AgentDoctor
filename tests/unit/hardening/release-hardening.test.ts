import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runFixCommand } from "../../../src/cli/commands/fix.js";
import { runScanCommand } from "../../../src/cli/commands/scan.js";
import { buildCodexConfigContent } from "../../../src/core/fix/writers/codex-config.js";
import { renderTerminalReport } from "../../../src/reporters/terminal/report.js";
import { scan } from "../../../src/index.js";
import { EXIT_CODES } from "../../../src/types/index.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((d) => fs.rm(d, { recursive: true, force: true })));
});

async function makeTemp(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "agentdoctor-harden-"));
  tempDirs.push(dir);
  return dir;
}

describe("release hardening regressions", () => {
  it("min-score fails on agentless repository instead of vacuous 100", async () => {
    const root = await makeTemp();
    const code = await runScanCommand({
      targetPath: root,
      json: true,
      minScore: 70,
    });
    expect(code).toBe(EXIT_CODES.ISSUES_OR_THRESHOLD);
  });

  it("terminal readiness is n/a when no agents are configured", async () => {
    const root = await makeTemp();
    const result = await scan({ cwd: root });
    expect(result.agentSecurityAnalysis).toBe("limited");
    const terminal = renderTerminalReport(result);
    expect(terminal).toContain("Readiness: n/a");
    expect(terminal).not.toMatch(/Readiness: 100\/100/);
    expect(terminal).toContain("Nothing to audit yet");
    expect(terminal).toContain("Next: add project agent config");
  });

  it("Codex Fix refuses unrecognizable config.toml content", () => {
    expect(() => buildCodexConfigContent("this is not = toml [[[\n", ["build"])).toThrow(
      /does not look like valid Codex config TOML/,
    );
  });

  it("Codex Fix still initializes comment-only config.toml", () => {
    const after = buildCodexConfigContent("# project notes\n", ["build"]);
    expect(after).toContain('default_permissions = "agentdoctor_context"');
    expect(after).toContain('"build" = "deny"');
  });

  it("fix without --yes on non-TTY exits usage error", async () => {
    const root = await makeTemp();
    await fs.writeFile(path.join(root, "package.json"), JSON.stringify({ name: "x" }), "utf8");
    await fs.writeFile(path.join(root, ".cursorrules"), "# cursor\n", "utf8");
    await fs.mkdir(path.join(root, "build"));
    await fs.writeFile(path.join(root, "build", "out.txt"), "g\n", "utf8");

    const code = await runFixCommand({ targetPath: root, yes: false, dryRun: false });
    expect(code).toBe(EXIT_CODES.USAGE_ERROR);
  });

  it("fix on invalid Claude settings exits usage error", async () => {
    const root = await makeTemp();
    await fs.writeFile(path.join(root, "package.json"), JSON.stringify({ name: "x" }), "utf8");
    await fs.writeFile(path.join(root, "CLAUDE.md"), "# Claude\n", "utf8");
    await fs.mkdir(path.join(root, ".claude"));
    await fs.writeFile(path.join(root, ".claude", "settings.json"), "{broken", "utf8");
    await fs.mkdir(path.join(root, "build"));
    await fs.writeFile(path.join(root, "build", "out.txt"), "g\n", "utf8");

    const code = await runFixCommand({ targetPath: root, yes: true, dryRun: false });
    expect(code).toBe(EXIT_CODES.USAGE_ERROR);
  });

  it("fix on garbage Codex config.toml exits usage error (no partial Cursor-only write)", async () => {
    const root = await makeTemp();
    await fs.writeFile(path.join(root, "package.json"), JSON.stringify({ name: "x" }), "utf8");
    await fs.writeFile(path.join(root, "AGENTS.md"), "# agents\n", "utf8");
    await fs.mkdir(path.join(root, ".codex"));
    await fs.writeFile(path.join(root, ".codex", "config.toml"), "[[[not-toml\n", "utf8");
    await fs.mkdir(path.join(root, "build"));
    await fs.writeFile(path.join(root, "build", "out.txt"), "g\n", "utf8");

    const code = await runFixCommand({ targetPath: root, yes: true, dryRun: false });
    expect(code).toBe(EXIT_CODES.USAGE_ERROR);
    await expect(fs.access(path.join(root, ".cursorignore"))).rejects.toThrow();
    const codex = await fs.readFile(path.join(root, ".codex", "config.toml"), "utf8");
    expect(codex).toBe("[[[not-toml\n");
  });

  it("atomic overwrite of existing Fix targets succeeds (Windows-safe rename path)", async () => {
    const root = await makeTemp();
    await fs.writeFile(path.join(root, "package.json"), JSON.stringify({ name: "x" }), "utf8");
    await fs.writeFile(path.join(root, ".cursorrules"), "# cursor\n", "utf8");
    await fs.writeFile(path.join(root, ".cursorignore"), "# keep me\nnode_modules/\n", "utf8");
    await fs.mkdir(path.join(root, "build"));
    await fs.writeFile(path.join(root, "build", "out.txt"), "g\n", "utf8");

    const first = await runFixCommand({ targetPath: root, yes: true, dryRun: false });
    expect(first).toBe(EXIT_CODES.SUCCESS);
    const afterFirst = await fs.readFile(path.join(root, ".cursorignore"), "utf8");
    expect(afterFirst).toContain("node_modules/");
    expect(afterFirst).toContain("build/");

    // Second apply must overwrite the existing file without rename failure.
    const second = await runFixCommand({ targetPath: root, yes: true, dryRun: false });
    expect(second).toBe(EXIT_CODES.SUCCESS);
    const afterSecond = await fs.readFile(path.join(root, ".cursorignore"), "utf8");
    expect(afterSecond).toBe(afterFirst);
  });
});
