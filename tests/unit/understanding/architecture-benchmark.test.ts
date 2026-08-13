import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { inferArchitectures } from "../../../src/core/understanding/index.js";
import type { ArchitectureInferenceInput } from "../../../src/core/understanding/architecture/types.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.resolve(
  here,
  "../../../fixtures/understanding-architecture-inference/rich-monorepo.json",
);

describe("architecture inference benchmark", () => {
  it("completes rich fixture inference under a CI-friendly budget", () => {
    const input = JSON.parse(fs.readFileSync(fixturePath, "utf8")) as ArchitectureInferenceInput;
    const samples: number[] = [];
    for (let i = 0; i < 5; i += 1) {
      const result = inferArchitectures(input);
      samples.push(result.timingMs);
      expect(result.architectures.length).toBeGreaterThan(0);
    }
    const median = [...samples].sort((a, b) => a - b)[Math.floor(samples.length / 2)] ?? 0;
    expect(median).toBeLessThan(100);
  });
});
