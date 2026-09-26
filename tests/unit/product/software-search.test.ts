import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { searchSymbolsAndConcepts } from "../../../src/product/search/software-search.js";

describe("software search", () => {
  it("finds filename and content hits", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ad-search-"));
    try {
      await fs.writeFile(path.join(root, "unique-widget.ts"), "export const UNIQUE_TOKEN = 1;\n");
      const report = await searchSymbolsAndConcepts(root, "UNIQUE_TOKEN");
      expect(report.hits.length).toBeGreaterThan(0);
      expect(report.hits.some((h) => h.truth === "INFERRED" || h.truth === "VERIFIED")).toBe(true);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
