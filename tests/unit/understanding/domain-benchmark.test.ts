import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { discoverDomains } from "../../../src/core/understanding/index.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtureRoot = path.resolve(here, "../../../fixtures/understanding-domains-project");

describe("domain discovery benchmark", () => {
  it("completes the small fixture under a tight budget", async () => {
    const samples: number[] = [];
    for (let i = 0; i < 5; i += 1) {
      const result = await discoverDomains({ cwd: fixtureRoot });
      samples.push(result.timingMs);
      expect(result.domains.length).toBeGreaterThan(0);
    }
    const median = [...samples].sort((a, b) => a - b)[Math.floor(samples.length / 2)] ?? 0;
    // Heuristic walk of a tiny fixture should stay well under 500ms even on slow CI.
    expect(median).toBeLessThan(500);
  });
});
