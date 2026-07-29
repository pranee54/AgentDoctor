import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { classifyEnvBasename } from "../../../src/core/rules/security/env-file-exposure.js";
import { scan } from "../../../src/index.js";
import { renderJsonReport } from "../../../src/reporters/json/report.js";
import { renderTerminalReport } from "../../../src/reporters/terminal/report.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixturesRoot = path.resolve(here, "../../../fixtures");

describe("classifyEnvBasename", () => {
  it("classifies runtime, template, and backup basenames", () => {
    expect(classifyEnvBasename(".env")).toBe("runtime");
    expect(classifyEnvBasename(".env.local")).toBe("runtime");
    expect(classifyEnvBasename(".env.example")).toBe("template");
    expect(classifyEnvBasename(".env.sample")).toBe("template");
    expect(classifyEnvBasename(".env.template")).toBe("template");
    expect(classifyEnvBasename(".env.dist")).toBe("template");
    expect(classifyEnvBasename(".env_backup")).toBe("backup");
    expect(classifyEnvBasename(".env_old")).toBe("backup");
    expect(classifyEnvBasename(".env_local")).toBe("backup");
    expect(classifyEnvBasename(".environment")).toBeNull();
    expect(classifyEnvBasename("env")).toBeNull();
  });
});

describe("security semantics: agents vs repository risk", () => {
  it("no agents + clean repository → limited analysis, no security findings", async () => {
    const result = await scan({ cwd: path.join(fixturesRoot, "clean-project") });
    expect(result.agentSecurityAnalysis).toBe("limited");
    expect(result.findings.filter((f) => f.category === "security")).toHaveLength(0);
    expect(result.diagnostics.warnings.some((w) => w.includes("agent-specific security"))).toBe(
      true,
    );

    const terminal = renderTerminalReport(result);
    expect(terminal).toContain("agent-specific security exposure checks are limited");
    expect(terminal).toContain("No agent-configuration findings");
    expect(terminal).not.toContain("No findings");

    const json = JSON.parse(renderJsonReport(result));
    expect(json.agentSecurityAnalysis).toBe("limited");
  });

  it("no agents + .env → repository-risk finding with empty affectedAgents", async () => {
    const result = await scan({ cwd: path.join(fixturesRoot, "no-agents-env") });
    expect(result.agentSecurityAnalysis).toBe("limited");
    const env = result.findings.filter((f) => f.ruleId === "security/env-file-exposure");
    expect(env).toHaveLength(1);
    expect(env[0]?.severity).toBe("critical");
    expect(env[0]?.affectedAgents).toEqual([]);
    expect(env[0]?.evidence?.detail).toBe("runtime-no-agent");
    expect(JSON.stringify(result)).not.toContain("FAKE_TEST_CREDENTIAL_DO_NOT_USE");

    const terminal = renderTerminalReport(result);
    expect(terminal).toContain("agent-specific security exposure checks are limited");
    expect(terminal).toContain("Sensitive environment file present in repository");
  });

  it("configured Cursor + .env excluded → no Cursor exposure finding", async () => {
    const result = await scan({ cwd: path.join(fixturesRoot, "cursor-env-excluded") });
    expect(result.agentSecurityAnalysis).toBe("full");
    const env = result.findings.filter((f) => f.ruleId === "security/env-file-exposure");
    expect(env.every((f) => !f.affectedAgents.includes("cursor"))).toBe(true);
    expect(env).toHaveLength(0);
  });

  it("configured Codex + .env → Codex exposure finding", async () => {
    const result = await scan({ cwd: path.join(fixturesRoot, "codex-env-project") });
    expect(result.agentSecurityAnalysis).toBe("full");
    const env = result.findings.find((f) => f.ruleId === "security/env-file-exposure");
    expect(env?.severity).toBe("critical");
    expect(env?.affectedAgents).toEqual(["codex"]);
    expect(env?.evidence?.path).toBe(".env");
  });

  it("multiple agents with different exposure → only non-excluded agents listed", async () => {
    const result = await scan({ cwd: path.join(fixturesRoot, "multi-agent-env-exposure") });
    const env = result.findings.find((f) => f.ruleId === "security/env-file-exposure");
    expect(env?.affectedAgents).toEqual(["codex"]);
    expect(env?.affectedAgents).not.toContain("cursor");
  });

  it("templates are info; backups are warning; runtime is critical for Codex", async () => {
    const result = await scan({ cwd: path.join(fixturesRoot, "env-template-codex") });
    const byPath = Object.fromEntries(
      result.findings
        .filter((f) => f.ruleId === "security/env-file-exposure")
        .map((f) => [f.evidence?.path, f]),
    );
    expect(byPath[".env"]?.severity).toBe("critical");
    expect(byPath[".env"]?.affectedAgents).toContain("codex");
    expect(byPath[".env.example"]?.severity).toBe("info");
    expect(byPath[".env.example"]?.affectedAgents).toEqual([]);
    expect(byPath[".env.sample"]?.severity).toBe("info");
    expect(byPath[".env_backup"]?.severity).toBe("warning");
    expect(byPath[".env_backup"]?.affectedAgents).toContain("codex");
  });
});
