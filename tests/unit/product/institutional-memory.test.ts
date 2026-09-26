import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { appendChangeLedgerEntry } from "../../../src/product/ledger/change-ledger.js";
import { queryMemory } from "../../../src/product/memory/institutional.js";

describe("institutional memory", () => {
  it("finds change ledger entries by query", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ad-mem-"));
    try {
      await fs.writeFile(
        path.join(root, "package.json"),
        JSON.stringify({ name: "mem-fixture", private: true }),
        "utf8",
      );
      await appendChangeLedgerEntry(root, { task: "unique-memory-token-xyz", note: "done" });
      const result = await queryMemory(root, "unique-memory-token-xyz");
      expect(result.hits.some((h) => h.source === "change-ledger")).toBe(true);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
