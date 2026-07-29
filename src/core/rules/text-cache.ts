import fs from "node:fs/promises";
import path from "node:path";

import { isPathInsideRoot, toPosixRelative } from "../../utils/path.js";

export interface CachedText {
  relativePath: string;
  text: string | null;
  sizeBytes: number;
  empty: boolean;
  binary: boolean;
  error?: string;
}

/**
 * Bounded UTF-8 text reader with per-path caching.
 * Skips binaries and oversized files without throwing.
 */
export class TextCache {
  private readonly cache = new Map<string, CachedText>();

  constructor(
    private readonly root: string,
    private readonly maxBytes: number,
  ) {}

  async read(relativePath: string): Promise<CachedText> {
    const existing = this.cache.get(relativePath);
    if (existing) {
      return existing;
    }

    const absolute = path.resolve(this.root, relativePath);
    if (!isPathInsideRoot(this.root, absolute)) {
      const blocked: CachedText = {
        relativePath,
        text: null,
        sizeBytes: 0,
        empty: true,
        binary: false,
        error: "Path escapes repository root",
      };
      this.cache.set(relativePath, blocked);
      return blocked;
    }

    try {
      const stat = await fs.stat(absolute);
      if (!stat.isFile()) {
        const result: CachedText = {
          relativePath: toPosixRelative(this.root, absolute),
          text: null,
          sizeBytes: 0,
          empty: true,
          binary: false,
          error: "Not a regular file",
        };
        this.cache.set(relativePath, result);
        return result;
      }

      const sizeBytes = Number(stat.size);
      if (sizeBytes > this.maxBytes) {
        const result: CachedText = {
          relativePath,
          text: null,
          sizeBytes,
          empty: false,
          binary: false,
          error: "File exceeds max read size",
        };
        this.cache.set(relativePath, result);
        return result;
      }

      const buffer = await fs.readFile(absolute);
      if (looksBinary(buffer)) {
        const result: CachedText = {
          relativePath,
          text: null,
          sizeBytes,
          empty: sizeBytes === 0,
          binary: true,
          error: "Binary file skipped",
        };
        this.cache.set(relativePath, result);
        return result;
      }

      const text = buffer.toString("utf8");
      const result: CachedText = {
        relativePath,
        text,
        sizeBytes,
        empty: text.trim().length === 0,
        binary: false,
      };
      this.cache.set(relativePath, result);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to read file";
      const result: CachedText = {
        relativePath,
        text: null,
        sizeBytes: 0,
        empty: true,
        binary: false,
        error: message,
      };
      this.cache.set(relativePath, result);
      return result;
    }
  }
}

function looksBinary(buffer: Buffer): boolean {
  const sample = buffer.subarray(0, Math.min(buffer.length, 8000));
  if (sample.includes(0)) {
    return true;
  }
  let suspicious = 0;
  for (const byte of sample) {
    if (byte < 7 || (byte > 13 && byte < 32)) {
      suspicious += 1;
    }
  }
  return suspicious / Math.max(sample.length, 1) > 0.3;
}
