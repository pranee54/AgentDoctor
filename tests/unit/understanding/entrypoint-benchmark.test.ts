import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { discoverEntrypoints } from "../../../src/core/understanding/index.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtureRoot = path.resolve(here, "../../../fixtures/understanding-entrypoints-project");

describe("entrypoint discovery benchmark", () => {
  it("completes the monorepo fixture under a CI-friendly budget", async () => {
    const samples: number[] = [];
    for (let i = 0; i < 3; i += 1) {
      const result = await discoverEntrypoints({ cwd: fixtureRoot });
      samples.push(result.timingMs);
      expect(result.entrypoints.length).toBeGreaterThan(0);
    }
    const median = [...samples].sort((a, b) => a - b)[Math.floor(samples.length / 2)] ?? 0;
    expect(median).toBeLessThan(1500);
  });
});
