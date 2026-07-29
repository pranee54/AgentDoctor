import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { discoverFiles } from "../../src/discovery/files.js";

const tempDirs: string[] = [];

async function makeTempRepo(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "agentdoctor-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map(async (dir) => {
      await fs.rm(dir, { recursive: true, force: true });
    }),
  );
});

describe("discoverFiles", () => {
  it("discovers files and skips node_modules", async () => {
    const root = await makeTempRepo();
    await fs.mkdir(path.join(root, "src"), { recursive: true });
    await fs.mkdir(path.join(root, "node_modules", "left-pad"), { recursive: true });
    await fs.writeFile(path.join(root, "package.json"), "{}");
    await fs.writeFile(path.join(root, "src", "index.ts"), "export {};");
    await fs.writeFile(path.join(root, "node_modules", "left-pad", "index.js"), "module.exports=1");

    const result = await discoverFiles({ root });
    const relatives = result.files.map((f) => f.relativePath);

    expect(relatives).toContain("package.json");
    expect(relatives).toContain("src/index.ts");
    expect(relatives.some((p) => p.includes("node_modules"))).toBe(false);
    expect(result.directoriesSkipped).toContain("node_modules");
  });

  it("skips oversized files", async () => {
    const root = await makeTempRepo();
    await fs.writeFile(path.join(root, "small.txt"), "ok");
    await fs.writeFile(path.join(root, "huge.bin"), Buffer.alloc(1000));

    const result = await discoverFiles({ root, maxFileSizeBytes: 100 });
    expect(result.files.map((f) => f.relativePath)).toEqual(["small.txt"]);
    expect(result.filesSkippedOversized).toBe(1);
  });
});
