import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { buildIncidentHypotheses } from "../../../src/product/ops/incident.js";

describe("incident hypotheses", () => {
  it("marks changed files as VERIFIED", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ad-inc-"));
    await fs.writeFile(path.join(root, "a.ts"), "x");
    try {
      const report = await buildIncidentHypotheses(root, {
        changedFiles: ["a.ts"],
        gitHotspots: [{ path: "a.ts", commits: 10 }],
      });
      expect(report.timeline.some((t) => t.truth === "VERIFIED")).toBe(true);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
