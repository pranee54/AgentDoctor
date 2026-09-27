import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

import { PACKAGE_VERSION } from "../../constants.js";
import type { GraphEdge, GraphNode } from "../../platform/types.js";
import { OWNERSHIP_BOUNDARY_VERSION } from "../../project/ownership.js";
import { resolveRepoRoot, toPosixRelative } from "../../utils/path.js";
import { atomicWriteTextFile } from "../../utils/fs.js";
import { buildIntelligenceGraph, listTsFiles, type GraphBuilderMode } from "./build.js";

export const GRAPH_INDEX_SCHEMA = "1.0.0";

export interface GraphSnapshot {
  schemaVersion: string;
  agentDoctorVersion: string;
  root: string;
  generatedAt: string;
  builder: GraphBuilderMode | string;
  astFilesParsed: number;
  fileHashes: Record<string, string>;
  nodes: GraphNode[];
  edges: GraphEdge[];
  limitations: string[];
  /** Reject cached graphs built under a prior ownership boundary. */
  ownershipBoundaryVersion?: number;
}

export interface GraphStatus {
  present: boolean;
  path: string;
  schemaVersion?: string;
  builder?: string;
  nodeCount: number;
  edgeCount: number;
  fileCount: number;
  generatedAt?: string;
  staleFiles: string[];
  missingFiles: string[];
  corrupt?: boolean;
  error?: string;
}

function indexPath(root: string): string {
  return path.join(root, ".agentdoctor", "graph", "index.json");
}

function sha256FileContent(content: string | Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}

async function hashFiles(root: string, absFiles: string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const abs of absFiles) {
    const rel = toPosixRelative(root, abs);
    try {
      const buf = await fs.readFile(abs);
      out[rel] = sha256FileContent(buf);
    } catch {
      // skip unreadable
    }
  }
  return out;
}

function gitChangedFiles(root: string): string[] | null {
  const run = (args: string[]) => {
    const r = spawnSync("git", args, { cwd: root, encoding: "utf8" });
    return r.status === 0 && typeof r.stdout === "string" ? r.stdout : null;
  };
  const staged = run(["diff", "--name-only", "--cached"]);
  const unstaged = run(["diff", "--name-only"]);
  const untracked = run(["ls-files", "--others", "--exclude-standard"]);
  if (staged === null && unstaged === null && untracked === null) return null;
  const set = new Set<string>();
  for (const block of [staged, unstaged, untracked]) {
    if (!block) continue;
    for (const line of block.split("\n")) {
      const t = line.trim();
      if (t) set.add(t.split(path.sep).join("/"));
    }
  }
  return [...set].sort();
}

function isValidSnapshot(raw: unknown): raw is GraphSnapshot {
  if (!raw || typeof raw !== "object") return false;
  const s = raw as Record<string, unknown>;
  return (
    typeof s.schemaVersion === "string" &&
    typeof s.root === "string" &&
    typeof s.generatedAt === "string" &&
    s.fileHashes !== null &&
    typeof s.fileHashes === "object" &&
    Array.isArray(s.nodes) &&
    Array.isArray(s.edges)
  );
}

async function loadSnapshot(
  root: string,
): Promise<{ ok: true; snapshot: GraphSnapshot } | { ok: false; corrupt: boolean; error: string }> {
  const file = indexPath(root);
  try {
    const raw = await fs.readFile(file, "utf8");
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { ok: false, corrupt: true, error: "index.json is not valid JSON" };
    }
    if (!isValidSnapshot(parsed)) {
      return { ok: false, corrupt: true, error: "index.json failed schema checks" };
    }
    if (parsed.ownershipBoundaryVersion !== OWNERSHIP_BOUNDARY_VERSION) {
      return {
        ok: false,
        corrupt: false,
        error: `graph index ownership boundary is stale (have ${String(parsed.ownershipBoundaryVersion ?? "missing")}, need ${OWNERSHIP_BOUNDARY_VERSION})`,
      };
    }
    return { ok: true, snapshot: parsed };
  } catch (error) {
    return {
      ok: false,
      corrupt: false,
      error: error instanceof Error ? error.message : "index missing",
    };
  }
}

async function persistSnapshot(root: string, snapshot: GraphSnapshot): Promise<string> {
  const file = indexPath(root);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await atomicWriteTextFile(file, `${JSON.stringify(snapshot, null, 2)}\n`);
  return file;
}

async function buildAndPersist(
  root: string,
  mode: GraphBuilderMode = "auto",
): Promise<{ snapshot: GraphSnapshot; path: string }> {
  const graph = await buildIntelligenceGraph({ root, mode });
  const files = await listTsFiles(root);
  const fileHashes = await hashFiles(root, files);
  const snapshot: GraphSnapshot = {
    schemaVersion: GRAPH_INDEX_SCHEMA,
    agentDoctorVersion: PACKAGE_VERSION,
    root,
    generatedAt: graph.generatedAt,
    builder: graph.builder,
    astFilesParsed: graph.astFilesParsed,
    fileHashes,
    nodes: graph.nodes,
    edges: graph.edges,
    limitations: [
      ...graph.limitations,
      "Incremental index persists file hashes for change detection",
    ],
    ownershipBoundaryVersion: OWNERSHIP_BOUNDARY_VERSION,
  };
  const saved = await persistSnapshot(root, snapshot);
  return { snapshot, path: saved };
}

