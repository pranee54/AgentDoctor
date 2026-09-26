import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { analyzeCodeHealth } from "../../../src/product/health/code-health.js";

describe("code health", () => {
  it("counts TODO markers", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ad-health-"));
    await fs.writeFile(path.join(root, "src.ts"), "// TODO fix later\n");
    try {
      const report = await analyzeCodeHealth(root);
      const todo = report.indicators.find((i) => i.id === "todo-count");
      expect(todo?.value).toBe(1);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
