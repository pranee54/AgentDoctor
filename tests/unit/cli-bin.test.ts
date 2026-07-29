import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import { afterEach, describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");

const tempDirs: string[] = [];

async function tempDir(prefix: string): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((d) => fs.rm(d, { recursive: true, force: true })));
});

describe("local CLI bin reliability", () => {
  it("links agentdoctor into node_modules/.bin after ensure-cli-bin", () => {
    const result = spawnSync(process.execPath, ["scripts/ensure-cli-bin.mjs"], {
      cwd: repoRoot,
      encoding: "utf8",
    });
    expect(result.status).toBe(0);
    const binPath = path.join(repoRoot, "node_modules", ".bin", "agentdoctor");
    expect(spawnSync(binPath, ["--version"], { encoding: "utf8" }).stdout.trim()).toMatch(
      /\d+\.\d+\.\d+/,
    );
  });

  it("runs packed tarball CLI from an empty temporary directory", async () => {
    const pack = spawnSync("npm", ["pack", "--silent"], {
      cwd: repoRoot,
      encoding: "utf8",
    });
    expect(pack.status).toBe(0);
    const tarballName = pack.stdout.trim().split("\n").pop();
    expect(tarballName).toBeTruthy();
    const tarballPath = path.join(repoRoot, tarballName!);
    tempDirs.push(tarballPath);

    const work = await tempDir("agentdoctor-pack-");
    const install = spawnSync("npm", ["install", tarballPath, "--no-save"], {
      cwd: work,
      encoding: "utf8",
    });
    expect(install.status).toBe(0);
    const bin = path.join(work, "node_modules", ".bin", "agentdoctor");
    const version = spawnSync(bin, ["--version"], { cwd: work, encoding: "utf8" });
    expect(version.status).toBe(0);
    expect(version.stdout.trim()).toMatch(/\d+\.\d+\.\d+/);
  });
});
