/**
 * CLI matrix: enumerate commands from --help and probe home refusal + help exits.
 */
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { resolveCliProjectRoot } from "../../../src/cli/safe-root.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../..");
const cliPath = path.join(repoRoot, "dist/cli/index.js");

function runCli(
  args: string[],
  timeoutMs = 15_000,
): {
  status: number | null;
  stdout: string;
  stderr: string;
  ms: number;
  signal: string | null;
} {
  const started = Date.now();
  const r = spawnSync(process.execPath, [cliPath, ...args], {
    encoding: "utf8",
    timeout: timeoutMs,
    env: { ...process.env, NO_COLOR: "1" },
  });
  return {
    status: r.status,
    stdout: r.stdout ?? "",
    stderr: r.stderr ?? "",
    ms: Date.now() - started,
    signal: r.signal,
  };
}

/** Commander lists commands as `  name ...` — do not treat wrapped description words as commands. */
function parseTopLevelCommands(helpText: string): string[] {
  const after = helpText.split(/\nCommands:\n/i)[1] ?? "";
  const end = after.search(/\n\n|\nOptions:|\nArguments:/);
  const block = end >= 0 ? after.slice(0, end) : after;
  const cmds: string[] = [];
  for (const line of block.split("\n")) {
    const m = line.match(/^ {2}([a-z][a-z0-9-]*)\b/);
    if (m?.[1] && m[1] !== "help") cmds.push(m[1]);
  }
  return [...new Set(cmds)];
}

describe("CLI exhaustive matrix (help + home refusal)", () => {
  it("enumerates commands and verifies --help; home refused with non-zero exit", async () => {
    const top = runCli(["--help"]);
    expect(top.status).toBe(0);
    expect(top.stdout).toMatch(/Usage:/i);

    const version = runCli(["--version"]);
    expect(version.status).toBe(0);
    expect(version.stdout.trim()).toBe("3.0.1");

    const commands = parseTopLevelCommands(top.stdout);
    expect(commands.length).toBeGreaterThan(40);
    expect(commands.length).toBeLessThan(120);
    expect(commands).toEqual(expect.arrayContaining(["scan", "dna", "map", "graph", "dashboard"]));
    // Wrapped description words must never be treated as commands
    expect(commands).not.toEqual(
      expect.arrayContaining(["configuration", "artifacts", "enterprise"]),
    );

    for (const cmd of commands) {
      const h = runCli([cmd, "--help"], 12_000);
      expect(h.signal, `${cmd} --help hung`).not.toBe("SIGTERM");
      expect(h.ms, `${cmd} --help hung`).toBeLessThan(12_000);
      expect(
        h.status === 0 || `${h.stdout}\n${h.stderr}`.toLowerCase().includes("usage"),
        `${cmd} --help failed: status=${h.status}`,
      ).toBe(true);
    }

    const home = os.homedir();
    expect((await resolveCliProjectRoot(home)).ok).toBe(false);

    const probes: string[][] = [
      ["scan", home],
      ["verify", home],
      ["fix", home],
      ["dna", home],
      ["map", home],
      ["graph", "status", home],
      ["brain", "status", home],
      ["security-doctor", home],
    ];
    for (const args of probes) {
      const r = runCli(args, 8_000);
      expect(r.ms, `${args.join(" ")} hung`).toBeLessThan(8_000);
      expect(r.status, `${args.join(" ")}: ${r.stderr}`).toBe(2);
      expect(`${r.stderr}\n${r.stdout}`).toMatch(/refus|home|Desktop|Documents|Downloads/i);
    }
  }, 240_000);
});
