import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { DEFAULT_IGNORE_DIRECTORIES } from "../../constants.js";
import { detectProject } from "../../detectors/project.js";
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

/** Directory basenames that must never be treated as a project root candidate. */
const FORBIDDEN_ROOT_BASENAMES = new Set([".private", "agentdoctoros"]);

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

function pathsEqual(a: string, b: string): boolean {
  const left = path.resolve(a);
  const right = path.resolve(b);
  return process.platform === "win32" ? left.toLowerCase() === right.toLowerCase() : left === right;
}

function isUnderHomeSubtree(abs: string, home: string, leaf: string): boolean {
  const target = path.resolve(home, leaf);
  const resolved = path.resolve(abs);
  if (process.platform === "win32") {
    const t = target.toLowerCase();
    const r = resolved.toLowerCase();
    return r === t || r.startsWith(t + "\\");
  }
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
 * True when `cwd` is the user home directory or a similarly unsafe broad folder
 * (Desktop / Downloads / Documents). Used to refuse silent whole-home scans.
 */
export function classifyBroadUserScanRoot(
  cwdInput: string,
  homeInput?: string,
): { blocked: true; reason: string } | { blocked: false } {
  const cwd = path.resolve(cwdInput);
  const home = normalizeHome(homeInput ?? os.homedir());
  const baselower = path.basename(cwd).toLowerCase();
  if (
    pathsEqual(cwd, home) ||
    SUSPICIOUS_DIR_NAMES.has(baselower) ||
    isUnderHomeSubtree(cwd, home, "Desktop") ||
    isUnderHomeSubtree(cwd, home, "Downloads") ||
    isUnderHomeSubtree(cwd, home, "Documents")
  ) {
    return {
      blocked: true,
      reason:
        "Refusing to scan home / Desktop / Downloads / Documents (or similarly broad user folders) as a project root. Navigate into a project directory or pass an explicit project path.",
    };
  }
  return { blocked: false };
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
    "Discovery uses shallow marker probes, bounded entry counts, and detectProject for cwd/prefer when classic markers are absent.",
    "Candidates are VERIFIED only when marker files exist or detectProject finds languages/source under that root.",
  ];

  const broad = classifyBroadUserScanRoot(cwd, home);
  if (broad.blocked) {
    return {
      cwd,
      home,
      candidates: [],
      selected: null,
      blocked: true,
      blockReason: broad.reason,
      // Do not walk the tree — counting home/Desktop can hang CI (esp. Windows).
      estimatedEntries: 0,
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

  function rejectForbiddenRoot(resolved: string): boolean {
    const base = path.basename(resolved).toLowerCase();
    return FORBIDDEN_ROOT_BASENAMES.has(base);
  }

  async function consider(dir: string, reason: string): Promise<void> {
    const resolved = path.resolve(dir);
    if (seen.has(resolved)) return;
    if (!(await isDirectory(resolved))) return;
    if (pathsEqual(resolved, home)) return;
    if (rejectForbiddenRoot(resolved)) return;
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

  /**
   * When classic manifests/.git are absent, reuse the same detectProject path as DNA
   * so `start` agrees with `dna` for valid software trees (e.g. language-only roots).
   * Only applied to prefer/cwd — never to unbounded parent/child walks.
   */
  async function considerDetectProject(dir: string, reason: string): Promise<void> {
    const resolved = path.resolve(dir);
    if (seen.has(resolved)) return;
    if (!(await isDirectory(resolved))) return;
    if (pathsEqual(resolved, home)) return;
    if (rejectForbiddenRoot(resolved)) return;
    if (classifyBroadUserScanRoot(resolved, home).blocked) return;

    let detection;
    try {
      detection = await detectProject(resolved);
    } catch {
      return;
    }

    // detectProject returns ["unknown"] for empty trees — that is not a project signal.
    const languages = detection.repository.languages.filter((l) => l !== "unknown");
    const sourceFiles = detection.discovery.files.filter((f) =>
      /\.(ts|tsx|js|jsx|mjs|cjs|py|php|go|rs|java|kt|kts|dart|rb|cs)$/i.test(f.relativePath),
    ).length;
    if (languages.length === 0 && sourceFiles === 0) return;

    seen.add(resolved);
    const markers =
      languages.length > 0 ? languages.map((l) => `lang:${l}`) : [`source-files:${sourceFiles}`];
    candidates.push({
      root: resolved,
      // Match strong marker score so a lone detectProject hit auto-selects like package.json.
      score: languages.length > 0 ? 5 : 3,
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
    if (pathsEqual(parent, home) || parent === path.dirname(parent)) break;
    await consider(parent, "parent directory with project markers");
    parent = path.dirname(parent);
  }

  // Immediate children that look like projects (monorepo packages / sibling apps).
  try {
    const entries = await fs.readdir(cwd, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.isSymbolicLink()) continue;
      if (DEFAULT_IGNORE_DIRECTORIES.has(entry.name) || entry.name.startsWith(".")) continue;
      if (FORBIDDEN_ROOT_BASENAMES.has(entry.name.toLowerCase())) continue;
      await consider(path.join(cwd, entry.name), "child directory with project markers");
    }
  } catch {
    limitations.push("Could not list child directories for candidate discovery.");
  }

  // detectProject fallback (same engine as DNA) for prefer/cwd when no classic markers
  // apply to that path AND no ancestor marker candidate already covers it (nested Case B).
  // Also skip when child classic-marker projects already exist — otherwise detectProject
  // would absorb sibling packages into a multi-project parent (start always passes prefer=cwd).
  const preferAbs = options.prefer ? path.resolve(options.prefer) : null;

  function ancestorMarkerCovers(target: string): ProjectCandidate | undefined {
    return candidates.find((c) => {
      if (pathsEqual(c.root, target)) return true;
      const rootWithSep = c.root.endsWith(path.sep) ? c.root : c.root + path.sep;
      if (process.platform === "win32") {
        return target.toLowerCase().startsWith(rootWithSep.toLowerCase());
      }
      return target.startsWith(rootWithSep);
    });
  }

  function descendantMarkerCandidates(target: string): ProjectCandidate[] {
    const targetWithSep = target.endsWith(path.sep) ? target : target + path.sep;
    return candidates.filter((c) => {
      if (pathsEqual(c.root, target)) return false;
      if (process.platform === "win32") {
        return c.root.toLowerCase().startsWith(targetWithSep.toLowerCase());
      }
      return c.root.startsWith(targetWithSep);
    });
  }

  if (preferAbs) {
    // Skip detectProject absorption when 2+ classic child projects exist (multi-project
    // parent). A single nested foreign repo must not block prefer's own language tree.
    if (!ancestorMarkerCovers(preferAbs) && descendantMarkerCandidates(preferAbs).length < 2) {
      await considerDetectProject(preferAbs, "explicit prefer path (detectProject)");
    }
  } else if (candidates.length === 0) {
    await considerDetectProject(cwd, "current working directory (detectProject)");
  }

  candidates.sort((a, b) => b.score - a.score || a.root.localeCompare(b.root));

  let selected: ProjectCandidate | null = null;
  if (preferAbs) {
    const exact = candidates.find((c) => pathsEqual(c.root, preferAbs));
    const covered = ancestorMarkerCovers(preferAbs);
    // Nested dir under a marker project → select the marker root, not the nested leaf.
    if (covered && !pathsEqual(covered.root, preferAbs)) {
      selected = covered;
    } else {
      selected = exact ?? covered ?? null;
    }
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
