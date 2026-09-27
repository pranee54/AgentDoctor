import path from "node:path";
import fs from "node:fs";

import {
  assertProjectOwnedRepoPath,
  classifyRelativePathOwnership,
  ProjectOwnershipError,
} from "../../project/ownership.js";
import {
  PathEscapeError,
  rejectHostilePathInput,
  resolveSafeRepoPath,
  tryDecodeUriComponent,
} from "../../security/paths.js";
import { sanitizeForOutput } from "../../utils/path.js";

export { tryDecodeUriComponent };

/**
 * Validate a user-supplied repository-relative or in-repo target.
 * Returns a normalized path relative to root (POSIX) when the target is path-like and safe,
 * or null when the target is treated as a non-path identifier (graph id / label).
 * Throws a safe Error (no outside path leakage) when a path-like target escapes the root
 * or is outside project ownership (.private, AgentDoctorOS, fixtures, validation).
 */
export function assertSafeRepoTarget(root: string, rawTarget: string): string | null {
  if (typeof rawTarget !== "string" || rawTarget.includes("\0")) {
    throw new Error("invalid target");
  }
  const cleaned = sanitizeForOutput(rawTarget).trim();
  if (!cleaned) {
    throw new Error("invalid target");
  }
  if (cleaned.includes("\0")) {
    throw new Error("invalid target");
  }

  const decoded = tryDecodeUriComponent(cleaned);
  if (decoded === null) {
    throw new Error("invalid target");
  }
  const candidates = decoded === cleaned ? [cleaned] : [cleaned, decoded];

  let pathLike = false;
  for (const candidate of candidates) {
    const looksLikePath =
      path.isAbsolute(candidate) ||
      candidate.includes("..") ||
      candidate.includes("/") ||
      candidate.includes("\\") ||
      /^[A-Za-z]:[\\/]/.test(candidate);

    if (!looksLikePath) {
      continue;
    }
    pathLike = true;

    try {
      rejectHostilePathInput(candidate);
      resolveSafeRepoPath(root, candidate);
    } catch (error) {
      if (error instanceof PathEscapeError) {
        throw new Error(error.message);
      }
      throw new Error("invalid target");
    }
  }

  if (!pathLike) {
    return null;
  }

  const primary = candidates[candidates.length - 1]!;
  try {
    const abs = resolveSafeRepoPath(root, primary);
    const lexicalRel = path.isAbsolute(primary)
      ? path.relative(root, abs).split(path.sep).join("/")
      : primary.replace(/\\/g, "/").replace(/^\.\//, "");
    // Lexical non-owned prefixes always deny.
    if (classifyRelativePathOwnership(lexicalRel) !== "project_owned") {
      throw new Error("path outside project ownership");
    }
    // Realpath-relative classification catches symlink aliases into non-owned trees.
    let realRoot = root;
    let realAbs = abs;
    try {
      realRoot = fs.realpathSync(root);
    } catch {
      /* keep */
    }
    try {
      realAbs = fs.realpathSync(abs);
    } catch {
      /* keep */
    }
    const realRel = path.relative(realRoot, realAbs).split(path.sep).join("/") || ".";
    if (
      realRel.startsWith("..") ||
      path.isAbsolute(realRel) ||
      classifyRelativePathOwnership(realRel) !== "project_owned"
    ) {
      throw new Error("path outside project ownership");
    }
    return realRel || lexicalRel;
  } catch (error) {
    if (error instanceof PathEscapeError) {
      throw new Error(error.message);
    }
    if (error instanceof Error && error.message === "path outside project ownership") {
      throw error;
    }
    throw new Error("invalid target");
  }
}

/**
 * Async ownership gate including nested-repository ancestry (for MCP file-path tools).
 */
export async function assertSafeOwnedRepoTarget(
  root: string,
  rawTarget: string,
): Promise<string | null> {
  const rel = assertSafeRepoTarget(root, rawTarget);
  if (rel === null) return null;
  try {
    const abs = resolveSafeRepoPath(root, rel);
    await assertProjectOwnedRepoPath(root, abs, rel);
  } catch (error) {
    if (error instanceof PathEscapeError || error instanceof ProjectOwnershipError) {
      throw new Error(error.message);
    }
    throw error;
  }
  return rel;
}
