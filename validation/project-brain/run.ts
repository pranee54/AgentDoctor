/**
 * Project Brain V1 surface validation — persistence, claims, query, trace, delta.
 * Uses fixture repos with justified expectations only; unknowns stay UNKNOWN.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
import { discoverRelationships } from "../../src/core/understanding/relationships/index.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const monorepo = path.resolve(here, "../../fixtures/understanding-dependencies-project");

interface Check {
  name: string;
  ok: boolean;
  detail: string;
}

async function compileFixture(cwd: string) {
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
  return buildProjectModel({
    domains,
    entrypoints,
    dependencies,
    relationships,
    architectures,
    projectName: path.basename(cwd),
    generatedAt: "2026-08-06T00:00:00.000Z",
  });
}

async function main(): Promise<number> {
  const checks: Check[] = [];
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "brain-validate-"));

  try {
    const model = await compileFixture(monorepo);
    const brain = await buildProjectBrain(model, { cwd: monorepo });

    checks.push({
      name: "brain-has-schema",
      ok: brain.metadata.schemaVersion === "1.0.0",
      detail: brain.metadata.schemaVersion,
    });
    checks.push({
      name: "typed-evidence",
      ok: brain.evidence.length > 0 && brain.evidence.every((e) => e.id.startsWith("ev_")),
      detail: `evidence=${brain.evidence.length}`,
    });
    checks.push({
      name: "active-claims-have-evidence",
      ok: brain.claims
        .filter((c) => c.status === "ACTIVE")
        .every((c) => c.evidenceIds.length > 0),
      detail: `claims=${brain.claims.length}`,
    });
    checks.push({
      name: "components-first-class",
      ok: brain.components.length > 0,
      detail: `components=${brain.components.length}`,
    });

    const store = new LocalBrainStore(tmp);
    await store.saveSnapshot(brain);
    const reloaded = await store.loadLatest();
    checks.push({
      name: "persistence-reload",
      ok: reloaded !== null && reloaded.snapshot.id === brain.snapshot.id,
      detail: reloaded?.snapshot.id ?? "null",
    });

    const q1 = createBrainQueryEngine(brain).execute({ type: "ProjectSummary" });
    const q2 = createBrainQueryEngine(reloaded!).execute({ type: "ProjectSummary" });
    checks.push({
      name: "query-stable-across-reload",
      ok: JSON.stringify(q1.result) === JSON.stringify(q2.result),
      detail: `snapshot=${q2.snapshotId}`,
    });

    const claim = brain.claims.find((c) => c.status === "ACTIVE" || c.status === "CONTRADICTED");
    const explanation = claim ? explainClaim(brain, claim.id) : null;
    checks.push({
      name: "explain-claim",
      ok: explanation !== null,
      detail: claim?.id ?? "no-claim",
    });

    const target = brain.model.dependencies[0]?.from ?? brain.components[0]?.path ?? "src";
    const trace = traceBrain(brain, target, "blast-radius");
    checks.push({
      name: "trace-deterministic",
      ok: JSON.stringify(traceBrain(brain, target, "blast-radius")) === JSON.stringify(trace),
      detail: `nodes=${trace.nodes.length}`,
    });

    const brain2 = await buildProjectBrain(model, {
      cwd: monorepo,
      previousClaims: brain.claims,
      generatedAt: "2099-01-02T00:00:00.000Z",
    });
    checks.push({
      name: "distinct-snapshot-on-clock",
      ok: brain2.snapshot.id !== brain.snapshot.id,
      detail: `${brain.snapshot.id} → ${brain2.snapshot.id}`,
    });

    const delta = buildBrainDelta(brain, brain2);
    await store.saveSnapshot(brain2);
    await store.saveDelta(delta);
    const loadedDelta = await store.loadDelta(brain.snapshot.id, brain2.snapshot.id);
    checks.push({
      name: "delta-roundtrip",
      ok: loadedDelta.schemaVersion === "1.0.0",
      detail: loadedDelta.summary.join("; "),
    });

    const size = Buffer.byteLength(serializeBrain(brain), "utf8");
    checks.push({
      name: "storage-size-budget",
      ok: size < 5_000_000,
      detail: `bytes=${size}`,
    });

    const listed = await store.listSnapshots();
    checks.push({
      name: "snapshot-registry",
      ok: listed.length >= 2 && listed.some((s) => s.id === brain.snapshot.id),
      detail: `snapshots=${listed.length}`,
    });
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }

  const failed = checks.filter((c) => !c.ok);
  for (const c of checks) {
    console.log(`${c.ok ? "PASS" : "FAIL"}  ${c.name}  ${c.detail}`);
  }
  console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
  return failed.length === 0 ? 0 : 1;
}

const code = await main();
process.exit(code);
