import { describe, expect, it } from "vitest";

import { evaluateApprovalRecord } from "../../../src/product/approval/model.js";

describe("approval record model", () => {
  it("denies when approvedByHuman is false", () => {
    const result = evaluateApprovalRecord({
      record: {
        action: "edit",
        reason: "test",
        resources: ["src/a.ts"],
        risk: "MEDIUM",
      },
      approvedByHuman: false,
    });
    expect(result.allowed).toBe(false);
    expect(result.record.state).toBe("pending");
  });

  it("allows when approvedByHuman is true from trusted layer", () => {
    const result = evaluateApprovalRecord({
      record: {
        action: "edit",
        reason: "human ok",
        resources: ["src/a.ts"],
        risk: "MEDIUM",
      },
      approvedByHuman: true,
      actor: "cli-user",
    });
    expect(result.allowed).toBe(true);
    expect(result.record.approvedByHuman).toBe(true);
    expect(result.record.state).toBe("approved");
  });
});
