import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { buildProjectModel } from "../../../src/core/understanding/model/index.js";
import type { ProjectModelBuilderInput } from "../../../src/core/understanding/model/types.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.resolve(
  here,
  "../../../fixtures/understanding-project-model/builder-input.json",
);

describe("project model benchmark", () => {
  it("builds the rich fixture under a CI-friendly budget", () => {
    const input = JSON.parse(fs.readFileSync(fixturePath, "utf8")) as ProjectModelBuilderInput;
    const samples: number[] = [];
    for (let i = 0; i < 5; i += 1) {
      const started = performance.now();
      const model = buildProjectModel(input);
      samples.push(Math.round(performance.now() - started));
      expect(model.architectures.length).toBeGreaterThan(0);
    }
    const median = [...samples].sort((a, b) => a - b)[Math.floor(samples.length / 2)] ?? 0;
    expect(median).toBeLessThan(50);
  });
});
