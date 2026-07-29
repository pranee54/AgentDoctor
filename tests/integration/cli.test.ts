import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { runScanCommand } from "../../src/cli/commands/scan.js";
import { createProgram } from "../../src/cli/program.js";
import { EXIT_CODES } from "../../src/types/index.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const cleanProject = path.resolve(here, "../../fixtures/clean-project");
const multiAgent = path.resolve(here, "../../fixtures/multi-agent-project");

function silenceStdout(run: () => Promise<void>): Promise<void> {
  const original = process.stdout.write.bind(process.stdout);
  process.stdout.write = (() => true) as typeof process.stdout.write;
  return run().finally(() => {
    process.stdout.write = original;
  });
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

  it("min-score is ignored while scoring is unavailable", async () => {
    await silenceStdout(async () => {
      const code = await runScanCommand({
        targetPath: cleanProject,
        json: true,
        ci: true,
        minScore: 99,
      });
      expect(code).toBe(EXIT_CODES.SUCCESS);
    });
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
