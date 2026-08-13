import { describe, expect, it } from "vitest";

import {
  confidenceDistribution,
  scoreFromMetrics,
  scoreRequiredForbidden,
} from "../../../validation/software-understanding/metrics/scoring.js";

describe("understanding validation metrics", () => {
  it("scores required/forbidden sets with precision and recall", () => {
    const metrics = scoreRequiredForbidden(["Payments", "Auth"], ["Admin"], ["Payments", "Admin"]);
    expect(metrics.truePositives).toBe(1);
    expect(metrics.falseNegatives).toBe(1);
    expect(metrics.falsePositives).toBe(1);
    expect(metrics.precision).toBe(0.5);
    expect(metrics.recall).toBe(0.5);
    expect(scoreFromMetrics(metrics)).toBe(50);
  });

  it("builds confidence distribution deterministically", () => {
    const dist = confidenceDistribution([0.9, 0.8, 1.0]);
    expect(dist.count).toBe(3);
    expect(dist.min).toBe(0.8);
    expect(dist.max).toBe(1);
    expect(dist.p50).toBe(0.9);
  });
});
