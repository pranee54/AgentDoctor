import fs from "node:fs/promises";
import path from "node:path";

import { DEFAULT_MAX_FILE_SIZE_BYTES } from "../constants.js";
import { isPathInsideRoot, toPosixRelative } from "../utils/path.js";
import type {
  AgentConfigFile,
  AgentConfigFileKind,
  AgentConfigScope,
  AgentConfigStatus,
} from "./types.js";

export interface InspectedFile {
  relativePath: string;
  absolutePath: string;
  exists: boolean;
  readable: boolean;
  sizeBytes: number;
  empty: boolean;
  isSymlink: boolean;
  /** Raw UTF-8 text when readable and within size limit; otherwise null. */
  text: string | null;
  error?: string;
}

/**
 * Safely inspect a file under the repository root.
 * Never follows paths outside the root.
 */
export async function inspectRepoFile(
  root: string,
  relativePath: string,
  maxFileSizeBytes = DEFAULT_MAX_FILE_SIZE_BYTES,
): Promise<InspectedFile> {
  const absolutePath = path.resolve(root, relativePath);
  const normalizedRelative = toPosixRelative(root, absolutePath);

  if (!isPathInsideRoot(root, absolutePath)) {
    return {
      relativePath: normalizedRelative,
      absolutePath,
      exists: false,
      readable: false,
      sizeBytes: 0,
      empty: true,
      isSymlink: false,
      text: null,
      error: "Path escapes repository root",
    };
  }

  try {
    // Open first, then inspect via the same handle (avoids TOCTOU with prior lstat/stat).
    const handle = await fs.open(absolutePath, "r");
    try {
      const lstat = await fs.lstat(absolutePath);
      const isSymlink = lstat.isSymbolicLink();
      if (isSymlink) {
        const real = await fs.realpath(absolutePath);
        if (!isPathInsideRoot(root, real)) {
          return {
            relativePath: normalizedRelative,
            absolutePath,
            exists: true,
            readable: false,
            sizeBytes: 0,
            empty: true,
            isSymlink: true,
            text: null,
            error: "Symlink target is outside repository root",
          };
        }
      }

      const stat = await handle.stat();
      if (!stat.isFile()) {
        return {
          relativePath: normalizedRelative,
          absolutePath,
          exists: true,
          readable: false,
          sizeBytes: 0,
          empty: true,
          isSymlink,
          text: null,
          error: "Not a regular file",
        };
      }

      const sizeBytes = Number(stat.size);
      if (sizeBytes === 0) {
        return {
          relativePath: normalizedRelative,
          absolutePath,
          exists: true,
          readable: true,
          sizeBytes: 0,
          empty: true,
          isSymlink,
          text: "",
        };
      }

      if (sizeBytes > maxFileSizeBytes) {
        return {
          relativePath: normalizedRelative,
          absolutePath,
          exists: true,
          readable: false,
          sizeBytes,
          empty: false,
          isSymlink,
          text: null,
          error: "File exceeds max size limit",
        };
      }

      const text = await handle.readFile("utf8");
      const trimmedEmpty = text.trim().length === 0;

      return {
        relativePath: normalizedRelative,
        absolutePath,
        exists: true,
        readable: true,
        sizeBytes,
        empty: trimmedEmpty,
        isSymlink,
        text,
      };
    } finally {
      await handle.close();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to read file";
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code: unknown }).code)
        : "";
    return {
      relativePath: normalizedRelative,
      absolutePath,
      exists: code !== "ENOENT",
      readable: false,
      sizeBytes: 0,
      empty: true,
      isSymlink: false,
      text: null,
      error: message,
    };
  }
}

export async function pathExistsInsideRoot(root: string, relativePath: string): Promise<boolean> {
  const absolutePath = path.resolve(root, relativePath);
  if (!isPathInsideRoot(root, absolutePath)) {
    return false;
  }
  try {
    await fs.access(absolutePath);
    return true;
  } catch {
    return false;
  }
}

export function toAgentConfigFile(
  inspected: InspectedFile,
  kind: AgentConfigFileKind,
  options: {
    legacy?: boolean;
    scope?: AgentConfigScope;
    parseError?: string;
  } = {},
): AgentConfigFile {
  const file: AgentConfigFile = {
    relativePath: inspected.relativePath,
    kind,
    sizeBytes: inspected.sizeBytes,
    empty: inspected.empty,
    readable: inspected.readable,
    legacy: options.legacy ?? false,
    scope: options.scope ?? (inspected.relativePath.includes("/") ? "nested" : "root"),
  };
  if (options.parseError !== undefined) {
    file.parseError = options.parseError;
  }
  return file;
}

export function tryParseJson(
  text: string,
): { ok: true; data: unknown } | { ok: false; error: string } {
  try {
    return { ok: true, data: JSON.parse(text) as unknown };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Invalid JSON",
    };
  }
}

export function deriveStatus(options: {
  detected: boolean;
  configured: boolean;
  hasErrors: boolean;
}): AgentConfigStatus {
  if (!options.detected) {
    return "absent";
  }
  if (options.hasErrors && !options.configured) {
    return "misconfigured";
  }
  if (options.configured) {
    return options.hasErrors ? "misconfigured" : "configured";
  }
  return "detected";
}
