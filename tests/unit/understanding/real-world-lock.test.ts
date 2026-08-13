import { describe, expect, it } from "vitest";

import {
  computeExpectationLock,
  withExpectationLock,
} from "../../../validation/real-world/metrics/scoring.js";

describe("real-world expectation locks", () => {
  it("detects silent ground-truth mutation", () => {
    const base = withExpectationLock({
      id: "sample",
      expectationVersion: "1.0.0",
      domains: { required: ["Auth"], forbidden: [] },
      entrypoints: { required: [], forbiddenFrameworks: [] },
      dependencies: { required: [], minCount: 0, characteristic: "sparse" },
      relationships: { required: [], minCount: 0 },
      architectures: { requiredPatterns: [], forbiddenPatterns: [] },
      projectModel: {
        minDomains: 0,
        minEntrypoints: 0,
        minDependencies: 0,
        minRelationships: 0,
        minArchitectures: 0,
      },
      query: { minListDomains: 0, minListEntrypoints: 0 },
      understand: { mustContain: ["Repository"] },
    });

    const mutated = {
      ...base,
      domains: { required: ["Auth", "Users"], forbidden: [] },
    };
    const { expectationLock: _lock, ...body } = mutated;
    void _lock;
    expect(computeExpectationLock(body)).not.toBe(base.expectationLock);
  });
});
