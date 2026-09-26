import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { analyzeEvents } from "../../../src/product/events/doctor.js";

describe("events doctor", () => {
  it("detects bull import", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ad-ev-"));
    await fs.writeFile(path.join(root, "worker.ts"), "import Queue from 'bull';\n");
    try {
      const report = await analyzeEvents(root);
      expect(report.nodes.some((n) => n.label.includes("Bull"))).toBe(true);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
