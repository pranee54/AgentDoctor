/**
 * Final engineering benchmark: safety scan + Project Brain surfaces.
 * Records median / p95 / max — does not invent ground-truth scores.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { scan } from "../../src/core/scanner/scan.js";
import { inferArchitectures } from "../../src/core/understanding/architecture/index.js";
import {
  buildBrainDelta,
  buildProjectBrain,
  createBrainQueryEngine,
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
const repoRoot = path.resolve(here, "../..");
const reportsDir = path.resolve(here, "reports");
const fixture = path.join(repoRoot, "fixtures/understanding-dependencies-project");
const safetyFixture = path.join(repoRoot, "fixtures/insecure-agent-project");

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) {
    return 0;
  }
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)] ?? 0;
}

function summarize(samples: number[]) {
  const sorted = [...samples].sort((a, b) => a - b);
  return {
    n: sorted.length,
    median: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    max: sorted[sorted.length - 1] ?? 0,
  };
}

async function compile(cwd: string, generatedAt: string) {
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
    generatedAt,
  });
}

async function main(): Promise<number> {
  await fs.mkdir(reportsDir, { recursive: true });
  const runs = 7;
  const safety: number[] = [];
  const build: number[] = [];
  const persist: number[] = [];
  const reload: number[] = [];
  const query: number[] = [];
  const trace: number[] = [];
  const delta: number[] = [];
  const storage: number[] = [];

  for (let i = 0; i < runs; i++) {
    const tScan = performance.now();
    await scan({ cwd: safetyFixture });
    safety.push(Math.round(performance.now() - tScan));

    const model = await compile(fixture, "2026-08-06T00:00:00.000Z");
    const tBuild = performance.now();
    const brain = await buildProjectBrain(model, { cwd: fixture, generatedAt: "2026-08-06T00:00:00.000Z" });
    build.push(Math.round(performance.now() - tBuild));

    const storeDir = path.join(reportsDir, `.bench-store-${i}`);
    await fs.rm(storeDir, { recursive: true, force: true });
    const store = new LocalBrainStore(storeDir);
    const tPersist = performance.now();
    await store.saveSnapshot(brain);
    persist.push(Math.round(performance.now() - tPersist));

    const tReload = performance.now();
    await store.loadLatest();
    reload.push(Math.round(performance.now() - tReload));

    const engine = createBrainQueryEngine(brain);
    const tQuery = performance.now();
    engine.execute({ type: "ProjectSummary" });
    engine.execute({ type: "ListClaims" });
    engine.execute({ type: "ListComponents" });
    query.push(Math.round(performance.now() - tQuery));

    const target = brain.model.dependencies[0]?.from ?? "src";
    const tTrace = performance.now();
    traceBrain(brain, target, "blast-radius");
    trace.push(Math.round(performance.now() - tTrace));

    const model2 = await compile(fixture, "2099-01-01T00:00:00.000Z");
    const brain2 = await buildProjectBrain(model2, {
      cwd: fixture,
      previousClaims: brain.claims,
      generatedAt: "2099-01-01T00:00:00.000Z",
    });
    const tDelta = performance.now();
    buildBrainDelta(brain, brain2);
    delta.push(Math.round(performance.now() - tDelta));

    storage.push(Buffer.byteLength(serializeBrain(brain), "utf8"));
    await fs.rm(storeDir, { recursive: true, force: true });
  }

  const report = {
    suite: "project-brain-engineering-benchmark",
    generatedAt: new Date().toISOString(),
    runs,
    budgetsMs: {
      safetyScan: 5000,
      brainBuild: 5000,
      persist: 2000,
      reload: 2000,
      query: 500,
      trace: 500,
      delta: 500,
    },
    budgetsBytes: { storage: 5_000_000 },
    metrics: {
      safetyScan: summarize(safety),
      brainBuild: summarize(build),
      persist: summarize(persist),
      reload: summarize(reload),
      query: summarize(query),
      trace: summarize(trace),
      delta: summarize(delta),
      storageBytes: summarize(storage),
    },
  };

  const out = path.join(reportsDir, "benchmark-latest.json");
  await fs.writeFile(out, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  const breaches: string[] = [];
  if (report.metrics.safetyScan.p95 > report.budgetsMs.safetyScan) breaches.push("safetyScan");
  if (report.metrics.brainBuild.p95 > report.budgetsMs.brainBuild) breaches.push("brainBuild");
  if (report.metrics.persist.p95 > report.budgetsMs.persist) breaches.push("persist");
  if (report.metrics.reload.p95 > report.budgetsMs.reload) breaches.push("reload");
  if (report.metrics.query.p95 > report.budgetsMs.query) breaches.push("query");
  if (report.metrics.trace.p95 > report.budgetsMs.trace) breaches.push("trace");
  if (report.metrics.delta.p95 > report.budgetsMs.delta) breaches.push("delta");
  if (report.metrics.storageBytes.max > report.budgetsBytes.storage) breaches.push("storage");

  console.log(JSON.stringify(report.metrics, null, 2));
  console.log(`Report: ${out}`);
  if (breaches.length > 0) {
    console.error(`Budget breaches: ${breaches.join(", ")}`);
    return 1;
  }
  console.log("RESULT: PASS");
  return 0;
}

const code = await main();
process.exit(code);
