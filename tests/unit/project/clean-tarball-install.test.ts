import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../..");

describe("clean npm tarball install smoke", () => {
  it("packs, installs into temp dir, and runs --version + help", () => {
    const packDir = fs.mkdtempSync(path.join(os.tmpdir(), "ad-pack-dest-"));
    const pack = spawnSync("npm", ["pack", "--json", "--pack-destination", packDir], {
      cwd: repoRoot,
      encoding: "utf8",
      timeout: 120_000,
    });
    expect(pack.status).toBe(0);
    const parsed = JSON.parse(pack.stdout) as Array<{ filename: string }>;
    const filename = parsed[0]?.filename;
    expect(filename).toMatch(/\.tgz$/);
    const tarball = path.isAbsolute(filename!)
      ? filename!
      : path.join(packDir, path.basename(filename!));
    expect(fs.existsSync(tarball)).toBe(true);

    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ad-pack-"));
    const install = spawnSync("npm", ["install", tarball, "--prefix", tmp], {
      encoding: "utf8",
      timeout: 180_000,
    });
    expect(install.status, install.stderr).toBe(0);

    const bin = path.join(tmp, "node_modules", ".bin", "agentdoctor");
    const ver = spawnSync(bin, ["--version"], { encoding: "utf8", timeout: 15_000 });
    expect(ver.status).toBe(0);
    expect(ver.stdout.trim()).toBe("3.0.1");

    const help = spawnSync(bin, ["--help"], { encoding: "utf8", timeout: 15_000 });
    expect(help.status).toBe(0);
    expect(help.stdout).toMatch(/Usage:/i);

    const list = spawnSync("tar", ["-tzf", tarball], { encoding: "utf8", timeout: 60_000 });
    expect(list.status).toBe(0);
    expect(list.stdout).not.toMatch(/(^|\/)\.private\//);
    expect(list.stdout).not.toMatch(/(^|\/)AgentDoctorOS\//);

    fs.rmSync(tmp, { recursive: true, force: true });
    fs.rmSync(packDir, { recursive: true, force: true });
  }, 300_000);
});
