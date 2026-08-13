import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { parseProjectModel } from "../../../src/core/understanding/model/index.js";
import { createQueryEngine } from "../../../src/core/understanding/query/index.js";
import { createUnderstandService } from "../../../src/core/understanding/understand/index.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const modelPath = path.resolve(
  here,
  "../../../fixtures/understanding-understand/project-model.json",
);

describe("understand service benchmark", () => {
  it("completes rich-fixture summarize under a CI-friendly budget", () => {
    const model = parseProjectModel(fs.readFileSync(modelPath, "utf8"));
    const engine = createQueryEngine(model);
    const service = createUnderstandService(engine);

    const samples: number[] = [];
    for (let i = 0; i < 5; i += 1) {
      const result = service.summarize();
      samples.push(result.executionTimeMs);
      expect(result.text.length).toBeGreaterThan(0);
    }
    const median = [...samples].sort((a, b) => a - b)[Math.floor(samples.length / 2)] ?? 0;
    expect(median).toBeLessThan(25);
  });
});
