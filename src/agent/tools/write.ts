import fs from "node:fs/promises";
import path from "node:path";

import { assertProjectOwnedRepoPath, ProjectOwnershipError } from "../../project/ownership.js";
import { PathEscapeError, resolveSafeRepoPath } from "../../security/paths.js";
import { atomicWriteTextFile } from "../../utils/fs.js";

export interface FileDiffResult {
  path: string;
  action: "create" | "edit" | "delete";
  beforeBytes: number;
  afterBytes: number;
  /** Unified-ish line diff (bounded) */
  diff: string;
}

const MAX_DIFF_LINES = 400;

export function buildUnifiedDiff(pathLabel: string, before: string, after: string): string {
  const a = before.split(/\r?\n/);
  const b = after.split(/\r?\n/);
  const lines: string[] = [`--- a/${pathLabel}`, `+++ b/${pathLabel}`];
  const max = Math.max(a.length, b.length);
  let shown = 0;
  for (let i = 0; i < max && shown < MAX_DIFF_LINES; i += 1) {
    const left = a[i];
    const right = b[i];
    if (left === right) {
      if (left !== undefined) {
        lines.push(` ${left}`);
        shown += 1;
      }
      continue;
    }
    if (left !== undefined) {
      lines.push(`-${left}`);
      shown += 1;
    }
    if (right !== undefined) {
      lines.push(`+${right}`);
      shown += 1;
    }
  }
  if (shown >= MAX_DIFF_LINES) {
    lines.push("... diff truncated ...");
  }
  return lines.join("\n");
}

function normalizeRel(rel: string): string {
  return rel.split(path.sep).join("/");
}

async function resolveOwnedWritePath(root: string, relativePath: string): Promise<string> {
  const abs = resolveSafeRepoPath(root, relativePath);
  try {
    await assertProjectOwnedRepoPath(root, abs, relativePath);
  } catch (error) {
    if (error instanceof ProjectOwnershipError) {
      throw new PathEscapeError(error.message);
    }
    throw error;
  }
  return abs;
}

/**
 * Path-safe + ownership-safe create. Rejects existing files (use edit_file to overwrite).
 */
export async function createFileSafe(
  root: string,
  relativePath: string,
  content: string,
): Promise<FileDiffResult> {
  const abs = await resolveOwnedWritePath(root, relativePath);
  const rel = normalizeRel(relativePath);
  try {
    await fs.access(abs);
    throw new Error(`file_exists: ${rel}`);
  } catch (error) {
    if (error instanceof PathEscapeError) throw error;
    if (error instanceof Error && error.message.startsWith("file_exists:")) throw error;
    // ENOENT — ok to create
  }
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await atomicWriteTextFile(abs, content);
  return {
    path: rel,
    action: "create",
    beforeBytes: 0,
    afterBytes: Buffer.byteLength(content, "utf8"),
    diff: buildUnifiedDiff(rel, "", content),
  };
}

/**
 * Path-safe edit. Prefer exact oldContent match or line-range replacement over blind overwrite.
 */
export async function editFileSafe(
  root: string,
  relativePath: string,
  options: {
    content?: string;
    oldContent?: string;
    startLine?: number;
    endLine?: number;
    replacement?: string;
  },
): Promise<FileDiffResult> {
  const abs = await resolveOwnedWritePath(root, relativePath);
  const rel = normalizeRel(relativePath);
  const before = await fs.readFile(abs, "utf8");
  let after: string;

  if (
    typeof options.startLine === "number" &&
    typeof options.endLine === "number" &&
    typeof options.replacement === "string"
  ) {
    const lines = before.split(/\r?\n/);
    const start = Math.max(1, options.startLine);
    const end = Math.max(start, options.endLine);
    if (start > lines.length) {
      throw new Error(`invalid_range: startLine ${start} beyond file length ${lines.length}`);
    }
    const head = lines.slice(0, start - 1);
    const tail = lines.slice(end);
    const mid = options.replacement.split(/\r?\n/);
    after = [...head, ...mid, ...tail].join("\n");
  } else if (typeof options.oldContent === "string" && typeof options.content === "string") {
    if (!before.includes(options.oldContent)) {
      throw new Error("old_content_mismatch: exact oldContent not found in file");
    }
    after = before.replace(options.oldContent, options.content);
  } else if (typeof options.content === "string") {
    after = options.content;
  } else {
    throw new Error("invalid_argument: provide content, or oldContent+content, or line range");
  }

  await atomicWriteTextFile(abs, after);
  return {
    path: rel,
    action: "edit",
    beforeBytes: Buffer.byteLength(before, "utf8"),
    afterBytes: Buffer.byteLength(after, "utf8"),
    diff: buildUnifiedDiff(rel, before, after),
  };
}

export async function deleteFileSafe(root: string, relativePath: string): Promise<FileDiffResult> {
  const abs = await resolveOwnedWritePath(root, relativePath);
  const rel = normalizeRel(relativePath);
  const before = await fs.readFile(abs, "utf8");
  await fs.unlink(abs);
  return {
    path: rel,
    action: "delete",
    beforeBytes: Buffer.byteLength(before, "utf8"),
    afterBytes: 0,
    diff: buildUnifiedDiff(rel, before, ""),
  };
}
