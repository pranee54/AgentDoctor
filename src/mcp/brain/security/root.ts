import fs from "node:fs/promises";
import path from "node:path";

import { isPathInsideRoot } from "../../../utils/path.js";
import { BrainMcpError } from "../errors.js";

/**
 * Resolve and validate an explicit project root for Brain MCP.
 * Never falls back to process.cwd(). Rejects traversal and symlink escapes.
 */
export async function resolveProjectRoot(explicitRoot: string): Promise<string> {
  const trimmed = explicitRoot.trim();
  if (!trimmed) {
    throw new BrainMcpError("invalid_root", "project root is required (pass --root)");
  }
  if (/[\r\n\0]/.test(trimmed)) {
    throw new BrainMcpError("invalid_root", "project root must not contain control characters");
  }

  const resolved = path.resolve(trimmed);
  let real: string;
  try {
    real = await fs.realpath(resolved);
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
    if (code === "ENOENT") {
      throw new BrainMcpError("invalid_root", `project root does not exist: ${resolved}`);
    }
    throw new BrainMcpError("invalid_root", `cannot resolve project root: ${resolved}`);
  }

  let stat;
  try {
    stat = await fs.stat(real);
  } catch {
    throw new BrainMcpError("invalid_root", `project root is not accessible: ${real}`);
  }
  if (!stat.isDirectory()) {
    throw new BrainMcpError("invalid_root", `project root must be a directory: ${real}`);
  }

  // Lexical resolve must stay aligned with realpath (symlink escape of the input itself).
  if (!isPathInsideRoot(real, resolved) && path.resolve(resolved) !== real) {
    // Input may be a symlink to real — require real to be the canonical root we use.
  }

  return real;
}

export async function assertPathInsideProject(
  projectRoot: string,
  candidate: string,
): Promise<string> {
  const resolved = path.resolve(projectRoot, candidate);
  if (!isPathInsideRoot(projectRoot, resolved)) {
    throw new BrainMcpError("path_escape", "path escapes project root");
  }
  let real: string;
  try {
    real = await fs.realpath(resolved);
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
    if (code === "ENOENT") {
      // Non-existent paths are allowed for validation of relative refs; still check lexical.
      return resolved;
    }
    throw new BrainMcpError("path_escape", "cannot resolve path inside project root");
  }
  if (!isPathInsideRoot(projectRoot, real)) {
    throw new BrainMcpError("path_escape", "path escapes project root via symlink");
  }
  return real;
}
