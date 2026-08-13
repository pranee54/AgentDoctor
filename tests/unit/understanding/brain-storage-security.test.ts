import fs from "node:fs";
import fsPromises from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import {
  buildBrainDelta,
  buildProjectBrain,
  createBrainQueryEngine,
  LocalBrainStore,
  BrainStorageError,
  serializeBrain,
} from "../../../src/core/understanding/brain/index.js";
import { buildProjectModel } from "../../../src/core/understanding/model/index.js";
import type { ProjectModelBuilderInput } from "../../../src/core/understanding/model/types.js";

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

describe("brain storage security & compare", () => {
  it("rejects path-traversal snapshot ids", async () => {
    const dir = await fsPromises.mkdtemp(path.join(os.tmpdir(), "brain-sec-"));
    tempDirs.push(dir);
    const store = new LocalBrainStore(dir);
    await expect(store.loadSnapshot("../escape")).rejects.toBeInstanceOf(BrainStorageError);
    await expect(store.loadSnapshot("snap_x/../../etc")).rejects.toBeInstanceOf(BrainStorageError);
  });

  it("detects checksum corruption", async () => {
    const dir = await fsPromises.mkdtemp(path.join(os.tmpdir(), "brain-cor-"));
    tempDirs.push(dir);
    const model = buildProjectModel(loadInput("builder-input.json"));
    const brain = await buildProjectBrain(model);
    const store = new LocalBrainStore(dir);
    await store.saveSnapshot(brain);

    const brainFile = path.join(dir, "snapshots", brain.snapshot.id, "brain.json");
    const raw = await fsPromises.readFile(brainFile, "utf8");
    await fsPromises.writeFile(brainFile, `${raw.slice(0, -20)}\n`, "utf8");

    await expect(store.loadSnapshot(brain.snapshot.id)).rejects.toThrow(/checksum mismatch/);
  });

  it("compares two snapshots and persists delta", async () => {
    const dir = await fsPromises.mkdtemp(path.join(os.tmpdir(), "brain-cmp-"));
    tempDirs.push(dir);
    const input = loadInput("builder-input.json");
    const first = await buildProjectBrain(buildProjectModel(input));
    const shrunk = structuredClone(input);
    shrunk.domains = {
      ...shrunk.domains,
      domains: shrunk.domains.domains.slice(0, Math.max(0, shrunk.domains.domains.length - 1)),
    };
    const second = await buildProjectBrain(buildProjectModel(shrunk), {
      previousClaims: first.claims,
      generatedAt: "2099-01-01T00:00:00.000Z",
    });

    const store = new LocalBrainStore(dir);
    await store.saveSnapshot(first);
    await store.saveSnapshot(second);

    const comparison = await store.compareSnapshots(first.snapshot.id, second.snapshot.id);
    expect(comparison.sameContentHash).toBe(false);

    const delta = buildBrainDelta(first, second);
    await store.saveDelta(delta);
    const reloaded = await store.loadDelta(first.snapshot.id, second.snapshot.id);
    expect(reloaded.beforeSnapshotId).toBe(first.snapshot.id);
    expect(reloaded.afterSnapshotId).toBe(second.snapshot.id);
  });

  it("serialization is deterministic", async () => {
    const model = buildProjectModel(loadInput("builder-input.json"));
    const brain = await buildProjectBrain(model, { generatedAt: "2026-08-06T00:00:00.000Z" });
    expect(serializeBrain(brain)).toBe(serializeBrain(brain));
  });

  it("rejects incompatible store meta", async () => {
    const dir = await fsPromises.mkdtemp(path.join(os.tmpdir(), "brain-meta-"));
    tempDirs.push(dir);
    await fsPromises.mkdir(path.join(dir, "snapshots"), { recursive: true });
    await fsPromises.writeFile(
      path.join(dir, "store.json"),
      JSON.stringify({
        storageFormatVersion: "9.9.9",
        schemaVersion: "1.0.0",
        projectName: "x",
        latestSnapshotId: null,
        snapshots: [],
      }),
      "utf8",
    );
    const store = new LocalBrainStore(dir);
    await expect(store.readMeta()).rejects.toThrow(/incompatible storage format/);
  });
});

describe("brain performance budgets", () => {
  it("build + persist + reload + query stay under budgets on fixture", async () => {
    const dir = await fsPromises.mkdtemp(path.join(os.tmpdir(), "brain-perf-"));
    tempDirs.push(dir);
    const model = buildProjectModel(loadInput("builder-input.json"));

    const t0 = performance.now();
    const brain = await buildProjectBrain(model);
    const buildMs = performance.now() - t0;
    expect(buildMs).toBeLessThan(2000);

    const store = new LocalBrainStore(dir);
    const t1 = performance.now();
    await store.saveSnapshot(brain);
    const persistMs = performance.now() - t1;
    expect(persistMs).toBeLessThan(1000);

    const payload = serializeBrain(brain);
    expect(Buffer.byteLength(payload, "utf8")).toBeLessThan(5_000_000);

    const t2 = performance.now();
    const loaded = await store.loadLatest();
    const reloadMs = performance.now() - t2;
    expect(reloadMs).toBeLessThan(1000);
    expect(loaded).not.toBeNull();

    const engine = createBrainQueryEngine(loaded!);
    const t3 = performance.now();
    engine.execute({ type: "ProjectSummary" });
    engine.execute({ type: "ListClaims" });
    engine.execute({ type: "ListComponents" });
    const queryMs = performance.now() - t3;
    expect(queryMs).toBeLessThan(200);
  });
});
