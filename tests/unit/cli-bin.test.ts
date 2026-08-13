import fs from "node:fs";
import fsPromises from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync, type SpawnSyncOptions, type SpawnSyncReturns } from "node:child_process";

import { afterEach, beforeAll, describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const npmBin = process.platform === "win32" ? "npm.cmd" : "npm";

const tempDirs: string[] = [];

async function tempDir(prefix: string): Promise<string> {
  const dir = await fsPromises.mkdtemp(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

function runNpm(args: string[], options: SpawnSyncOptions = {}): SpawnSyncReturns<string> {
  return spawnSync(npmBin, args, {
    encoding: "utf8",
    windowsHide: true,
    ...options,
  }) as SpawnSyncReturns<string>;
}

/** Run a package bin shim portably (Unix shebang shim or Windows .cmd). */
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
    const cmdShim = `${binPath}.cmd`;
    if (fs.existsSync(cmdShim)) {
      return spawnSync(cmdShim, args, opts) as SpawnSyncReturns<string>;
    }
    // ensure-cli-bin writes a JS shebang shim; invoke via node on Windows.
    return spawnSync(process.execPath, [binPath, ...args], opts) as SpawnSyncReturns<string>;
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
    expect(build.status, build.stderr || build.stdout).toBe(0);
  });

  it("links agentdoctor into node_modules/.bin after ensure-cli-bin", () => {
    const result = spawnSync(process.execPath, ["scripts/ensure-cli-bin.mjs"], {
      cwd: repoRoot,
      encoding: "utf8",
      windowsHide: true,
    });
    expect(result.status).toBe(0);
    const binPath = path.join(repoRoot, "node_modules", ".bin", "agentdoctor");
    expect(runPackageBin(binPath, ["--version"]).stdout.trim()).toMatch(/\d+\.\d+\.\d+/);
  });

  it("runs packed tarball CLI from an empty temporary directory", async () => {
    const pack = runNpm(["pack", "--silent"], { cwd: repoRoot });
    expect(pack.status).toBe(0);
    const tarballName = pack.stdout.trim().split("\n").pop();
    expect(tarballName).toBeTruthy();
    const tarballPath = path.join(repoRoot, tarballName!);
    tempDirs.push(tarballPath);

    const work = await tempDir("agentdoctor-pack-");
    const install = runNpm(["install", tarballPath, "--no-save"], { cwd: work });
    expect(install.status).toBe(0);
    const bin = path.join(work, "node_modules", ".bin", "agentdoctor");
    const version = runPackageBin(bin, ["--version"], { cwd: work });
    expect(version.status).toBe(0);
    expect(version.stdout.trim()).toMatch(/\d+\.\d+\.\d+/);
  });
});
