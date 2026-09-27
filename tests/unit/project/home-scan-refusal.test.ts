import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { runScanCommand } from "../../../src/cli/commands/scan.js";
import { runDnaCommand } from "../../../src/cli/commands/start.js";
import { runProductCommand } from "../../../src/cli/commands/product.js";
import { runGraphSurfaceCommand } from "../../../src/cli/commands/policy-graph-run.js";
import { runDashboardCommand } from "../../../src/cli/commands/v2.js";
import { classifyBroadUserScanRoot } from "../../../src/product/discovery/roots.js";
import { resolveCliProjectRoot } from "../../../src/cli/safe-root.js";
import { EXIT_CODES } from "../../../src/types/index.js";

describe("broad user-root scan refusal", () => {
  it("classifies home / Desktop / Downloads / Documents as blocked", () => {
    const home = "/Users/example";
    expect(classifyBroadUserScanRoot(home, home).blocked).toBe(true);
    expect(classifyBroadUserScanRoot(path.join(home, "Desktop"), home).blocked).toBe(true);
    expect(classifyBroadUserScanRoot(path.join(home, "Downloads"), home).blocked).toBe(true);
    expect(classifyBroadUserScanRoot(path.join(home, "Documents"), home).blocked).toBe(true);
    expect(classifyBroadUserScanRoot(path.join(home, "code", "app"), home).blocked).toBe(false);
  });

  it("runScanCommand refuses os.homedir() quickly without walking the tree", async () => {
    const home = os.homedir();
    const started = Date.now();
    const code = await runScanCommand({ targetPath: home, json: true });
    const elapsed = Date.now() - started;
    expect(code).toBe(EXIT_CODES.USAGE_ERROR);
    expect(elapsed).toBeLessThan(5_000);
  }, 10_000);

  it("dna / map / graph / dashboard / resolveCliProjectRoot refuse home", async () => {
    const home = os.homedir();
    const started = Date.now();
    expect((await resolveCliProjectRoot(home)).ok).toBe(false);
    expect(await runDnaCommand({ root: home, json: true })).toBe(EXIT_CODES.USAGE_ERROR);
    expect(await runProductCommand({ action: "map", root: home, json: true })).toBe(
      EXIT_CODES.USAGE_ERROR,
    );
    expect(await runGraphSurfaceCommand({ action: "status", root: home, json: true })).toBe(
      EXIT_CODES.USAGE_ERROR,
    );
    expect(await runDashboardCommand({ root: home, port: 19999 })).toBe(EXIT_CODES.USAGE_ERROR);
    expect(Date.now() - started).toBeLessThan(8_000);
  }, 15_000);
});
