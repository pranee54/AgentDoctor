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
      expect(report.decisions.some((d) => d.title.includes("Redis"))).toBe(true);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
