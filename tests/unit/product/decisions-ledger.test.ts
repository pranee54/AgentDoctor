import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { loadDecisionLedger } from "../../../src/product/decisions/ledger.js";

describe("decisions ledger", () => {
  it("parses ADR markdown", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ad-dec-"));
    await fs.mkdir(path.join(root, "docs", "adr"), { recursive: true });
    await fs.writeFile(
      path.join(root, "docs", "adr", "001-cache.md"),
      "# Use Redis for cache\n\n**Status**: Accepted\n",
    );
    try {
      const report = await loadDecisionLedger(root);
      const hit = report.decisions.find((d) => d.title.includes("Redis"));
      expect(hit).toBeTruthy();
      expect(hit?.ownership).toBe("project_owned");
      expect(hit?.sourceKind).toBe("adr_file");
      expect(hit?.truthMeaning).toMatch(/File evidence/i);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
