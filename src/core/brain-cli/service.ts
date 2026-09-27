import fs from "node:fs/promises";
import path from "node:path";

import {
  LocalBrainStore,
  createBrainQueryEngine,
  redactBrainForStorage,
  type ProjectBrain,
  type SnapshotMeta,
} from "../understanding/brain/index.js";
import { compileProjectBrain } from "../../mcp/brain/compile.js";
import { OWNERSHIP_BOUNDARY_VERSION } from "../../project/ownership.js";
import { resolveRepoRoot } from "../../utils/path.js";
import { isDirectory } from "../../utils/fs.js";

export interface BrainStatus {
  root: string;
  storeRoot: string;
  hasSnapshot: boolean;
  latestSnapshotId: string | null;
  snapshotCount: number;
  projectName: string | null;
  schemaVersion: string | null;
}

export interface BrainSearchHit {
  kind: "claim" | "component" | "unknown" | "limitation";
  id: string;
  text: string;
  score: number;
}

function storeFor(root: string): LocalBrainStore {
  return LocalBrainStore.underRepo(resolveRepoRoot(root));
}

export async function getBrainStatus(root: string): Promise<BrainStatus> {
  const resolved = resolveRepoRoot(root);
  if (!(await isDirectory(resolved))) {
    throw new Error(`not a directory: ${resolved}`);
  }
  const store = storeFor(resolved);
  const storeRoot = path.join(resolved, ".agentdoctor", "project-brain");
  try {
    const meta = await store.readMeta();
    const boundaryOk = meta.ownershipBoundaryVersion === OWNERSHIP_BOUNDARY_VERSION;
    const hasUsableLatest = boundaryOk && meta.latestSnapshotId !== null;
    return {
      root: resolved,
      storeRoot,
      hasSnapshot: hasUsableLatest,
      latestSnapshotId: hasUsableLatest ? meta.latestSnapshotId : null,
      snapshotCount: meta.snapshots.length,
      projectName: meta.projectName || null,
      schemaVersion: meta.schemaVersion || null,
    };
  } catch {
    return {
      root: resolved,
      storeRoot,
      hasSnapshot: false,
      latestSnapshotId: null,
      snapshotCount: 0,
      projectName: null,
      schemaVersion: null,
    };
  }
}

export async function initBrainStore(root: string): Promise<BrainStatus> {
  const resolved = resolveRepoRoot(root);
  const store = storeFor(resolved);
  await store.ensureRoot();
  return getBrainStatus(resolved);
}

export async function loadLatestBrain(root: string): Promise<ProjectBrain | null> {
  const store = storeFor(root);
  try {
    const brain = await store.loadLatest();
    return brain ? redactBrainForStorage(brain) : null;
  } catch {
    return null;
  }
}

export async function rebuildBrain(root: string): Promise<ProjectBrain> {
  const resolved = resolveRepoRoot(root);
  const store = storeFor(resolved);
  let previous: ProjectBrain | null = null;
  try {
    previous = await store.loadLatest();
  } catch {
    previous = null;
  }
  const brain = await compileProjectBrain(resolved, {
    ...(previous ? { previousClaims: previous.claims } : {}),
  });
  try {
    await store.saveSnapshot(brain);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/refusing overwrite/i.test(message)) {
      throw error;
    }
  }
  return redactBrainForStorage(brain);
}

export async function listBrainSnapshots(root: string): Promise<SnapshotMeta[]> {
  const store = storeFor(root);
  try {
    return await store.listSnapshots();
  } catch {
    return [];
  }
}

export async function showBrainSnapshot(root: string, snapshotId: string): Promise<ProjectBrain> {
  const store = storeFor(root);
  const brain = await store.loadSnapshot(snapshotId);
  return redactBrainForStorage(brain);
}

export function searchBrain(brain: ProjectBrain, query: string): BrainSearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return [];
  }
  const hits: BrainSearchHit[] = [];
  for (const claim of brain.claims) {
    const text = `${claim.subject} ${claim.predicate} ${claim.object}`;
    if (text.toLowerCase().includes(q)) {
      hits.push({ kind: "claim", id: claim.id, text: text.slice(0, 240), score: 1 });
    }
  }
  for (const component of brain.components) {
    const text = `${component.id} ${component.name ?? ""} ${component.type}`;
    if (text.toLowerCase().includes(q)) {
      hits.push({ kind: "component", id: component.id, text: text.slice(0, 240), score: 1 });
    }
  }
  for (const [i, unknown] of brain.unknowns.entries()) {
    if (unknown.toLowerCase().includes(q)) {
      hits.push({ kind: "unknown", id: `unknown-${i}`, text: unknown.slice(0, 240), score: 0.5 });
    }
  }
  for (const [i, limitation] of brain.limitations.entries()) {
    if (limitation.toLowerCase().includes(q)) {
      hits.push({
        kind: "limitation",
        id: `limitation-${i}`,
        text: limitation.slice(0, 240),
        score: 0.5,
      });
    }
  }
  return hits.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}

export async function exportBrain(
  root: string,
  outputPath: string,
  snapshotId?: string,
): Promise<string> {
  const store = storeFor(root);
  const brain = snapshotId ? await store.loadSnapshot(snapshotId) : await store.loadLatest();
  if (!brain) {
    throw new Error("no Project Brain snapshot to export; run agentdoctor brain rebuild");
  }
  const safe = redactBrainForStorage(brain);
  const absolute = path.resolve(outputPath);
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  await fs.writeFile(absolute, `${JSON.stringify(safe, null, 2)}\n`, "utf8");
  return absolute;
}

export async function importBrain(root: string, inputPath: string): Promise<SnapshotMeta> {
  const absolute = path.resolve(inputPath);
  const raw = await fs.readFile(absolute, "utf8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`import file is not valid JSON: ${absolute}`);
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("import JSON must be an object");
  }
  const store = storeFor(root);
  // saveSnapshot redacts and validates via serialize path
  return store.saveSnapshot(parsed as ProjectBrain);
}

export async function inspectBrainSummary(root: string): Promise<Record<string, unknown>> {
  let brain = await loadLatestBrain(root);
  if (!brain) {
    brain = await rebuildBrain(root);
  }
  const engine = createBrainQueryEngine(brain);
  const summary = engine.execute({ type: "ProjectSummary" });
  return {
    snapshotId: brain.snapshot.id,
    projectName: brain.metadata.projectName,
    claimCount: brain.claims.length,
    componentCount: brain.components.length,
    riskCount: brain.risks.risks.length,
    unknownCount: brain.unknowns.length,
    summary: summary.result,
  };
}
