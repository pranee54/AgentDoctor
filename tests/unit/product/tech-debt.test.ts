import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { buildTechnicalDebtRoadmap } from "../../../src/product/techdebt/roadmap.js";

describe("technical debt roadmap", () => {
  it("counts TODO markers", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ad-debt-"));
    try {
      await fs.writeFile(path.join(root, "work.ts"), "// TODO: fix later\n");
      const report = await buildTechnicalDebtRoadmap(root);
      expect(report.metrics.todoCount).toBeGreaterThanOrEqual(1);
      expect(report.items.some((i) => i.category === "todo")).toBe(true);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
