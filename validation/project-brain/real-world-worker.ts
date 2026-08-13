/**
 * Per-repo worker for Project Brain real-world validation.
 * Args: <repoId> <checkoutsRoot> <reportsDir>
 */
import fs from "node:fs/promises";
import path from "node:path";

import { inferArchitectures } from "../../src/core/understanding/architecture/index.js";
import {
  buildBrainDelta,
  buildProjectBrain,
  createBrainQueryEngine,
  explainClaim,
  LocalBrainStore,
  serializeBrain,
  traceBrain,
} from "../../src/core/understanding/brain/index.js";
import { discoverDependencies } from "../../src/core/understanding/dependencies/index.js";
import { discoverDomains } from "../../src/core/understanding/domain/index.js";
import { discoverEntrypoints } from "../../src/core/understanding/entrypoints/index.js";
import { buildProjectModel } from "../../src/core/understanding/model/index.js";
import { discoverOwnership } from "../../src/core/understanding/ownership/index.js";
import { discoverRelationships } from "../../src/core/understanding/relationships/index.js";
import { discoverRisks } from "../../src/core/understanding/risks/index.js";

const id = process.argv[2] ?? "";
const checkoutsRoot = process.argv[3] ?? "";
const reportsDir = process.argv[4] ?? "";
const cwd = path.join(checkoutsRoot, id);
const tmp = path.join(reportsDir, `.tmp-store-${id}-${process.pid}`);
const notes: string[] = [];

function fail(error: string) {
  process.stdout.write(
    `${JSON.stringify({
      id,
      ok: false,
      buildMs: 0,
      persistMs: 0,
      reloadMs: 0,
      queryMs: 0,
      traceMs: 0,
      storageBytes: 0,
      claimCount: 0,
      activeClaimCount: 0,
      evidenceCount: 0,
      unknownCount: 0,
      ownershipCount: 0,
      riskCount: 0,
      componentCount: 0,
      contradictionCount: 0,
      explainOk: false,
      reloadOk: false,
      queryOk: false,
      deltaOk: false,
      error,
      notes: ["controlled failure recorded", ...notes],
    })}\n`,
  );
}

try {
  const t0 = performance.now();
  const domains = await discoverDomains({ cwd });
  const entrypoints = await discoverEntrypoints({ cwd });
  const dependencies = await discoverDependencies({ cwd });
  const relationships = await discoverRelationships({
    cwd,
    domains,
    entrypoints,
    dependencies,
  });
  const architectures = inferArchitectures({
    domains,
    entrypoints,
    dependencies,
    relationships,
  });
  const model = buildProjectModel({
    domains,
    entrypoints,
    dependencies,
    relationships,
    architectures,
    projectName: id,
    generatedAt: "2026-08-06T00:00:00.000Z",
  });
  const ownership = await discoverOwnership({ cwd });
  const risks = discoverRisks(model, ownership);
  const brain = await buildProjectBrain(model, {
    cwd,
    ownership,
    risks,
    generatedAt: "2026-08-06T00:00:00.000Z",
  });
  const buildMs = Math.round(performance.now() - t0);

  if (ownership.ownerships.length === 0) {
    notes.push("ownership=UNKNOWN (no explicit ownership evidence)");
  }
  if (brain.unknowns.length > 0) {
    notes.push(`unknowns=${brain.unknowns.length}`);
  }

  await fs.rm(tmp, { recursive: true, force: true });
  const store = new LocalBrainStore(tmp);
  const t1 = performance.now();
  await store.saveSnapshot(brain);
  const persistMs = Math.round(performance.now() - t1);

  const t2 = performance.now();
  const loaded = await store.loadLatest();
  const reloadMs = Math.round(performance.now() - t2);
  const reloadOk =
    loaded !== null &&
    loaded.snapshot.id === brain.snapshot.id &&
    loaded.claims.length === brain.claims.length &&
    loaded.evidence.length === brain.evidence.length;

  const engine = createBrainQueryEngine(loaded!);
  const t3 = performance.now();
  const summary = engine.execute({ type: "ProjectSummary" });
  engine.execute({ type: "ListClaims" });
  engine.execute({ type: "ListOwnership" });
  engine.execute({ type: "ListRisks" });
  engine.execute({ type: "ListUnknowns" });
  const queryMs = Math.round(performance.now() - t3);
  const queryOk = summary.snapshotId === brain.snapshot.id;

  const claim = brain.claims.find((c) => c.status === "ACTIVE" || c.status === "CONTRADICTED");
  const explanation = claim ? explainClaim(brain, claim.id) : null;
  const explainOk = explanation !== null;

  const target = brain.model.dependencies[0]?.from ?? brain.components[0]?.path ?? "src";
  const t4 = performance.now();
  const trace = traceBrain(brain, target, "blast-radius");
  const traceMs = Math.round(performance.now() - t4);
  if (trace.edges.length === 0) {
    notes.push("trace edges empty — UNKNOWN impact graph for this target");
  }

  const brain2 = await buildProjectBrain(model, {
    cwd,
    ownership,
    risks,
    previousClaims: brain.claims,
    generatedAt: "2099-01-01T00:00:00.000Z",
  });
  const delta = buildBrainDelta(brain, brain2);
  await store.saveSnapshot(brain2);
  await store.saveDelta(delta);
  const loadedDelta = await store.loadDelta(brain.snapshot.id, brain2.snapshot.id);
  const deltaOk = loadedDelta.schemaVersion === "1.0.0";
  const storageBytes = Buffer.byteLength(serializeBrain(brain), "utf8");
  const ok = reloadOk && queryOk && explainOk && deltaOk && storageBytes < 50_000_000;

  process.stdout.write(
    `${JSON.stringify({
      id,
      ok,
      buildMs,
      persistMs,
      reloadMs,
      queryMs,
      traceMs,
      storageBytes,
      claimCount: brain.claims.length,
      activeClaimCount: brain.claims.filter((c) => c.status === "ACTIVE").length,
      evidenceCount: brain.evidence.length,
      unknownCount: brain.unknowns.length,
      ownershipCount: ownership.ownerships.length,
      riskCount: risks.risks.length,
      componentCount: brain.components.length,
      contradictionCount: brain.contradictions.length,
      explainOk,
      reloadOk,
      queryOk,
      deltaOk,
      notes,
    })}\n`,
  );
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await fs.rm(tmp, { recursive: true, force: true }).catch(() => undefined);
}
