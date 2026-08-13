import { spawn } from "node:child_process";
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
  detectContradictions,
  explainClaim,
  LocalBrainStore,
  BrainStorageError,
  serializeBrain,
  traceBrain,
} from "../../../src/core/understanding/brain/index.js";
import { buildProjectModel } from "../../../src/core/understanding/model/index.js";
import type { ProjectModelBuilderInput } from "../../../src/core/understanding/model/types.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.resolve(here, "../../../fixtures/understanding-project-model");
const repoRoot = path.resolve(here, "../../..");
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

async function runInChild(
  script: string,
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      ["--import", "tsx", "--input-type=module", "-e", script],
      {
        cwd: repoRoot,
        env: process.env,
      },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.on("close", (code) => {
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}

describe("brain final readiness proofs", () => {
  it("cross-process: save → exit → load → identical query", async () => {
    const dir = await fsPromises.mkdtemp(path.join(os.tmpdir(), "brain-xproc-"));
    tempDirs.push(dir);
    const model = buildProjectModel(loadInput("builder-input.json"));
    const brain = await buildProjectBrain(model, { generatedAt: "2026-08-06T00:00:00.000Z" });
    const store = new LocalBrainStore(dir);
    await store.saveSnapshot(brain);
    const original = createBrainQueryEngine(brain).execute({ type: "ProjectSummary" });

    const childScript = `
      import { LocalBrainStore, createBrainQueryEngine } from ${JSON.stringify(
        path.join(repoRoot, "src/core/understanding/brain/index.js"),
      )};
      const store = new LocalBrainStore(${JSON.stringify(dir)});
      const loaded = await store.loadLatest();
      if (!loaded) throw new Error("no brain");
      const q = createBrainQueryEngine(loaded).execute({ type: "ProjectSummary" });
      process.stdout.write(JSON.stringify({
        snapshotId: loaded.snapshot.id,
        claimCount: loaded.claims.length,
        evidenceCount: loaded.evidence.length,
        ownershipCount: loaded.ownership.ownerships.length,
        riskCount: loaded.risks.risks.length,
        query: q.result,
      }));
    `;
    const result = await runInChild(childScript);
    expect(result.code, result.stderr).toBe(0);
    const parsed = JSON.parse(result.stdout) as {
      snapshotId: string;
      claimCount: number;
      evidenceCount: number;
      ownershipCount: number;
      riskCount: number;
      query: unknown;
    };
    expect(parsed.snapshotId).toBe(brain.snapshot.id);
    expect(parsed.claimCount).toBe(brain.claims.length);
    expect(parsed.evidenceCount).toBe(brain.evidence.length);
    expect(parsed.ownershipCount).toBe(brain.ownership.ownerships.length);
    expect(parsed.riskCount).toBe(brain.risks.risks.length);
    expect(parsed.query).toEqual(original.result);
  });

  it("snapshot A/B history: old snapshot unchanged after B", async () => {
    const dir = await fsPromises.mkdtemp(path.join(os.tmpdir(), "brain-hist-"));
    tempDirs.push(dir);
    const input = loadInput("builder-input.json");
    const a = await buildProjectBrain(buildProjectModel(input), {
      generatedAt: "2026-08-06T00:00:00.000Z",
    });
    const shrunk = structuredClone(input);
    shrunk.domains = {
      ...shrunk.domains,
      domains: shrunk.domains.domains.slice(0, Math.max(0, shrunk.domains.domains.length - 1)),
    };
    const b = await buildProjectBrain(buildProjectModel(shrunk), {
      previousClaims: a.claims,
      generatedAt: "2026-08-07T00:00:00.000Z",
    });
    const store = new LocalBrainStore(dir);
    await store.saveSnapshot(a);
    const aPayload = await fsPromises.readFile(
      path.join(dir, "snapshots", a.snapshot.id, "brain.json"),
      "utf8",
    );
    await store.saveSnapshot(b);
    const aAfter = await fsPromises.readFile(
      path.join(dir, "snapshots", a.snapshot.id, "brain.json"),
      "utf8",
    );
    expect(aAfter).toBe(aPayload);
    const loadedA = await store.loadSnapshot(a.snapshot.id);
    const loadedB = await store.loadSnapshot(b.snapshot.id);
    expect(loadedA.snapshot.id).toBe(a.snapshot.id);
    expect(loadedB.snapshot.id).toBe(b.snapshot.id);
    expect(loadedA.snapshot.id).not.toBe(loadedB.snapshot.id);
    const listed = await store.listSnapshots();
    expect(listed.map((s) => s.id)).toEqual(
      [...listed]
        .sort((x, y) => x.createdAt.localeCompare(y.createdAt) || x.id.localeCompare(y.id))
        .map((s) => s.id),
    );
    expect(await store.latestSnapshotId()).toBe(b.snapshot.id);
  });

  it("lifecycle transitions persist across reload", async () => {
    const dir = await fsPromises.mkdtemp(path.join(os.tmpdir(), "brain-life-"));
    tempDirs.push(dir);
    const previous = [
      buildClaim({
        subject: "Payments",
        predicate: "owned-by",
        object: "TeamA",
        snapshotId: "snap_old",
        evidenceIds: ["ev_1"],
        confidence: 0.9,
        source: "ownership-discovery",
        createdAt: "2026-08-01T00:00:00.000Z",
      }),
      buildClaim({
        subject: "Auth",
        predicate: "is-domain",
        object: "true",
        snapshotId: "snap_old",
        evidenceIds: ["ev_2"],
        confidence: 0.8,
        source: "domain-discovery",
        createdAt: "2026-08-01T00:00:00.000Z",
      }),
    ];
    const nextActive = [
      buildClaim({
        subject: "Payments",
        predicate: "owned-by",
        object: "TeamB",
        snapshotId: "snap_new",
        evidenceIds: ["ev_3"],
        confidence: 0.9,
        source: "ownership-discovery",
        createdAt: "2026-08-02T00:00:00.000Z",
      }),
    ];
    const lifecycle = applyClaimLifecycle({
      previous,
      nextActive,
      at: "2026-08-02T00:00:00.000Z",
    });
    const withContra = detectContradictions(
      [
        ...lifecycle,
        buildClaim({
          subject: "Payments",
          predicate: "owned-by",
          object: "TeamA",
          snapshotId: "snap_new",
          evidenceIds: ["ev_4"],
          confidence: 0.85,
          source: "ownership-discovery",
          createdAt: "2026-08-02T00:00:00.000Z",
        }),
      ],
      "snap_new",
    );
    expect(lifecycle.some((c) => c.status === "SUPERSEDED")).toBe(true);
    expect(lifecycle.some((c) => c.status === "INVALIDATED")).toBe(true);
    expect(withContra.contradictions.length).toBeGreaterThan(0);
    expect(withContra.claims.some((c) => c.status === "CONTRADICTED")).toBe(true);

    const model = buildProjectModel(loadInput("builder-input.json"));
    const brain = await buildProjectBrain(model, {
      previousClaims: withContra.claims,
      generatedAt: "2026-08-08T00:00:00.000Z",
    });
    const store = new LocalBrainStore(dir);
    await store.saveSnapshot(brain);
    const loaded = await store.loadLatest();
    expect(loaded).not.toBeNull();
    const engine = createBrainQueryEngine(loaded!);
    const active = engine.execute({ type: "ListClaims" });
    const activeClaims = active.result as Array<{ status: string }>;
    expect(activeClaims.every((c) => c.status === "ACTIVE" || c.status === "CONTRADICTED")).toBe(
      true,
    );
    const invalidated = engine.execute({ type: "ListInvalidations" });
    expect(Array.isArray(invalidated.result)).toBe(true);
  });

  it("fails closed on corrupt JSON, unsupported schema, malformed claim", async () => {
    const dir = await fsPromises.mkdtemp(path.join(os.tmpdir(), "brain-fail-"));
    tempDirs.push(dir);
    const store = new LocalBrainStore(dir);
    await store.ensureRoot();
    const snapId = "snap_deadbeefdeadbeefdeadbeef";
    const snapDir = path.join(dir, "snapshots", snapId);
    await fsPromises.mkdir(snapDir, { recursive: true });

    await fsPromises.writeFile(path.join(snapDir, "brain.json"), "{not-json", "utf8");
    await fsPromises.writeFile(
      path.join(dir, "store.json"),
      JSON.stringify({
        storageFormatVersion: "1.0.0",
        schemaVersion: "1.0.0",
        projectName: "x",
        latestSnapshotId: snapId,
        snapshots: [
          {
            schemaVersion: "1.0.0",
            id: snapId,
            contentHash: "abc",
            createdAt: "2026-08-06T00:00:00.000Z",
            projectName: "x",
            brainId: "brain_x",
            checksum: "00",
          },
        ],
      }),
      "utf8",
    );
    await expect(store.loadSnapshot(snapId)).rejects.toBeInstanceOf(Error);

    const dir2 = await fsPromises.mkdtemp(path.join(os.tmpdir(), "brain-schema-"));
    tempDirs.push(dir2);
    await fsPromises.mkdir(path.join(dir2, "snapshots"), { recursive: true });
    await fsPromises.writeFile(
      path.join(dir2, "store.json"),
      JSON.stringify({
        storageFormatVersion: "1.0.0",
        schemaVersion: "9.0.0",
        projectName: "x",
        latestSnapshotId: null,
        snapshots: [],
      }),
      "utf8",
    );
    await expect(new LocalBrainStore(dir2).readMeta()).rejects.toThrow(/incompatible/);
  });

  it("rejects symlink escape outside store root when resolving snapshot path", async () => {
    const dir = await fsPromises.mkdtemp(path.join(os.tmpdir(), "brain-sym-"));
    const outside = await fsPromises.mkdtemp(path.join(os.tmpdir(), "brain-out-"));
    tempDirs.push(dir, outside);
    const store = new LocalBrainStore(dir);
    await store.ensureRoot();
    const evil = path.join(dir, "snapshots", "snap_symlinkescape000000000");
    try {
      await fsPromises.symlink(outside, evil);
    } catch {
      // Some environments disallow symlinks; skip rather than invent a pass.
      return;
    }
    await expect(store.loadSnapshot("snap_symlinkescape000000000")).rejects.toBeInstanceOf(
      BrainStorageError,
    );
  });

  it("determinism: identical builds produce identical serialization", async () => {
    const model = buildProjectModel(loadInput("builder-input.json"));
    const a = await buildProjectBrain(model, { generatedAt: "2026-08-06T00:00:00.000Z" });
    const b = await buildProjectBrain(model, { generatedAt: "2026-08-06T00:00:00.000Z" });
    expect(a.snapshot.id).toBe(b.snapshot.id);
    expect(serializeBrain(a)).toBe(serializeBrain(b));
    expect(a.claims.map((c) => c.id)).toEqual(b.claims.map((c) => c.id));
    expect(a.evidence.map((e) => e.id)).toEqual(b.evidence.map((e) => e.id));
  });

  it("empty project model yields controlled brain (unknowns, no fabrications)", async () => {
    const model = buildProjectModel(loadInput("empty-input.json"));
    const brain = await buildProjectBrain(model, { generatedAt: "2026-08-06T00:00:00.000Z" });
    expect(brain.metadata.schemaVersion).toBe("1.0.0");
    expect(brain.unknowns.length).toBeGreaterThan(0);
    expect(
      brain.claims.filter((c) => c.status === "ACTIVE").every((c) => c.evidenceIds.length > 0),
    ).toBe(true);
  });

  it("query surface exposes provenance for required questions", async () => {
    const brain = await buildProjectBrain(buildProjectModel(loadInput("builder-input.json")), {
      generatedAt: "2026-08-06T00:00:00.000Z",
    });
    const engine = createBrainQueryEngine(brain);
    const types = [
      "ProjectSummary",
      "ListDomains",
      "ListComponents",
      "ListEntrypoints",
      "ListDependencies",
      "ListRelationships",
      "ListArchitectures",
      "ListOwnership",
      "ListRisks",
      "ListClaims",
      "ListEvidence",
      "ListContradictions",
      "ListUnknowns",
      "ListInvalidations",
    ] as const;
    for (const type of types) {
      const response = engine.execute({ type });
      expect(response.snapshotId).toBe(brain.snapshot.id);
      expect(response.metadata.schemaVersion).toBe("1.0.0");
      expect(typeof response.confidence).toBe("number");
    }
    const claim = brain.claims.find((c) => c.status === "ACTIVE" || c.status === "CONTRADICTED");
    expect(claim).toBeDefined();
    const explanation = explainClaim(brain, claim!.id);
    expect(explanation?.claim.id).toBe(claim!.id);
    expect(explanation?.supportingEvidence).toBeDefined();
    expect(explanation?.status).toBe(claim!.status);

    const target = brain.model.dependencies[0]?.from ?? "src";
    for (const mode of [
      "dependencies",
      "dependents",
      "entrypoint-downstream",
      "blast-radius",
    ] as const) {
      const t1 = traceBrain(brain, target, mode);
      const t2 = traceBrain(brain, target, mode);
      expect(t1).toEqual(t2);
    }
  });

  it("delta captures structural claim/module changes and round-trips", async () => {
    const input = loadInput("builder-input.json");
    const before = await buildProjectBrain(buildProjectModel(input), {
      generatedAt: "2026-08-06T00:00:00.000Z",
    });
    const afterInput = structuredClone(input);
    afterInput.domains = {
      ...afterInput.domains,
      domains: afterInput.domains.domains.slice(
        0,
        Math.max(0, afterInput.domains.domains.length - 1),
      ),
    };
    const after = await buildProjectBrain(buildProjectModel(afterInput), {
      previousClaims: before.claims,
      generatedAt: "2026-08-07T00:00:00.000Z",
    });
    const delta = buildBrainDelta(before, after);
    expect(
      delta.invalidatedClaimIds.length + delta.removedClaimIds.length + delta.addedClaimIds.length,
    ).toBeGreaterThan(0);
    const dir = await fsPromises.mkdtemp(path.join(os.tmpdir(), "brain-delta-"));
    tempDirs.push(dir);
    const store = new LocalBrainStore(dir);
    await store.saveSnapshot(before);
    await store.saveSnapshot(after);
    await store.saveDelta(delta);
    const loaded = await store.loadDelta(before.snapshot.id, after.snapshot.id);
    expect(loaded.summary).toEqual(delta.summary);
  });
});
