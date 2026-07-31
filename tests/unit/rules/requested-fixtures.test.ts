import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { scan } from "../../../src/index.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixturesRoot = path.resolve(here, "../../../fixtures");

describe("coding-agent edge-case fixtures", () => {
  it("reports a Cursor filesystem server scoped to home", async () => {
    const result = await scan({ cwd: path.join(fixturesRoot, "mcp-home-scope-project") });
    const findings = result.findings.filter(
      (finding) => finding.ruleId === "security/mcp-broad-filesystem",
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("critical");
    expect(findings[0]?.affectedAgents).toEqual(["cursor"]);
    expect(findings[0]?.evidence).toMatchObject({
      path: ".cursor/mcp.json",
      detail: expect.stringContaining("scope=~"),
    });
  });

  it("reports a repeated safe-scope MCP server name once", async () => {
    const result = await scan({ cwd: path.join(fixturesRoot, "mcp-duplicate-servers-project") });
    const duplicates = result.findings.filter(
      (finding) => finding.ruleId === "mcp/duplicate-server",
    );

    expect(duplicates).toHaveLength(1);
    expect(duplicates[0]?.severity).toBe("info");
    expect(duplicates[0]?.evidence?.path).toBe(".cursor/mcp.json");
    expect(result.findings).not.toContainEqual(
      expect.objectContaining({ ruleId: "security/mcp-broad-filesystem" }),
    );
  });

  it("classifies .env.dist and .env.template as agent-neutral templates", async () => {
    const result = await scan({ cwd: path.join(fixturesRoot, "env-dist-template-project") });
    const templates = result.findings.filter(
      (finding) => finding.ruleId === "security/env-file-exposure",
    );

    expect(templates).toHaveLength(2);
    expect(templates.map((finding) => finding.evidence?.path).sort()).toEqual([
      ".env.dist",
      ".env.template",
    ]);
    expect(templates.every((finding) => finding.severity === "info")).toBe(true);
    expect(templates.every((finding) => finding.affectedAgents.length === 0)).toBe(true);
  });
});
