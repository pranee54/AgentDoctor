import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  appendChangeLedgerEntry,
  readChangeLedger,
} from "../../../src/product/ledger/change-ledger.js";

describe("change ledger", () => {
  it("appends and reads JSONL", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ad-cle-"));
    try {
      await appendChangeLedgerEntry(root, { task: "t1", files: ["src/a.ts"] });
      const ledger = await readChangeLedger(root);
      expect(ledger.entries.length).toBe(1);
      expect(ledger.entries[0]?.task).toBe("t1");
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
