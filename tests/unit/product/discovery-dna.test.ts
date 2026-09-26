import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { discoverProjectRoots } from "../../../src/product/discovery/roots.js";
import { buildProjectDna } from "../../../src/product/dna/build.js";

describe("discovery and DNA", () => {
  it("blocks scanning the user home directory", async () => {
    const home = os.homedir();
    const report = await discoverProjectRoots({ cwd: home, maxEntries: 5000 });
    expect(report.blocked).toBe(true);
    expect(report.blockReason).toMatch(/Refusing/i);
  });

  it("discovers project with package.json in temp dir", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ad-disc-"));
    try {
      await fs.writeFile(path.join(root, "package.json"), JSON.stringify({ name: "disc-test" }));
      const report = await discoverProjectRoots({ cwd: root, maxEntries: 5000 });
      expect(report.blocked).toBe(false);
      expect(report.candidates.some((c) => c.root === root)).toBe(true);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("buildProjectDna fingerprints temp project", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ad-dna-"));
    try {
      await fs.writeFile(path.join(root, "package.json"), JSON.stringify({ name: "dna-test" }));
      await fs.mkdir(path.join(root, "src"), { recursive: true });
      await fs.writeFile(path.join(root, "src", "index.ts"), "export {};\n");
      const dna = await buildProjectDna(root);
      expect(dna.name).toBe("dna-test");
      expect(dna.fingerprint.length).toBeGreaterThan(8);
      expect(dna.limitations.length).toBeGreaterThan(0);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
