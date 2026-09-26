import path from "node:path";
import { describe, expect, it } from "vitest";

import { runEvalLab } from "../../../src/product/eval/lab.js";

describe("eval lab", () => {
  it("passes minimal-ts fixture checks", async () => {
    const agentRoot = path.resolve(import.meta.dirname, "../../..");
    const report = await runEvalLab(agentRoot);
    expect(report.checks.length).toBeGreaterThan(0);
    expect(report.passed).toBe(true);
  });
});
