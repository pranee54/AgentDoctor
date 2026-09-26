import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { DEFAULT_IGNORE_DIRECTORIES } from "../../constants.js";
import { isDirectory, pathExists } from "../../utils/fs.js";
import { resolveRepoRoot } from "../../utils/path.js";
import type { TruthLabel } from "../truth.js";

/** Markers that strongly suggest a software project root. */
const PROJECT_MARKERS = [
  "package.json",
  "composer.json",
  "pyproject.toml",
  "Cargo.toml",
  "go.mod",
  "pom.xml",
  "build.gradle",
  "build.gradle.kts",
  "Gemfile",
  "mix.exs",
  "pubspec.yaml",
  ".git",
] as const;

const SUSPICIOUS_DIR_NAMES = new Set([
  "desktop",
  "downloads",
  "documents",
  "pictures",
  "movies",
  "music",
  "library",
  "applications",
]);

export interface ProjectCandidate {
  root: string;
  score: number;
  markers: string[];
  truth: TruthLabel;
  reason: string;
}

export interface ProjectDiscoveryReport {
  cwd: string;
  home: string;
  candidates: ProjectCandidate[];
  selected: ProjectCandidate | null;
  blocked: boolean;
  blockReason: string | null;
  estimatedEntries: number;
  limitations: string[];
}

export interface DiscoverProjectOptions {
  cwd?: string;
  /** Maximum directory entries to count before aborting deep scans. */
  maxEntries?: number;
  /** Prefer this path if it is a valid project. */
  prefer?: string;
  /** Auto-select highest score when exactly one strong candidate. */
  autoSelect?: boolean;
}

function normalizeHome(home: string): string {
  return path.resolve(home);
}

function isUnderHomeSubtree(abs: string, home: string, leaf: string): boolean {
  const target = path.resolve(home, leaf);
  const resolved = path.resolve(abs);
  return resolved === target || resolved.startsWith(target + path.sep);
}

async function countEntriesShallow(dir: string, budget: number): Promise<number> {
  let count = 0;
  const queue: string[] = [dir];
  const skip = DEFAULT_IGNORE_DIRECTORIES;
  while (queue.length > 0 && count < budget) {
    const current = queue.pop()!;
    let entries;
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      count += 1;
      if (count >= budget) return count;
      if (!entry.isDirectory() || entry.isSymbolicLink()) continue;
      if (skip.has(entry.name) || entry.name.startsWith(".")) continue;
      queue.push(path.join(current, entry.name));
    }
  }
  return count;
}

async function markersAt(dir: string): Promise<string[]> {
  const found: string[] = [];
  for (const marker of PROJECT_MARKERS) {
    if (await pathExists(path.join(dir, marker))) {
      found.push(marker);
    }
  }
  return found;
}

function scoreMarkers(markers: string[]): number {
  let score = 0;
  for (const m of markers) {
    if (m === ".git") score += 3;
    else if (m === "package.json" || m === "composer.json" || m === "pyproject.toml") score += 5;
    else score += 4;
  }
  return score;
}

/**
 * Discover likely project roots from cwd without silently scanning home/Desktop/Downloads
 * or unbounded parent trees.
 */
