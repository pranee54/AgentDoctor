import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { scan } from "../../src/index.js";
import { renderJsonReport } from "../../src/reporters/json/report.js";
import { renderTerminalReport } from "../../src/reporters/terminal/report.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixturesRoot = path.resolve(here, "../../fixtures");

describe("scan() agent integration", () => {
  it("clean-project has no configured agents", async () => {
    const result = await scan({ cwd: path.join(fixturesRoot, "clean-project") });
    expect(result.agents.every((a) => !a.configured)).toBe(true);
    expect(result.scoringAvailable).toBe(false);
    expect(result.scores).toBeNull();
  });

  it("cursor-project configures Cursor only", async () => {
    const result = await scan({ cwd: path.join(fixturesRoot, "cursor-project") });
    const cursor = result.agents.find((a) => a.id === "cursor");
    expect(cursor?.configured).toBe(true);
    expect(result.agents.find((a) => a.id === "claude-code")?.configured).toBe(false);
  });

  it("claude-project configures Claude Code", async () => {
    const result = await scan({ cwd: path.join(fixturesRoot, "claude-project") });
    expect(result.agents.find((a) => a.id === "claude-code")?.configured).toBe(true);
  });

  it("codex-project configures Codex", async () => {
    const result = await scan({ cwd: path.join(fixturesRoot, "codex-project") });
    expect(result.agents.find((a) => a.id === "codex")?.configured).toBe(true);
  });

  it("multi-agent-project configures all three", async () => {
    const result = await scan({ cwd: path.join(fixturesRoot, "multi-agent-project") });
    expect(result.agents.filter((a) => a.configured)).toHaveLength(3);
  });

  it("malformed config still succeeds with diagnostics", async () => {
    const result = await scan({ cwd: path.join(fixturesRoot, "malformed-agent-config") });
    expect(result.agents.find((a) => a.id === "claude-code")?.configured).toBe(true);
    expect(
      result.agents
        .find((a) => a.id === "claude-code")
        ?.diagnostics.some((d) => d.code === "claude/malformed-settings"),
    ).toBe(true);
  });

  it("nested configuration is discovered", async () => {
    const result = await scan({ cwd: path.join(fixturesRoot, "nested-agent-config") });
    const codex = result.agents.find((a) => a.id === "codex");
    const claude = result.agents.find((a) => a.id === "claude-code");
    expect(codex?.configPaths.some((p) => p.includes("packages/"))).toBe(true);
    expect(claude?.configPaths.some((p) => p.includes("packages/"))).toBe(true);
  });

  it("terminal report shows configuration status and findings sections", async () => {
    const result = await scan({ cwd: path.join(fixturesRoot, "multi-agent-project") });
    const output = renderTerminalReport(result);
    expect(output).toContain("AI Coding Agents");
    expect(output).toContain("Findings");
    expect(output).toContain("Summary");
    expect(output).not.toMatch(/Cursor\s+\d+\/100/);
    expect(output).not.toContain("Overall Agent Score");
  });

  it("json report includes structured agent detection and summary", async () => {
    const result = await scan({ cwd: path.join(fixturesRoot, "cursor-project") });
    const parsed = JSON.parse(renderJsonReport(result)) as {
      scoringAvailable: boolean;
      scores: unknown;
      summary: { total: number };
      agents: Array<{ id: string; configured: boolean; configFiles: unknown[] }>;
    };
    expect(parsed.scoringAvailable).toBe(false);
    expect(parsed.scores).toBeNull();
    expect(parsed.summary).toBeDefined();
    const cursor = parsed.agents.find((a) => a.id === "cursor");
    expect(cursor?.configured).toBe(true);
    expect(cursor?.configFiles.length).toBeGreaterThan(0);
  });
});
