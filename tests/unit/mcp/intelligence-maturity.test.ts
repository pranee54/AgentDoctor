import { describe, expect, it } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  INTELLIGENCE_MCP_TOOL_NAMES,
  invokeIntelligenceMcpTool,
  listIntelligenceMcpTools,
} from "../../../src/mcp/intelligence/registry.js";
import { assertSafeRepoTarget } from "../../../src/mcp/intelligence/path-safety.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

describe("intelligence MCP maturity", () => {
  it("registers change/architecture/proof/evidence/graph tools", () => {
    const names = new Set(listIntelligenceMcpTools().map((t) => t.name));
    for (const required of [
      "change_analyze",
      "architecture_check",
      "proof_inspect",
      "evidence_inspect",
      "test_impact",
      "graph_query",
    ]) {
      expect(names.has(required)).toBe(true);
      expect(INTELLIGENCE_MCP_TOOL_NAMES).toContain(required);
    }
  });

  it("graph_query returns structured hits", async () => {
    const { structured, isError } = await invokeIntelligenceMcpTool(repoRoot, "graph_query", {
      query: "scan",
      limit: 5,
    });
    expect(isError).toBe(false);
    expect(structured).toMatchObject({ ok: true });
  }, 60_000);

  it("architecture_check returns ok", async () => {
    const { structured, isError } = await invokeIntelligenceMcpTool(
      repoRoot,
      "architecture_check",
      {},
    );
    expect(isError).toBe(false);
    expect(structured).toMatchObject({ ok: true });
  });

  it("change_analyze rejects path escape on coveragePath", async () => {
    const { structured } = await invokeIntelligenceMcpTool(repoRoot, "change_analyze", {
      coveragePath: "../../etc/passwd",
    });
    expect(structured).toMatchObject({
      ok: false,
      error: { code: "path_escape" },
    });
  });

  it("graph_query rejects malicious path filter", async () => {
    const { structured } = await invokeIntelligenceMcpTool(repoRoot, "graph_query", {
      query: "x",
      path: "/etc/passwd",
    });
    expect(structured).toMatchObject({
      ok: false,
      error: { code: "path_escape" },
    });
  });

  it("proof_inspect / evidence_inspect require ids and reject escapes", async () => {
    const proof = await invokeIntelligenceMcpTool(repoRoot, "proof_inspect", {});
    expect(proof.structured).toMatchObject({
      ok: false,
      error: { code: "invalid_argument" },
    });
    const evidence = await invokeIntelligenceMcpTool(repoRoot, "evidence_inspect", {
      changeId: "../secret",
    });
    expect(evidence.structured).toMatchObject({
      ok: false,
      error: { code: "path_escape" },
    });
  });

  it("assertSafeRepoTarget blocks traversal", () => {
    expect(() => assertSafeRepoTarget(repoRoot, "../../../etc/passwd")).toThrow(/escape/i);
  });
});