/**
 * Full graph build and persist to `.agentdoctor/graph/index.json`.
 */
export async function graphBuild(options: {
  root: string;
  mode?: GraphBuilderMode;
}): Promise<{ snapshot: GraphSnapshot; path: string; rebuilt: boolean }> {
  const root = resolveRepoRoot(options.root);
  const result = await buildAndPersist(root, options.mode ?? "auto");
  return { ...result, rebuilt: true };
}

/**
 * Force full rebuild (same as build, clears prior assumptions).
 */
export async function graphRebuild(options: {
  root: string;
  mode?: GraphBuilderMode;
}): Promise<{ snapshot: GraphSnapshot; path: string; rebuilt: boolean }> {
  return graphBuild(options);
}

/**
 * Update graph from git-changed files or content-hash comparison.
 * On corruption → rebuild. When nothing changed → reuse snapshot.
 */
export async function graphUpdate(options: { root: string; mode?: GraphBuilderMode }): Promise<{
  snapshot: GraphSnapshot;
  path: string;
  rebuilt: boolean;
  reason: string;
  changedFiles: string[];
}> {
  const root = resolveRepoRoot(options.root);
  const loaded = await loadSnapshot(root);

  if (!loaded.ok) {
    if (loaded.corrupt) {
      const result = await buildAndPersist(root, options.mode ?? "auto");
      return {
        ...result,
        rebuilt: true,
        reason: `corrupt index rebuilt: ${loaded.error}`,
        changedFiles: Object.keys(result.snapshot.fileHashes),
      };
    }
    const result = await buildAndPersist(root, options.mode ?? "auto");
    return {
      ...result,
      rebuilt: true,
      reason: "no prior index; built fresh",
      changedFiles: Object.keys(result.snapshot.fileHashes),
    };
  }

  const files = await listTsFiles(root);
  const currentHashes = await hashFiles(root, files);
  const prev = loaded.snapshot.fileHashes;

  const changedFromHash: string[] = [];
  for (const [rel, hash] of Object.entries(currentHashes)) {
    if (prev[rel] !== hash) changedFromHash.push(rel);
  }
  for (const rel of Object.keys(prev)) {
    if (!(rel in currentHashes)) changedFromHash.push(rel);
  }

  const gitFiles = gitChangedFiles(root);
  const tsGitChanged =
    gitFiles?.filter((f) => /\.(ts|tsx|mts|cts)$/i.test(f) && !f.endsWith(".d.ts")) ?? [];

  const changedSet = new Set([...changedFromHash, ...tsGitChanged]);
  const changedFiles = [...changedSet].sort();

  if (changedFiles.length === 0) {
    return {
      snapshot: loaded.snapshot,
      path: indexPath(root),
      rebuilt: false,
      reason: "file hashes unchanged; snapshot reused",
      changedFiles: [],
    };
  }

  // Incremental: drop nodes/edges for changed paths, re-run full builder for correctness
  // (TypeScript program needs whole set; hash gate already skipped no-op updates).
  const result = await buildAndPersist(root, options.mode ?? "auto");
  return {
    ...result,
    rebuilt: true,
    reason: `updated ${changedFiles.length} changed file(s)`,
    changedFiles,
  };
}

export async function graphStatus(options: { root: string }): Promise<GraphStatus> {
  const root = resolveRepoRoot(options.root);
  const file = indexPath(root);
  const loaded = await loadSnapshot(root);
  if (!loaded.ok) {
    return {
      present: false,
      path: file,
      nodeCount: 0,
      edgeCount: 0,
      fileCount: 0,
      corrupt: loaded.corrupt,
      error: loaded.error,
      staleFiles: [],
      missingFiles: [],
    };
  }

  const files = await listTsFiles(root);
  const currentHashes = await hashFiles(root, files);
  const prev = loaded.snapshot.fileHashes;
  const staleFiles: string[] = [];
  const missingFiles: string[] = [];

  for (const [rel, hash] of Object.entries(currentHashes)) {
    if (!(rel in prev)) staleFiles.push(rel);
    else if (prev[rel] !== hash) staleFiles.push(rel);
  }
  for (const rel of Object.keys(prev)) {
    if (!(rel in currentHashes)) missingFiles.push(rel);
  }

  return {
    present: true,
    path: file,
    schemaVersion: loaded.snapshot.schemaVersion,
    builder: String(loaded.snapshot.builder),
    nodeCount: loaded.snapshot.nodes.length,
    edgeCount: loaded.snapshot.edges.length,
    fileCount: Object.keys(prev).length,
    generatedAt: loaded.snapshot.generatedAt,
    staleFiles: staleFiles.sort(),
    missingFiles: missingFiles.sort(),
  };
}
