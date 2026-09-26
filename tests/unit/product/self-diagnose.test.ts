import path from "node:path";
import { describe, expect, it } from "vitest";

import { diagnoseAgentDoctorSelf } from "../../../src/product/self/diagnose.js";

describe("self diagnose", () => {
  it("verifies AgentDoctor repo modules", async () => {
    const root = path.resolve(import.meta.dirname, "../../..");
    const report = await diagnoseAgentDoctorSelf(root);
    expect(report.ok).toBe(true);
    expect(report.findings.some((f) => f.id === "tests-dir" && f.ok)).toBe(true);
  }, 60_000);
});
