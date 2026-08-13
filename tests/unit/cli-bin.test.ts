import fs from "node:fs";
import fsPromises from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync, type SpawnSyncOptions, type SpawnSyncReturns } from "node:child_process";

import { afterEach, beforeAll, describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");

const tempDirs: string[] = [];

async function tempDir(prefix: string): Promise<string> {
  const dir = await fsPromises.mkdtemp(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

/** Resolve npm's JS CLI next to the running Node binary (avoids Windows .cmd spawn). */
function resolveNpmCliJs(): string {
  const candidates = [
    path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js"),
    path.join(
      path.dirname(process.execPath),
      "..",
      "lib",
      "node_modules",
      "npm",
      "bin",
      "npm-cli.js",
    ),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  throw new Error(
    `Unable to locate npm-cli.js beside Node at ${process.execPath}. Tried:\n${candidates.join("\n")}`,
  );
}

function spawnMessage(result: SpawnSyncReturns<string>): string {
  const parts = [
    result.error ? String(result.error) : "",
    result.stderr || "",
    result.stdout || "",
  ].filter(Boolean);
  return parts.join("\n") || "(no spawn output)";
}

function runNpm(args: string[], options: SpawnSyncOptions = {}): SpawnSyncReturns<string> {
  return spawnSync(process.execPath, [resolveNpmCliJs(), ...args], {
    encoding: "utf8",
    windowsHide: true,
    ...options,
  }) as SpawnSyncReturns<string>;
}

function isPosixShellBinShim(filePath: string): boolean {
  try {
    const head = fs.readFileSync(filePath, "utf8").slice(0, 240);
    return head.includes("basedir=$(") || /#!\s*\/(?:usr\/)?bin\/(?:env\s+)?(?:ba)?sh/.test(head);
  } catch {
    return false;
  }
}

/**
 * Run a package bin portably.
 * Never spawn .cmd/.bat or POSIX sh shims with Node on Windows.
 */
function runPackageBin(
  binPath: string,
  args: string[],
  options: SpawnSyncOptions = {},
): SpawnSyncReturns<string> {
  const opts: SpawnSyncOptions = {
    encoding: "utf8",
    windowsHide: true,
    ...options,
  };
  if (process.platform === "win32") {
    const pkgCli = path.join(
      path.dirname(binPath),
      "..",
      "@praneeth_54",
      "agentdoctor",
      "dist",
      "cli",
      "index.js",
    );
    // Prefer the real package entry (npm pack install) over the POSIX .bin shim.
    if (fs.existsSync(pkgCli)) {
      return spawnSync(process.execPath, [pkgCli, ...args], opts) as SpawnSyncReturns<string>;
    }
    // ensure-cli-bin writes a JS shim; skip npm's shell wrapper if present.
    if (fs.existsSync(binPath) && !isPosixShellBinShim(binPath)) {
      return spawnSync(process.execPath, [binPath, ...args], opts) as SpawnSyncReturns<string>;
    }
    throw new Error(`Unable to resolve package CLI for bin ${binPath}`);
  }
  return spawnSync(binPath, args, opts) as SpawnSyncReturns<string>;
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((d) => fsPromises.rm(d, { recursive: true, force: true })),
  );
});

describe("local CLI bin reliability", () => {
  beforeAll(() => {
    const build = runNpm(["run", "build"], { cwd: repoRoot });
    expect(build.status, spawnMessage(build)).toBe(0);
  });

  it("links agentdoctor into node_modules/.bin after ensure-cli-bin", () => {
    const result = spawnSync(process.execPath, ["scripts/ensure-cli-bin.mjs"], {
      cwd: repoRoot,
      encoding: "utf8",
      windowsHide: true,
    });
    expect(result.status, spawnMessage(result as SpawnSyncReturns<string>)).toBe(0);
    const binPath = path.join(repoRoot, "node_modules", ".bin", "agentdoctor");
    const version = runPackageBin(binPath, ["--version"]);
    expect(version.status, spawnMessage(version)).toBe(0);
    expect(version.stdout.trim()).toMatch(/\d+\.\d+\.\d+/);
  });

  it("runs packed tarball CLI from an empty temporary directory", async () => {
    const pack = runNpm(["pack", "--silent"], { cwd: repoRoot });
    expect(pack.status, spawnMessage(pack)).toBe(0);
    const tarballName = pack.stdout.trim().split("\n").pop();
    expect(tarballName).toBeTruthy();
    const tarballPath = path.join(repoRoot, tarballName!);
    tempDirs.push(tarballPath);

    const work = await tempDir("agentdoctor-pack-");
    const install = runNpm(["install", tarballPath, "--no-save"], { cwd: work });
    expect(install.status, spawnMessage(install)).toBe(0);
    const bin = path.join(work, "node_modules", ".bin", "agentdoctor");
    const version = runPackageBin(bin, ["--version"], { cwd: work });
    expect(version.status, spawnMessage(version)).toBe(0);
    expect(version.stdout.trim()).toMatch(/\d+\.\d+\.\d+/);
  });
});
