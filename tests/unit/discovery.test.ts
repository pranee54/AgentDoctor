import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { discoverFiles } from "../../src/discovery/files.js";
import { scan } from "../../src/index.js";

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

  it("keeps oversized log-like paths as metadata for context rules", async () => {
    const root = await makeTempRepo();
    await fs.writeFile(path.join(root, "small.txt"), "ok");
    await fs.writeFile(path.join(root, "debug-app.log"), Buffer.alloc(1000));
    await fs.writeFile(path.join(root, "huge.bin"), Buffer.alloc(1000));

    const result = await discoverFiles({ root, maxFileSizeBytes: 100 });
    const relatives = result.files.map((f) => f.relativePath);
    expect(relatives).toContain("small.txt");
    expect(relatives).toContain("debug-app.log");
    expect(relatives).not.toContain("huge.bin");
    expect(result.files.find((f) => f.relativePath === "debug-app.log")?.sizeBytes).toBe(1000);
    expect(result.filesSkippedOversized).toBe(1);
  });

  it("flags oversized logs above the content-read limit (false-negative regression)", async () => {
    const root = await makeTempRepo();
    await fs.writeFile(path.join(root, "package.json"), '{"name":"oversized-log"}');
    await fs.writeFile(path.join(root, "AGENTS.md"), "# agents\n");
    // Default discovery max is 2 MiB; large-log threshold is 256 KiB.
    await fs.writeFile(path.join(root, "debug-app.log"), Buffer.alloc(3 * 1024 * 1024));

    const result = await scan({ cwd: root });
    const finding = result.findings.find((f) => f.ruleId === "context/large-log-file");
    expect(finding).toBeDefined();
    expect(finding?.evidence?.path).toBe("debug-app.log");
  });
});
