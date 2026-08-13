import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { buildProjectModel } from "../../../src/core/understanding/model/index.js";
import type { ProjectModelBuilderInput } from "../../../src/core/understanding/model/types.js";
import { discoverRisks } from "../../../src/core/understanding/risks/index.js";
import type { OwnershipDiscoveryResult } from "../../../src/core/understanding/ownership/types.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.resolve(here, "../../../fixtures/understanding-project-model");

function loadInput(name: string): ProjectModelBuilderInput {
  return JSON.parse(
    fs.readFileSync(path.join(fixtureDir, name), "utf8"),
  ) as ProjectModelBuilderInput;
}

describe("discoverRisks", () => {
  it("emits entrypoint and architecture-conflict risks with evidence", () => {
    const model = buildProjectModel(loadInput("builder-input.json"));
    const ownership: OwnershipDiscoveryResult = {
      ownerships: [],
      timingMs: 0,
      filesConsidered: 0,
      unknowns: ["No explicit ownership evidence found"],
    };
    const result = discoverRisks(model, ownership, {
      centralityThreshold: 1,
      couplingThreshold: 1,
    });

    expect(result.risks.some((r) => r.kind === "critical-entrypoint")).toBe(true);
    expect(result.risks.every((r) => r.evidence.length > 0)).toBe(true);
    expect(result.risks.every((r) => r.confidence > 0 && r.confidence <= 1)).toBe(true);
    expect(result.risks.some((r) => r.kind === "unclear-ownership")).toBe(true);
  });
});
