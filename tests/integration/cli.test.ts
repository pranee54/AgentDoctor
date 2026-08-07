import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";
import os from "node:os";

import { afterEach, describe, expect, it } from "vitest";

import { runScanCommand } from "../../src/cli/commands/scan.js";
import { createProgram } from "../../src/cli/program.js";
import { renderJsonReport } from "../../src/reporters/json/report.js";
import { scan } from "../../src/index.js";
import { EXIT_CODES } from "../../src/types/index.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const cleanProject = path.resolve(here, "../../fixtures/clean-project");
const cleanConfigured = path.resolve(here, "../../fixtures/clean-configured-project");
const multiAgent = path.resolve(here, "../../fixtures/multi-agent-project");
const insecureProject = path.resolve(here, "../../fixtures/insecure-agent-project");

function captureStdout(run: () => Promise<void>): Promise<string> {
  let output = "";
  const original = process.stdout.write.bind(process.stdout);
  process.stdout.write = ((chunk: string | Uint8Array) => {
    output += typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8");
    return true;
  }) as typeof process.stdout.write;
  return run()
    .then(() => output)
    .finally(() => {
      process.stdout.write = original;
    });
}

function silenceStdout(run: () => Promise<void>): Promise<void> {
  return captureStdout(run).then(() => undefined);
}

async function parseCli(argv: string[]): Promise<{ output: string; exitCode: number }> {
  const previousExitCode = process.exitCode;
  process.exitCode = undefined;
  try {
    const output = await captureStdout(async () => {
      const { runCli } = await import("../../src/cli/program.js");
      await runCli(["node", "agentdoctor", ...argv]);
    });
    return { output, exitCode: typeof process.exitCode === "number" ? process.exitCode : 0 };
  } finally {
    process.exitCode = previousExitCode;
  }
}

function expectJsonScanReport(output: string): { findings: unknown[]; scores: unknown } {
  const trimmed = output.trim();
  expect(trimmed.startsWith("{")).toBe(true);
  const parsed = JSON.parse(trimmed) as { findings: unknown[]; scores: unknown };
  expect(Array.isArray(parsed.findings)).toBe(true);
  expect(parsed.scores).not.toBeNull();
  return parsed;
}

