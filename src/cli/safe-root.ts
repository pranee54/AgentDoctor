import { classifyBroadUserScanRoot } from "../product/discovery/roots.js";
import { EXIT_CODES, type ExitCode } from "../types/index.js";
import { isDirectory } from "../utils/fs.js";
import { resolveRepoRoot } from "../utils/path.js";

export type CliRootOk = { ok: true; root: string };
export type CliRootErr = { ok: false; message: string; code: ExitCode };

/**
 * Resolve a CLI project root and refuse home / Desktop / Downloads / Documents
 * (and similarly broad user folders) before any recursive intelligence work.
 */
export async function resolveCliProjectRoot(pathArg?: string): Promise<CliRootOk | CliRootErr> {
  const root = resolveRepoRoot(pathArg ?? process.cwd());
  if (!(await isDirectory(root))) {
    return {
      ok: false,
      message: `not a directory: ${root}`,
      code: EXIT_CODES.USAGE_ERROR,
    };
  }
  const broad = classifyBroadUserScanRoot(root);
  if (broad.blocked) {
    return { ok: false, message: broad.reason, code: EXIT_CODES.USAGE_ERROR };
  }
  return { ok: true, root };
}

/** Sync variant when the path is already known to exist (tests / internal). */
export function assertCliProjectRootSync(pathArg?: string): CliRootOk | CliRootErr {
  const root = resolveRepoRoot(pathArg ?? process.cwd());
  const broad = classifyBroadUserScanRoot(root);
  if (broad.blocked) {
    return { ok: false, message: broad.reason, code: EXIT_CODES.USAGE_ERROR };
  }
  return { ok: true, root };
}