export async function discoverProjectRoots(
  options: DiscoverProjectOptions = {},
): Promise<ProjectDiscoveryReport> {
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const home = normalizeHome(os.homedir());
  const maxEntries = options.maxEntries ?? 25_000;
  const limitations: string[] = [
    "Discovery uses shallow marker probes and bounded entry counts — not a full repository index.",
    "Candidates are VERIFIED only when marker files/directories exist on disk.",
  ];

  const baselower = path.basename(cwd).toLowerCase();
  if (
    cwd === home ||
    SUSPICIOUS_DIR_NAMES.has(baselower) ||
    isUnderHomeSubtree(cwd, home, "Desktop") ||
    isUnderHomeSubtree(cwd, home, "Downloads") ||
    isUnderHomeSubtree(cwd, home, "Documents")
  ) {
    const estimatedEntries = await countEntriesShallow(cwd, Math.min(maxEntries, 5_000));
    return {
      cwd,
      home,
      candidates: [],
      selected: null,
      blocked: true,
      blockReason:
        "Refusing to scan home / Desktop / Downloads / Documents (or similarly broad user folders) as a project root. Navigate into a project directory or pass an explicit project path.",
      estimatedEntries,
      limitations,
    };
  }

  const estimatedEntries = await countEntriesShallow(cwd, maxEntries + 1);
  if (estimatedEntries > maxEntries) {
    return {
      cwd,
      home,
      candidates: [],
      selected: null,
      blocked: true,
      blockReason: `Directory tree exceeds safe scan budget (${maxEntries} entries). Narrow to a project subdirectory or raise --max-entries deliberately.`,
      estimatedEntries,
      limitations,
    };
  }

  const candidates: ProjectCandidate[] = [];
  const seen = new Set<string>();

  async function consider(dir: string, reason: string): Promise<void> {
    const resolved = path.resolve(dir);
    if (seen.has(resolved)) return;
    if (!(await isDirectory(resolved))) return;
    if (resolved === home) return;
    const markers = await markersAt(resolved);
    if (markers.length === 0) return;
    seen.add(resolved);
    candidates.push({
      root: resolved,
      score: scoreMarkers(markers),
      markers,
      truth: "VERIFIED",
      reason,
    });
  }

  if (options.prefer) {
    await consider(options.prefer, "explicit prefer path");
  }

  await consider(cwd, "current working directory");

  // Walk up a few parents looking for markers (bounded).
  let parent = path.dirname(cwd);
  for (let i = 0; i < 4; i++) {
    if (parent === home || parent === path.dirname(parent)) break;
    await consider(parent, "parent directory with project markers");
    parent = path.dirname(parent);
  }

  // Immediate children that look like projects (monorepo packages / sibling apps).
  try {
    const entries = await fs.readdir(cwd, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.isSymbolicLink()) continue;
      if (DEFAULT_IGNORE_DIRECTORIES.has(entry.name) || entry.name.startsWith(".")) continue;
      await consider(path.join(cwd, entry.name), "child directory with project markers");
    }
  } catch {
    limitations.push("Could not list child directories for candidate discovery.");
  }

  candidates.sort((a, b) => b.score - a.score || a.root.localeCompare(b.root));

  let selected: ProjectCandidate | null = null;
  if (options.prefer) {
    selected = candidates.find((c) => c.root === path.resolve(options.prefer!)) ?? null;
  } else if (options.autoSelect !== false) {
    const strong = candidates.filter((c) => c.score >= 5);
    if (strong.length === 1) {
      selected = strong[0]!;
    } else if (candidates.length === 1) {
      selected = candidates[0]!;
    }
  }

  return {
    cwd,
    home,
    candidates,
    selected,
    blocked: false,
    blockReason: null,
    estimatedEntries,
    limitations,
  };
}

export async function resolveStartedProjectRoot(
  pathArg: string | undefined,
  options?: { maxEntries?: number },
): Promise<
  | { ok: true; root: string; discovery: ProjectDiscoveryReport }
  | { ok: false; discovery: ProjectDiscoveryReport }
> {
  const prefer = pathArg ? resolveRepoRoot(pathArg) : undefined;
  const discovery = await discoverProjectRoots({
    cwd: prefer ?? process.cwd(),
    ...(prefer !== undefined ? { prefer } : {}),
    ...(options?.maxEntries !== undefined ? { maxEntries: options.maxEntries } : {}),
    autoSelect: true,
  });
  if (discovery.blocked || !discovery.selected) {
    return { ok: false, discovery };
  }
  return { ok: true, root: discovery.selected.root, discovery };
}
