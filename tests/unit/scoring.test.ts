import { describe, expect, it } from "vitest";

import { computePlaceholderScores } from "../../src/core/scoring/placeholder.js";

describe("computePlaceholderScores", () => {
  it("returns scores between 0 and 100", () => {
    const scores = computePlaceholderScores(10);
    expect(scores.overall).toBeGreaterThanOrEqual(0);
    expect(scores.overall).toBeLessThanOrEqual(100);
    expect(scores.categories.security).toBeGreaterThanOrEqual(0);
    expect(scores.categories.security).toBeLessThanOrEqual(100);
    expect(scores.agents.cursor).toBeGreaterThanOrEqual(0);
    expect(scores.agents.cursor).toBeLessThanOrEqual(100);
  });

  it("is deterministic", () => {
    expect(computePlaceholderScores(50)).toEqual(computePlaceholderScores(50));
  });

  it("does not award a perfect 100 for a typical clean repo", () => {
    const scores = computePlaceholderScores(20);
    expect(scores.overall).toBeLessThan(100);
  });

  it("increases slightly with more files, with a cap", () => {
    const small = computePlaceholderScores(1);
    const large = computePlaceholderScores(10_000);
    expect(large.overall).toBeGreaterThanOrEqual(small.overall);
    expect(large.overall).toBeLessThanOrEqual(80);
  });
});
