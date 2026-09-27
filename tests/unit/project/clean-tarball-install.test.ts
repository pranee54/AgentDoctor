import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../..");

/** Portable .tgz listing — avoids Windows `tar -tzf` exit-2 flakes under shell. */
function listTarGzEntries(tarballPath: string): string[] {
  const data = zlib.gunzipSync(fs.readFileSync(tarballPath));
  const names: string[] = [];
  let offset = 0;
  while (offset + 512 <= data.length) {
    const header = data.subarray(offset, offset + 512);
    if (header.every((b) => b === 0)) break;
    const name = header.subarray(0, 100).toString("utf8").replace(/\0.*$/, "");
    const prefix = header.subarray(345, 500).toString("utf8").replace(/\0.*$/, "");
    const sizeOctal = header.subarray(124, 136).toString("utf8").replace(/\0.*$/, "").trim();
    const size = Number.parseInt(sizeOctal, 8) || 0;
    const full = prefix ? `${prefix}/${name}` : name;
    if (full) names.push(full);
    offset += 512 + Math.ceil(size / 512) * 512;
  }
  return names;
}

describe("clean npm tarball install smoke", () => {
  it("packs, installs into temp dir, and runs --version + help", () => {
    const packDir = fs.mkdtempSync(path.join(os.tmpdir(), "ad-pack-dest-"));
    // Windows needs shell so `npm.cmd` resolves; pack can be slow under CI load.
    const pack = spawnSync("npm", ["pack", "--json", "--pack-destination", packDir], {
      cwd: repoRoot,
      encoding: "utf8",
      timeout: 300_000,
      shell: process.platform === "win32",
      env: { ...process.env, NO_COLOR: "1" },
    });
    expect(
      pack.status,
      `npm pack failed: status=${pack.status} signal=${pack.signal} err=${pack.error?.message ?? ""}\n${pack.stderr}`,
    ).toBe(0);
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
      shell: process.platform === "win32",
    });
    expect(install.status, install.stderr).toBe(0);

    const bin = path.join(tmp, "node_modules", ".bin", "agentdoctor");
    const ver = spawnSync(bin, ["--version"], {
      encoding: "utf8",
      timeout: 15_000,
      shell: process.platform === "win32",
    });
    expect(ver.status).toBe(0);
    expect(ver.stdout.trim()).toBe("3.0.3");

    const help = spawnSync(bin, ["--help"], {
      encoding: "utf8",
      timeout: 15_000,
      shell: process.platform === "win32",
    });
    expect(help.status).toBe(0);
    expect(help.stdout).toMatch(/Usage:/i);

    const entries = listTarGzEntries(tarball);
    expect(entries.length).toBeGreaterThan(10);
    const listing = entries.join("\n");
    expect(listing).not.toMatch(/(^|\/)\.private\//);
    expect(listing).not.toMatch(/(^|\/)AgentDoctorOS\//);

    fs.rmSync(tmp, { recursive: true, force: true });
    fs.rmSync(packDir, { recursive: true, force: true });
  }, 300_000);
});
