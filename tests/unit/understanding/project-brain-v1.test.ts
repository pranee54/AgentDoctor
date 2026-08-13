import fs from "node:fs";
import fsPromises from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import {
  applyClaimLifecycle,
  buildBrainDelta,
  buildClaim,
  buildProjectBrain,
  createBrainQueryEngine,
  explainClaim,
  LocalBrainStore,
  parseBrainDelta,
  serializeBrainDelta,
  traceBrain,
} from "../../../src/core/understanding/brain/index.js";
import { buildProjectModel } from "../../../src/core/understanding/model/index.js";
import type { ProjectModelBuilderInput } from "../../../src/core/understanding/model/types.js";
import type { OwnershipDiscoveryResult } from "../../../src/core/understanding/ownership/types.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.resolve(here, "../../../fixtures/understanding-project-model");

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((d) => fsPromises.rm(d, { recursive: true, force: true })),
  );
});

function loadInput(name: string): ProjectModelBuilderInput {
  return JSON.parse(
    fs.readFileSync(path.join(fixtureDir, name), "utf8"),
  ) as ProjectModelBuilderInput;
}

function ownershipFixture(): OwnershipDiscoveryResult {
  return {
    ownerships: [
      {
        path: "/src/",
        owners: ["@platform"],
        confidence: 0.95,
        evidence: [".github/CODEOWNERS:/src/"],
        source: "codeowners",
      },
      {
        path: "/src/",
        owners: ["@other"],
        confidence: 0.9,
        evidence: ["CODEOWNERS:/src/"],
        source: "codeowners",
      },
    ],
    timingMs: 0,
    filesConsidered: 1,
    unknowns: [],
  };
}

