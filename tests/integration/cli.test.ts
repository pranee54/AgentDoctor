import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { runScanCommand } from "../../src/cli/commands/scan.js";
import { createProgram } from "../../src/cli/program.js";
import { EXIT_CODES } from "../../src/types/index.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const cleanProject = path.resolve(here, "../../fixtures/clean-project");
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

describe("CLI program", () => {
  it("exposes expected commands", () => {
    const program = createProgram();
    const names = program.commands.map((c) => c.name());
    expect(names).toEqual(expect.arrayContaining(["scan", "fix", "explain", "doctor"]));
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

  it("clean repo with --min-score 99 succeeds", async () => {
    await silenceStdout(async () => {
      const code = await runScanCommand({
        targetPath: cleanProject,
        json: true,
        minScore: 99,
      });
      expect(code).toBe(EXIT_CODES.SUCCESS);
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

  it("--ci alone remains report-only (exit 0)", async () => {
    await silenceStdout(async () => {
      const code = await runScanCommand({
        targetPath: insecureProject,
        json: true,
        ci: true,
      });
      expect(code).toBe(EXIT_CODES.SUCCESS);
    });
  });

  it("no threshold exits 0 even when findings exist", async () => {
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
});
