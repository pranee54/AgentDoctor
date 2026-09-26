import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { appendChangeLedgerEntry } from "../../../src/product/ledger/change-ledger.js";
import { queryMemory } from "../../../src/product/memory/institutional.js";
import { buildProjectDna, persistProjectDna } from "../../../src/product/dna/build.js";

describe("cross-project institutional memory isolation", () => {
  it("project B does not see project A ledger or DNA facts", async () => {
    const token = `cross_mem_${Date.now().toString(36)}`;
    const rootA = await fs.mkdtemp(path.join(os.tmpdir(), "ad-mem-A-"));
    const rootB = await fs.mkdtemp(path.join(os.tmpdir(), "ad-mem-B-"));
    try {
      await fs.writeFile(
        path.join(rootA, "package.json"),
        JSON.stringify({ name: `project-a-${token}`, private: true }),
        "utf8",
      );
      await fs.writeFile(
        path.join(rootB, "package.json"),
        JSON.stringify({ name: "project-b-unrelated", private: true }),
        "utf8",
      );

      await appendChangeLedgerEntry(rootA, {
        task: token,
        note: `secret fact only in A ${token}`,
        files: ["src/only-a.ts"],
      });

      const dnaA = await buildProjectDna(rootA);
      dnaA.name = `dna-marker-${token}`;
      await persistProjectDna(rootA, dnaA);

      const hitsB = await queryMemory(rootB, token);
      expect(hitsB.hits.some((h) => h.excerpt.includes(token))).toBe(false);

      const hitsA = await queryMemory(rootA, token);
      expect(hitsA.hits.length).toBeGreaterThan(0);
    } finally {
      await fs.rm(rootA, { recursive: true, force: true });
      await fs.rm(rootB, { recursive: true, force: true });
    }
  });
});
