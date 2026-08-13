import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

import type { RepositoryCatalogEntry } from "../types.js";
import { REAL_WORLD_CLONE_CONCURRENCY } from "../version.js";
import { checkoutPath, getCheckoutsRoot } from "./catalog.js";

const execFileAsync = promisify(execFile);

async function runGit(args: string[], cwd?: string): Promise<string> {
  const { stdout } = await execFileAsync("git", args, {
    cwd,
    maxBuffer: 20 * 1024 * 1024,
  });
  return stdout.trim();
}

export async function resolveCommitSha(url: string): Promise<string> {
  const stdout = await runGit(["ls-remote", url, "HEAD"]);
  const sha = stdout.split(/\s+/)[0];
  if (!sha || !/^[0-9a-f]{40}$/i.test(sha)) {
    throw new Error(`Unable to resolve HEAD for ${url}: ${stdout}`);
  }
  return sha.toLowerCase();
}

export async function ensureCheckout(entry: RepositoryCatalogEntry): Promise<string> {
  const target = checkoutPath(entry.id);
  fs.mkdirSync(getCheckoutsRoot(), { recursive: true });

  if (fs.existsSync(path.join(target, ".git"))) {
    const head = await runGit(["rev-parse", "HEAD"], target);
    if (head.toLowerCase() === entry.commitSha.toLowerCase()) {
      return target;
    }
    await runGit(["fetch", "--depth", "1", "origin", entry.commitSha], target);
    await runGit(["checkout", "--force", "FETCH_HEAD"], target);
    const verified = await runGit(["rev-parse", "HEAD"], target);
    if (verified.toLowerCase() !== entry.commitSha.toLowerCase()) {
      // Some hosts return a different object when fetching by SHA with depth 1.
      // Fall through to fresh clone.
      fs.rmSync(target, { recursive: true, force: true });
    } else {
      return target;
    }
  }

  if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: true });
  }

  fs.mkdirSync(target, { recursive: true });
  await runGit(["init"], target);
  await runGit(["remote", "add", "origin", entry.url], target);
  try {
    await runGit(["fetch", "--depth", "1", "origin", entry.commitSha], target);
    await runGit(["checkout", "--force", "FETCH_HEAD"], target);
  } catch {
    // Fallback: shallow clone default branch then reset if possible.
    fs.rmSync(target, { recursive: true, force: true });
    await runGit([
      "clone",
      "--depth",
      "1",
      "--single-branch",
      entry.url,
      target,
    ]);
    const head = await runGit(["rev-parse", "HEAD"], target);
    if (entry.commitSha !== "PENDING" && head.toLowerCase() !== entry.commitSha.toLowerCase()) {
      try {
        await runGit(["fetch", "--depth", "1", "origin", entry.commitSha], target);
        await runGit(["checkout", "--force", "FETCH_HEAD"], target);
      } catch {
        // Keep HEAD; pin will be updated by pin-shas step.
      }
    }
  }

  return target;
}

export async function ensureAllCheckouts(
  entries: readonly RepositoryCatalogEntry[],
  onProgress?: (id: string, status: "ok" | "error", detail: string) => void,
): Promise<Map<string, string>> {
  const paths = new Map<string, string>();
  const queue = [...entries];
  const workers = Array.from(
    { length: Math.min(REAL_WORLD_CLONE_CONCURRENCY, queue.length) },
    async () => {
      while (queue.length > 0) {
        const entry = queue.shift();
        if (!entry) {
          return;
        }
        try {
          const dir = await ensureCheckout(entry);
          paths.set(entry.id, dir);
          onProgress?.(entry.id, "ok", dir);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          onProgress?.(entry.id, "error", message);
        }
      }
    },
  );
  await Promise.all(workers);
  return paths;
}
