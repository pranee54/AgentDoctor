import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { classifyEnvBasename } from "../../../src/core/rules/security/env-file-exposure.js";
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

  it("reports a repeated safe-scope Codex MCP server name once", async () => {
    const result = await scan({ cwd: path.join(fixturesRoot, "mcp-duplicate-servers-project") });
    const duplicates = result.findings.filter(
      (finding) => finding.ruleId === "mcp/duplicate-server",
    );

    expect(duplicates).toHaveLength(1);
    expect(duplicates[0]?.severity).toBe("info");
    expect(duplicates[0]?.affectedAgents).toEqual(["codex"]);
    expect(duplicates[0]?.evidence?.path).toBe(".codex/config.toml");
    expect(result.findings).not.toContainEqual(
      expect.objectContaining({ ruleId: "security/mcp-broad-filesystem" }),
    );
  });

  it("does not flag .env.dist and .env.template as findings", async () => {
    const result = await scan({ cwd: path.join(fixturesRoot, "env-dist-template-project") });
    const env = result.findings.filter(
      (finding) => finding.ruleId === "security/env-file-exposure",
    );

    expect(env).toHaveLength(0);
    expect(classifyEnvBasename(".env.dist")).toBe("template");
    expect(classifyEnvBasename(".env.template")).toBe("template");
  });
});
