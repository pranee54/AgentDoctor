import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { atomicWriteTextFile } from "../../../src/utils/fs.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((d) => fs.rm(d, { recursive: true, force: true })));
});

describe("atomicWriteTextFile", () => {
  it("creates a new file", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "agentdoctor-atomic-"));
    tempDirs.push(dir);
    const target = path.join(dir, "out.txt");
    await atomicWriteTextFile(target, "one\n");
    expect(await fs.readFile(target, "utf8")).toBe("one\n");
  });

  it("overwrites an existing destination (Windows-safe replace)", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "agentdoctor-atomic-"));
    tempDirs.push(dir);
    const target = path.join(dir, "out.txt");
    await fs.writeFile(target, "old\n", "utf8");
    await atomicWriteTextFile(target, "new\n");
    expect(await fs.readFile(target, "utf8")).toBe("new\n");
  });
});
