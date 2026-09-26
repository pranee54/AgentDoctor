import path from "node:path";
import { describe, expect, it } from "vitest";

import { diagnoseAgentDoctorSelf } from "../../src/product/self/diagnose.js";

describe("E2E self-check on AgentDoctor repo", () => {
  it("runs self diagnosis within timeout", async () => {
    const root = path.resolve(process.cwd());
    const report = await diagnoseAgentDoctorSelf(root);
    expect(report.root).toBe(root);
    expect(Array.isArray(report.findings)).toBe(true);
  }, 60_000);
});
