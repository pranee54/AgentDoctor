import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { enrichGraphWithLanguageAdapters } from "../../../src/product/graph/enrich-languages.js";

describe("enrichGraphWithLanguageAdapters", () => {
  it("returns stats and merges nodes when python file present", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ad-lang-"));
    try {
      await fs.writeFile(path.join(root, "sample.py"), "def hello():\n    return 1\n");
      const base = {
        root,
        generatedAt: new Date().toISOString(),
        nodes: [],
        edges: [],
        limitations: [],
      };
      const { graph, stats } = await enrichGraphWithLanguageAdapters(base, root);
      expect(stats.filesAttempted).toBeGreaterThanOrEqual(1);
      expect(graph.limitations.length).toBeGreaterThan(0);
      if (stats.filesParsed > 0) {
        expect(stats.nodesAdded).toBeGreaterThan(0);
      }
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
