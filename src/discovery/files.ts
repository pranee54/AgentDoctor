import fs from "node:fs/promises";
import path from "node:path";

import { DEFAULT_IGNORE_DIRECTORIES, DEFAULT_MAX_FILE_SIZE_BYTES } from "../constants.js";
import type { DiscoveredFile, DiscoveryResult } from "../types/index.js";
import { isPathInsideRoot, toPosixRelative } from "../utils/path.js";

export interface DiscoverFilesOptions {
  root: string;
  maxFileSizeBytes?: number;
  ignoreDirectories?: Set<string>;
}

/**
 * Walk the repository without blindly reading every file.
 * Skips common generated/dependency directories and records permission errors.
 */
export async function discoverFiles(options: DiscoverFilesOptions): Promise<DiscoveryResult> {
  const started = performance.now();
  const root = path.resolve(options.root);
  const maxFileSizeBytes = options.maxFileSizeBytes ?? DEFAULT_MAX_FILE_SIZE_BYTES;
  const ignoreDirectories = options.ignoreDirectories ?? DEFAULT_IGNORE_DIRECTORIES;

  const files: DiscoveredFile[] = [];
  const directoriesSkipped: string[] = [];
  const permissionErrors: string[] = [];
  let filesSkippedOversized = 0;

  const queue: string[] = [root];

  while (queue.length > 0) {
    const current = queue.pop();
    if (!current) {
      continue;
    }

    if (!isPathInsideRoot(root, current)) {
      continue;
    }

    let entries;
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "permission denied";
      permissionErrors.push(`${toPosixRelative(root, current) || "."}: ${message}`);
      continue;
    }

    for (const entry of entries) {
      const absolutePath = path.join(current, entry.name);
      const relativePath = toPosixRelative(root, absolutePath);

      if (!isPathInsideRoot(root, absolutePath)) {
        continue;
      }

      let isDirectory = entry.isDirectory();
      const isSymlink = entry.isSymbolicLink();
      let isFile = entry.isFile();

      // Resolve symlink type carefully without escaping the root.
      if (isSymlink) {
        try {
          const real = await fs.realpath(absolutePath);
          if (!isPathInsideRoot(root, real)) {
            continue;
          }
          const realStat = await fs.stat(real);
          isDirectory = realStat.isDirectory();
          isFile = realStat.isFile();
        } catch {
          continue;
        }
      }

      if (isDirectory) {
        if (ignoreDirectories.has(entry.name)) {
          directoriesSkipped.push(relativePath);
          continue;
        }
        queue.push(absolutePath);
        continue;
      }

      if (!isFile) {
        continue;
      }

      try {
        const stat = await fs.lstat(absolutePath);
        if (stat.size > maxFileSizeBytes) {
          filesSkippedOversized += 1;
          continue;
        }
        files.push({
          absolutePath,
          relativePath,
          sizeBytes: Number(stat.size),
          isSymlink,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "stat failed";
        permissionErrors.push(`${relativePath}: ${message}`);
      }
    }
  }

  files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));

  return {
    files,
    directoriesSkipped,
    filesSkippedOversized,
    permissionErrors,
    elapsedMs: Math.round(performance.now() - started),
  };
}

/**
 * Targeted existence checks for known config files (O(1) per path).
 */
export async function findKnownFiles(
  root: string,
  candidates: readonly string[],
): Promise<string[]> {
  const found: string[] = [];
  await Promise.all(
    candidates.map(async (relative) => {
      const absolute = path.join(root, relative);
      if (!isPathInsideRoot(root, absolute)) {
        return;
      }
      try {
        await fs.access(absolute);
        found.push(relative.split(path.sep).join("/"));
      } catch {
        // missing is fine
      }
    }),
  );
  return found.sort((a, b) => a.localeCompare(b));
}
