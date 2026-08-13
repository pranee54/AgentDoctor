import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { compareProjectModels } from "../../../src/core/understanding/delta/index.js";
import {
  buildProjectMindSync,
  findMindOwner,
  listMindRisks,
  mindSummary,
} from "../../../src/core/understanding/mind/index.js";
import { buildProjectModel } from "../../../src/core/understanding/model/index.js";
import type { ProjectModelBuilderInput } from "../../../src/core/understanding/model/types.js";
import type { OwnershipDiscoveryResult } from "../../../src/core/understanding/ownership/types.js";
import {
  computeContentHash,
  createSnapshotIdentity,
} from "../../../src/core/understanding/snapshot/index.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.resolve(here, "../../../fixtures/understanding-project-model");

function loadInput(name: string): ProjectModelBuilderInput {
  return JSON.parse(
    fs.readFileSync(path.join(fixtureDir, name), "utf8"),
  ) as ProjectModelBuilderInput;
}

describe("snapshot identity", () => {
  it("produces stable content hashes for identical structure", () => {
    const a = buildProjectModel(loadInput("builder-input.json"));
    const b = buildProjectModel(loadInput("builder-input.json"));
    expect(computeContentHash(a)).toBe(computeContentHash(b));
    expect(createSnapshotIdentity(a).id).toBe(createSnapshotIdentity(b).id);
  });
});

describe("understanding delta", () => {
  it("detects removed domains as invalidated structure", () => {
    const before = buildProjectModel(loadInput("builder-input.json"));
    const afterInput = loadInput("builder-input.json");
    afterInput.domains = {
      ...afterInput.domains,
      domains: afterInput.domains.domains.slice(
        0,
        Math.max(0, afterInput.domains.domains.length - 1),
      ),
    };
    const after = buildProjectModel(afterInput);
    const delta = compareProjectModels(before, after);

    expect(delta.structuralEqual).toBe(false);
    expect(delta.domains.removed.length).toBeGreaterThan(0);
    expect(delta.invalidatedIds.length).toBeGreaterThan(0);
    expect(delta.summary.length).toBeGreaterThan(0);
  });

  it("reports structural equality when models match", () => {
    const before = buildProjectModel(loadInput("builder-input.json"));
    const after = buildProjectModel(loadInput("builder-input.json"));
    const delta = compareProjectModels(before, after);
    expect(delta.structuralEqual).toBe(true);
    expect(delta.summary).toContain("No structural understanding changes");
  });
});

describe("project mind", () => {
  it("builds claims with evidence and preserves unknowns", () => {
    const model = buildProjectModel(loadInput("builder-input.json"));
    const ownership: OwnershipDiscoveryResult = {
      ownerships: [
        {
          path: "/src/",
          owners: ["@platform"],
          confidence: 0.95,
          evidence: [".github/CODEOWNERS:/src/"],
          source: "codeowners",
        },
      ],
      timingMs: 0,
      filesConsidered: 1,
      unknowns: [],
    };
    const mind = buildProjectMindSync(model, ownership);
    expect(mind.snapshot.contentHash.length).toBeGreaterThan(0);
    expect(mind.claims.length).toBeGreaterThan(0);
    expect(mind.claims.every((c) => c.evidence.length > 0)).toBe(true);
    expect(mind.limitations.length).toBeGreaterThan(0);
    expect(listMindRisks(mind).count).toBe(mind.risks.risks.length);
    expect(findMindOwner(mind, "src/app.ts")?.owners).toContain("@platform");
    expect(mindSummary(mind).projectName).toBe(model.metadata.project.name);
  });
});
