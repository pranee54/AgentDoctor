import path from "node:path";
import fs from "node:fs";

import { pathExists } from "../utils/fs.js";
import { resolveRepoRoot, toPosixRelative } from "../utils/path.js";

/**
 * Semantic project ownership — filesystem containment alone is not ownership.
 *
 * VERIFIED file evidence still means "we read this path under the scan root";
 * ownership classification decides whether that path may feed current-project
 * intelligence (DNA, decisions, search corpus, etc.).
 */
export type ProjectOwnershipClass =
  | "project_owned"
  | "nested_repository"
  | "private_workspace"
  | "internal_docs"
  | "fixture_tree"
  | "validation_checkout"
  | "generated"
  | "unknown";

/** Top-level directory names that are never current-project source by default. */
export const NON_OWNED_TOP_LEVEL_DIRECTORIES = new Set([".private", "AgentDoctorOS"]);

/** Relative path prefixes (posix) treated as non-owned validation/fixture trees. */
export const NON_OWNED_PATH_PREFIXES = [
  "validation/real-world/repositories/checkouts/",
  "fixtures/nested-repos/",
] as const;

/** Bump when ownership/traversal rules change so cached twins/brain consumers invalidate. */
export const OWNERSHIP_BOUNDARY_VERSION = 4;

export class ProjectOwnershipError extends Error {
  readonly code = "PROJECT_OWNERSHIP";
  readonly ownership: ProjectOwnershipClass;
  constructor(ownership: ProjectOwnershipClass, message?: string) {
    super(message ?? `path is outside project ownership (${ownership})`);
    this.name = "ProjectOwnershipError";
    this.ownership = ownership;
  }
}

export interface DirectoryTraversalDecision {
  traverse: boolean;
  ownership: ProjectOwnershipClass;
  reason: string;
}

function firstSegment(relativePosix: string): string {
  const norm = relativePosix.replace(/\\/g, "/").replace(/^\.\//, "");
  if (!norm || norm === ".") return "";
  return norm.split("/")[0] ?? "";
}

/**
 * Classify a relative path for current-project ownership (no I/O).
 * Nested git detection is handled separately during traversal.
 */
export function classifyRelativePathOwnership(relativePath: string): ProjectOwnershipClass {
  const norm = relativePath.replace(/\\/g, "/").replace(/^\.\//, "");
  if (!norm || norm === ".") return "project_owned";

  const top = firstSegment(norm);
  if (top === ".private") return "private_workspace";
  if (top === "AgentDoctorOS") return "internal_docs";
  if (top === "fixtures") return "fixture_tree";

  for (const prefix of NON_OWNED_PATH_PREFIXES) {
    if (norm === prefix.slice(0, -1) || norm.startsWith(prefix)) {
      return "validation_checkout";
    }
  }

  if (norm.startsWith("validation/") && norm.includes("/checkouts/")) {
    return "validation_checkout";
  }

  return "project_owned";
}

export function isProjectOwnedRelativePath(relativePath: string): boolean {
  return classifyRelativePathOwnership(relativePath) === "project_owned";
}

/**
 * True when `dir` is a nested VCS root (has `.git` file or directory) and is
 * not the canonical project root itself.
 */
export async function isNestedRepositoryRoot(
  projectRootInput: string,
  dirAbsolute: string,
): Promise<boolean> {
  const root = resolveRepoRoot(projectRootInput);
  const abs = path.resolve(dirAbsolute);
  if (abs === root) return false;
  return pathExists(path.join(abs, ".git"));
}

/**
 * Decide whether discovery should descend into a directory under the project root.
 */
export async function decideDirectoryTraversal(options: {
  projectRoot: string;
  absoluteDir: string;
  relativeDir: string;
}): Promise<DirectoryTraversalDecision> {
  const root = resolveRepoRoot(options.projectRoot);
  const abs = path.resolve(options.absoluteDir);
  const rel = toPosixRelative(root, abs) || options.relativeDir.replace(/\\/g, "/");

  if (abs === root) {
    return {
      traverse: true,
      ownership: "project_owned",
      reason: "canonical project root",
    };
  }

  const pathClass = classifyRelativePathOwnership(rel);
  if (pathClass !== "project_owned") {
    return {
      traverse: false,
      ownership: pathClass,
      reason: `non-owned tree (${pathClass})`,
    };
  }

  if (await isNestedRepositoryRoot(root, abs)) {
    return {
      traverse: false,
      ownership: "nested_repository",
      reason: "nested .git repository boundary",
    };
  }

  return {
    traverse: true,
    ownership: "project_owned",
    reason: "inside project-owned tree",
  };
}

/**
 * True when any ancestor directory under `projectRoot` (excluding the root) is a nested VCS root.
 * Used for path-targeted access (agent/MCP) where discovery traversal never ran.
 */
export async function isUnderNestedRepository(
  projectRootInput: string,
  absolutePath: string,
): Promise<boolean> {
  const root = resolveRepoRoot(projectRootInput);
  let current = path.resolve(absolutePath);
  if (current === root) return false;

  // Walk ancestors including the path itself when it is a directory.
  for (;;) {
    if (current !== root && (await pathExists(path.join(current, ".git")))) {
      return true;
    }
    if (current === root) return false;
    const parent = path.dirname(current);
    if (parent === current) return false;
    current = parent;
    if (current === root) return false;
  }
}

function realpathOrResolve(candidate: string): string {
  try {
    return fs.realpathSync(candidate);
  } catch {
    return path.resolve(candidate);
  }
}

/**
 * Assert a user-supplied path is both inside the repo root AND project-owned.
 * Containment alone is not ownership (.private, AgentDoctorOS, nested repos, fixtures).
 *
 * Ownership is classified from the realpath-relative path under the real project root
 * so symlink aliases (e.g. link-to-private → .private) cannot launder ownership.
 * Lexical hints are also rejected when they themselves name a non-owned tree.
 */
export async function assertProjectOwnedRepoPath(
  projectRootInput: string,
  absolutePath: string,
  relativeHint?: string,
): Promise<{ absolutePath: string; relativePath: string; ownership: ProjectOwnershipClass }> {
  const root = resolveRepoRoot(projectRootInput);
  const abs = path.resolve(absolutePath);
  const realRoot = realpathOrResolve(root);
  const realAbs = realpathOrResolve(abs);
  const resolvedRelative = toPosixRelative(realRoot, realAbs) || ".";

  if (relativeHint) {
    const hintClass = classifyRelativePathOwnership(relativeHint.replace(/\\/g, "/"));
    if (hintClass !== "project_owned") {
      throw new ProjectOwnershipError(hintClass);
    }
  }

  const pathClass = classifyRelativePathOwnership(resolvedRelative);
  if (pathClass !== "project_owned") {
    throw new ProjectOwnershipError(pathClass);
  }

  if (await isUnderNestedRepository(root, realAbs)) {
    throw new ProjectOwnershipError("nested_repository");
  }

  return { absolutePath: realAbs, relativePath: resolvedRelative, ownership: "project_owned" };
}

/**
 * Human-readable meaning for decision truth labels in product UI.
 */
export function verifiedDecisionTruthMeaning(): string {
  return "File evidence was found and parsed for the current project. This does not prove the architectural decision is correct.";
}