describe("CLI program", () => {
  it("exposes expected commands", () => {
    const program = createProgram();
    const names = program.commands.map((c) => c.name());
    expect(names).toEqual(expect.arrayContaining(["scan", "fix", "verify", "explain", "doctor"]));
  });

  it("scan succeeds on fixture", async () => {
    await silenceStdout(async () => {
      const code = await runScanCommand({
        targetPath: cleanProject,
        json: true,
      });
      expect(code).toBe(EXIT_CODES.SUCCESS);
    });
  });

  it("clean configured repo with --min-score 99 succeeds", async () => {
    await silenceStdout(async () => {
      const code = await runScanCommand({
        targetPath: cleanConfigured,
        json: true,
        minScore: 99,
      });
      expect(code).toBe(EXIT_CODES.SUCCESS);
    });
  });

  it("agentless repo with --min-score fails instead of vacuous 100", async () => {
    await silenceStdout(async () => {
      const code = await runScanCommand({
        targetPath: cleanProject,
        json: true,
        minScore: 70,
      });
      expect(code).toBe(EXIT_CODES.ISSUES_OR_THRESHOLD);
    });
  });

  it("repo below --min-score exits with threshold failure", async () => {
    await silenceStdout(async () => {
      const code = await runScanCommand({
        targetPath: insecureProject,
        json: true,
        minScore: 70,
      });
      expect(code).toBe(EXIT_CODES.ISSUES_OR_THRESHOLD);
    });
  });

  it("--ci alone fails on critical findings", async () => {
    await silenceStdout(async () => {
      const code = await runScanCommand({
        targetPath: insecureProject,
        json: true,
        ci: true,
      });
      expect(code).toBe(EXIT_CODES.ISSUES_OR_THRESHOLD);
    });
  });

  it("--ci alone succeeds when no critical findings", async () => {
    await silenceStdout(async () => {
      const code = await runScanCommand({
        targetPath: cleanConfigured,
        json: true,
        ci: true,
      });
      expect(code).toBe(EXIT_CODES.SUCCESS);
    });
  });

  it("scan without --ci stays report-only even with critical findings", async () => {
    await silenceStdout(async () => {
      const code = await runScanCommand({
        targetPath: insecureProject,
        json: true,
      });
      expect(code).toBe(EXIT_CODES.SUCCESS);
    });
  });

  it("JSON report includes populated scores", async () => {
    const output = await captureStdout(async () => {
      const code = await runScanCommand({
        targetPath: cleanProject,
        json: true,
      });
      expect(code).toBe(EXIT_CODES.SUCCESS);
    });
    const parsed = JSON.parse(output) as {
      scoringAvailable: boolean;
      scores: { overall: number; categories: unknown; agents: unknown } | null;
    };
    expect(parsed.scoringAvailable).toBe(true);
    expect(parsed.scores).not.toBeNull();
    expect(parsed.scores?.overall).toBe(100);
    expect(parsed.scores?.categories).toBeDefined();
    expect(parsed.scores?.agents).toBeDefined();
  });

  it("scan succeeds on multi-agent fixture", async () => {
    await silenceStdout(async () => {
      const code = await runScanCommand({
        targetPath: multiAgent,
        json: true,
      });
      expect(code).toBe(EXIT_CODES.SUCCESS);
    });
  });

  it("argv: default path --json emits JSON", async () => {
    const { output, exitCode } = await parseCli([cleanProject, "--json"]);
    expect(exitCode).toBe(EXIT_CODES.SUCCESS);
    expectJsonScanReport(output);
  });

  it("argv: default --json path emits JSON", async () => {
    const { output, exitCode } = await parseCli(["--json", cleanProject]);
    expect(exitCode).toBe(EXIT_CODES.SUCCESS);
    expectJsonScanReport(output);
  });

  it("argv: scan path --json emits JSON", async () => {
    const { output, exitCode } = await parseCli(["scan", cleanProject, "--json"]);
    expect(exitCode).toBe(EXIT_CODES.SUCCESS);
    expectJsonScanReport(output);
  });

  it("argv: scan --json path emits JSON", async () => {
    const { output, exitCode } = await parseCli(["scan", "--json", cleanProject]);
    expect(exitCode).toBe(EXIT_CODES.SUCCESS);
    expectJsonScanReport(output);
  });

  it("argv: scan --json --ci --min-score enforces threshold", async () => {
    const { output, exitCode } = await parseCli([
      "scan",
      insecureProject,
      "--json",
      "--ci",
      "--min-score",
      "70",
    ]);
    expect(exitCode).toBe(EXIT_CODES.ISSUES_OR_THRESHOLD);
    expectJsonScanReport(output);
  });

  it("argv: --fail-on-severity critical fails on insecure fixture", async () => {
    const { output, exitCode } = await parseCli([
      "scan",
      insecureProject,
      "--json",
      "--fail-on-severity",
      "critical",
    ]);
    expect(exitCode).toBe(EXIT_CODES.ISSUES_OR_THRESHOLD);
    const parsed = expectJsonScanReport(output);
    expect(
      (parsed.findings as Array<{ severity: string }>).some((f) => f.severity === "critical"),
    ).toBe(true);
  });

  it("argv: --fail-on-severity critical passes on clean fixture", async () => {
    const { exitCode } = await parseCli([
      "scan",
      cleanProject,
      "--json",
      "--fail-on-severity",
      "critical",
    ]);
    expect(exitCode).toBe(EXIT_CODES.SUCCESS);
  });

  it("argv: --fail-on-rule matches specific rule id", async () => {
    const { exitCode } = await parseCli([
      "scan",
      insecureProject,
      "--json",
      "--fail-on-rule",
      "security/env-file-exposure",
    ]);
    expect(exitCode).toBe(EXIT_CODES.ISSUES_OR_THRESHOLD);
  });

  it("argv: invalid --fail-on-severity is a usage error", async () => {
    const { exitCode } = await parseCli([
      "scan",
      cleanProject,
      "--json",
      "--fail-on-severity",
      "high",
    ]);
    expect(exitCode).toBe(EXIT_CODES.USAGE_ERROR);
  });

  it("argv: invalid --min-score is a usage error (not internal error)", async () => {
    const { exitCode } = await parseCli(["scan", cleanProject, "--json", "--min-score", "999"]);
    expect(exitCode).toBe(EXIT_CODES.USAGE_ERROR);
    expect(exitCode).not.toBe(EXIT_CODES.INTERNAL_ERROR);
  });

  it("argv: scan without --json emits terminal report", async () => {
    const { output, exitCode } = await parseCli(["scan", cleanProject]);
    expect(exitCode).toBe(EXIT_CODES.SUCCESS);
    expect(output.trim().startsWith("{")).toBe(false);
    expect(output).toMatch(/AgentDoctor/i);
  });
});

