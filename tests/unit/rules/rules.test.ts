import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { scan } from "../../../src/index.js";
import { ruleRegistry } from "../../../src/core/rules/registry.js";
import { dedupeFindings } from "../../../src/core/rules/dedupe.js";
import type { FindingDraft } from "../../../src/core/rules/types.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixturesRoot = path.resolve(here, "../../../fixtures");

describe("rule registry", () => {
  it("registers unique stable rule IDs", () => {
    const ids = ruleRegistry.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => id.includes("/"))).toBe(true);
  });
});

describe("finding deduplication", () => {
  it("merges same rule+path across agents", () => {
    const drafts: FindingDraft[] = [
      {
        ruleId: "instructions/empty-instructions",
        category: "instructions",
        severity: "warning",
        title: "Empty agent instruction file",
        message: "AGENTS.md exists but is empty",
        whyItMatters: "why",
        affectedAgents: ["cursor"],
        evidence: { path: "AGENTS.md" },
        fixability: "review",
      },
      {
        ruleId: "instructions/empty-instructions",
        category: "instructions",
        severity: "warning",
        title: "Empty agent instruction file",
        message: "AGENTS.md exists but is empty",
        whyItMatters: "why",
        affectedAgents: ["codex"],
        evidence: { path: "AGENTS.md" },
        fixability: "review",
      },
    ];

    const findings = dedupeFindings(drafts);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.affectedAgents).toEqual(["codex", "cursor"]);
    expect(findings[0]?.id).toBe("instructions/empty-instructions:AGENTS.md");
  });
});

describe("security rules", () => {
  it("flags .env and private key in insecure-agent-project", async () => {
    const result = await scan({ cwd: path.join(fixturesRoot, "insecure-agent-project") });
    const ruleIds = result.findings.map((f) => f.ruleId);
    expect(ruleIds).toContain("security/env-file-exposure");
    expect(ruleIds).toContain("security/private-key-file");
    expect(ruleIds).toContain("security/claude-bypass-permissions");

    const envFinding = result.findings.find((f) => f.ruleId === "security/env-file-exposure");
    expect(JSON.stringify(result)).not.toContain("FAKE_TEST_CREDENTIAL_DO_NOT_USE");
    expect(envFinding?.evidence?.path).toMatch(/^\.env/);
    // Cursor default-ignores .env* — should not require Cursor in affected list
    expect(envFinding?.affectedAgents).not.toContain("cursor");
  });

  it("does not flag .env for Claude when Read deny exists", async () => {
    const result = await scan({ cwd: path.join(fixturesRoot, "env-excluded-project") });
    const envFindings = result.findings.filter((f) => f.ruleId === "security/env-file-exposure");
    expect(envFindings.every((f) => !f.affectedAgents.includes("claude-code"))).toBe(true);
  });

  it("flags broad MCP filesystem scope", async () => {
    const result = await scan({ cwd: path.join(fixturesRoot, "mcp-project") });
    expect(result.findings.some((f) => f.ruleId === "security/mcp-broad-filesystem")).toBe(true);
    // Must not leak env values
    expect(JSON.stringify(result.findings)).not.toMatch(/sk-|secret_value/i);
  });
});

describe("context and instruction rules", () => {
  it("flags large instruction files", async () => {
    const result = await scan({ cwd: path.join(fixturesRoot, "context-heavy-project") });
    expect(result.findings.some((f) => f.ruleId === "context/large-instruction-file")).toBe(true);
    expect(result.findings.some((f) => f.ruleId === "context/large-log-file")).toBe(true);
  });

  it("flags duplicate instructions as info", async () => {
    const result = await scan({
      cwd: path.join(fixturesRoot, "duplicate-instructions-project"),
    });
    const dup = result.findings.find((f) => f.ruleId === "instructions/duplicate-content");
    expect(dup?.severity).toBe("info");
    expect(dup?.affectedAgents.length).toBeGreaterThan(0);
  });

  it("flags missing path references", async () => {
    const result = await scan({ cwd: path.join(fixturesRoot, "broken-path-project") });
    expect(result.findings.some((f) => f.ruleId === "instructions/missing-path-reference")).toBe(
      true,
    );
  });

  it("flags empty instructions once for AGENTS.md across agents", async () => {
    const result = await scan({ cwd: path.join(fixturesRoot, "empty-agent-config") });
    const emptyAgents = result.findings.filter(
      (f) => f.ruleId === "instructions/empty-instructions" && f.evidence?.path === "AGENTS.md",
    );
    expect(emptyAgents.length).toBe(1);
    expect(emptyAgents[0]?.affectedAgents).toEqual(expect.arrayContaining(["cursor", "codex"]));
  });
});

describe("mcp rules", () => {
  it("flags malformed MCP config without crashing", async () => {
    const result = await scan({ cwd: path.join(fixturesRoot, "malformed-mcp-project") });
    expect(result.findings.some((f) => f.ruleId === "mcp/malformed-config")).toBe(true);
    expect(result.scoringAvailable).toBe(true);
    expect(result.scores).not.toBeNull();
    expect(result.scores?.overall).toBeGreaterThanOrEqual(0);
    expect(result.scores?.overall).toBeLessThanOrEqual(100);
  });

  it("parses safe MCP scope without false broad finding for repo-relative path", async () => {
    const result = await scan({ cwd: path.join(fixturesRoot, "mcp-project") });
    const broad = result.findings.filter((f) => f.ruleId === "security/mcp-broad-filesystem");
    // Only "/" should be flagged, not "."
    expect(broad.every((f) => f.evidence?.detail?.includes("scope=/"))).toBe(true);
  });
});

describe("clean configured project", () => {
  it("produces no critical findings", async () => {
    const result = await scan({ cwd: path.join(fixturesRoot, "clean-configured-project") });
    expect(result.summary.critical).toBe(0);
    expect(result.agents.filter((a) => a.configured).length).toBeGreaterThanOrEqual(2);
  });
});