describe("Project Brain V1", () => {
  it("builds durable brain with typed evidence, claims, components, contradictions", async () => {
    const model = buildProjectModel(loadInput("builder-input.json"));
    const brain = await buildProjectBrain(model, { ownership: ownershipFixture() });

    expect(brain.metadata.schemaVersion).toBe("1.0.0");
    expect(brain.evidence.length).toBeGreaterThan(0);
    expect(brain.claims.length).toBeGreaterThan(0);
    expect(brain.components.length).toBeGreaterThan(0);
    expect(brain.confidenceContract.range).toEqual([0, 1]);
    expect(brain.claims.every((c) => c.status === "ACTIVE" || c.status === "CONTRADICTED")).toBe(
      true,
    );
    expect(
      brain.claims.filter((c) => c.status === "ACTIVE").every((c) => c.evidenceIds.length > 0),
    ).toBe(true);
    // ownership contradiction (@platform vs @other on same path/predicate)
    expect(brain.contradictions.length).toBeGreaterThan(0);
    expect(brain.evidence.every((e) => e.redaction !== undefined)).toBe(true);
  });

  it("persists brain across restart and returns same query results", async () => {
    const dir = await fsPromises.mkdtemp(path.join(os.tmpdir(), "brain-store-"));
    tempDirs.push(dir);
    const model = buildProjectModel(loadInput("builder-input.json"));
    const brain = await buildProjectBrain(model, { ownership: ownershipFixture() });

    const store = new LocalBrainStore(dir);
    await store.saveSnapshot(brain);
    const latestId = await store.latestSnapshotId();
    expect(latestId).toBe(brain.snapshot.id);

    // Simulate process restart: new store instance
    const store2 = new LocalBrainStore(dir);
    const loaded = await store2.loadLatest();
    expect(loaded).not.toBeNull();
    expect(loaded!.snapshot.id).toBe(brain.snapshot.id);
    expect(loaded!.metadata.brainId).toBe(brain.metadata.brainId);

    const q1 = createBrainQueryEngine(brain).execute({ type: "ProjectSummary" });
    const q2 = createBrainQueryEngine(loaded!).execute({ type: "ProjectSummary" });
    expect(q2.result).toEqual(q1.result);
    expect(q2.snapshotId).toBe(q1.snapshotId);

    const listed = await store2.listSnapshots();
    expect(listed.some((s) => s.id === brain.snapshot.id)).toBe(true);
  });

  it("refuses silent overwrite of divergent historical snapshot", async () => {
    const dir = await fsPromises.mkdtemp(path.join(os.tmpdir(), "brain-store-"));
    tempDirs.push(dir);
    const model = buildProjectModel(loadInput("builder-input.json"));
    const brain = await buildProjectBrain(model, { ownership: ownershipFixture() });
    const store = new LocalBrainStore(dir);
    await store.saveSnapshot(brain);

    const mutated = {
      ...brain,
      metadata: { ...brain.metadata, projectName: "mutated-name" },
    };
    await expect(store.saveSnapshot(mutated)).rejects.toThrow(/refusing overwrite/);
  });

  it("updates claim lifecycle on rebuild (invalidation is stateful)", async () => {
    const model = buildProjectModel(loadInput("builder-input.json"));
    const first = await buildProjectBrain(model, { ownership: ownershipFixture() });

    const shrunk = loadInput("builder-input.json");
    shrunk.domains = {
      ...shrunk.domains,
      domains: shrunk.domains.domains.slice(0, Math.max(0, shrunk.domains.domains.length - 1)),
    };
    const model2 = buildProjectModel(shrunk);
    const second = await buildProjectBrain(model2, {
      ownership: ownershipFixture(),
      previousClaims: first.claims,
    });

    expect(second.claims.some((c) => c.status === "INVALIDATED")).toBe(true);
    const delta = buildBrainDelta(first, second);
    expect(delta.schemaVersion).toBe("1.0.0");
    expect(delta.invalidatedClaimIds.length + delta.addedClaimIds.length).toBeGreaterThan(0);
    const roundTrip = parseBrainDelta(serializeBrainDelta(delta));
    expect(roundTrip.beforeSnapshotId).toBe(delta.beforeSnapshotId);
  });

  it("explains claims with evidence and status", async () => {
    const model = buildProjectModel(loadInput("builder-input.json"));
    const brain = await buildProjectBrain(model, { ownership: ownershipFixture() });
    const active = brain.claims.find((c) => c.status === "ACTIVE" || c.status === "CONTRADICTED");
    expect(active).toBeDefined();
    const explanation = explainClaim(brain, active!.id);
    expect(explanation).not.toBeNull();
    expect(explanation!.claim.id).toBe(active!.id);
    expect(explanation!.supportingEvidence.length).toBeGreaterThan(0);
    expect(explanation!.confidence).toBe(active!.confidence);
  });

  it("traces dependency blast radius deterministically", async () => {
    const model = buildProjectModel(loadInput("builder-input.json"));
    const brain = await buildProjectBrain(model, { ownership: ownershipFixture() });
    const target = brain.model.dependencies[0]?.from ?? brain.components[0]?.path ?? "src";
    const a = traceBrain(brain, target, "blast-radius");
    const b = traceBrain(brain, target, "blast-radius");
    expect(a.nodes).toEqual(b.nodes);
    expect(a.edges).toEqual(b.edges);
    expect(a.root).toBe(target);
  });

  it("unified query covers ownership risks claims unknowns", async () => {
    const model = buildProjectModel(loadInput("builder-input.json"));
    const brain = await buildProjectBrain(model, { ownership: ownershipFixture() });
    const engine = createBrainQueryEngine(brain);
    for (const type of [
      "ListOwnership",
      "ListRisks",
      "ListClaims",
      "ListUnknowns",
      "ListContradictions",
      "ListComponents",
      "ListInvalidations",
    ] as const) {
      const response = engine.execute({ type });
      expect(response.metadata.queryType).toBe(type);
      expect(response.snapshotId).toBe(brain.snapshot.id);
    }
  });

  it("applyClaimLifecycle marks missing claims invalidated", () => {
    const previous = [
      buildClaim({
        subject: "Payments",
        predicate: "is-domain",
        object: "true",
        snapshotId: "snap_a",
        evidenceIds: ["ev_1"],
        confidence: 0.8,
        source: "domain-discovery",
        createdAt: "2026-08-06T00:00:00.000Z",
      }),
    ];
    const next = applyClaimLifecycle({
      previous,
      nextActive: [],
      at: "2026-08-07T00:00:00.000Z",
    });
    expect(next).toHaveLength(1);
    expect(next[0]?.status).toBe("INVALIDATED");
    expect(next[0]?.invalidatedAt).toBe("2026-08-07T00:00:00.000Z");
  });
});