describe("CLI verify", () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((d) => fs.rm(d, { recursive: true, force: true })));
  });

  async function writeBaseline(findingsFrom: string): Promise<string> {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "agentdoctor-verify-cli-"));
    tempDirs.push(dir);
    const baselinePath = path.join(dir, "agentdoctor-report.json");
    const result = await scan({ cwd: findingsFrom });
    await fs.writeFile(baselinePath, renderJsonReport(result), "utf8");
    return baselinePath;
  }

  it("argv: verify --json reports fixed/remaining/new/summary", async () => {
    const baselinePath = await writeBaseline(insecureProject);
    const { output, exitCode } = await parseCli([
      "verify",
      cleanProject,
      "--json",
      "--baseline",
      baselinePath,
    ]);
    expect(exitCode).toBe(EXIT_CODES.SUCCESS);
    const parsed = JSON.parse(output) as {
      fixed: unknown[];
      remaining: unknown[];
      new: unknown[];
      summary: { fixed: number; remaining: number; new: number; unchanged: number };
    };
    expect(parsed.summary.fixed).toBeGreaterThan(0);
    expect(parsed.summary.remaining).toBe(0);
    expect(parsed.summary.new).toBe(0);
    expect(Array.isArray(parsed.fixed)).toBe(true);
    expect(Array.isArray(parsed.remaining)).toBe(true);
    expect(Array.isArray(parsed.new)).toBe(true);
  });

  it("argv: verify --ci exits 1 when new findings appear", async () => {
    const baselinePath = await writeBaseline(cleanProject);
    const { exitCode, output } = await parseCli([
      "verify",
      insecureProject,
      "--json",
      "--ci",
      "--baseline",
      baselinePath,
    ]);
    expect(exitCode).toBe(EXIT_CODES.ISSUES_OR_THRESHOLD);
    const parsed = JSON.parse(output) as { summary: { new: number } };
    expect(parsed.summary.new).toBeGreaterThan(0);
  });

  it("argv: verify --fail-on-new exits 1 when new findings appear", async () => {
    const baselinePath = await writeBaseline(cleanProject);
    const { exitCode } = await parseCli([
      "verify",
      insecureProject,
      "--json",
      "--fail-on-new",
      "--baseline",
      baselinePath,
    ]);
    expect(exitCode).toBe(EXIT_CODES.ISSUES_OR_THRESHOLD);
  });

  it("argv: verify without baseline exits usage error", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "agentdoctor-verify-empty-"));
    tempDirs.push(dir);
    await fs.writeFile(path.join(dir, "package.json"), "{}\n");
    const { exitCode } = await parseCli(["verify", dir, "--json"]);
    expect(exitCode).toBe(EXIT_CODES.USAGE_ERROR);
  });
});
