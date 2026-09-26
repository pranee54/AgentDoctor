import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { buildIncidentHypotheses } from "../../src/product/ops/incident.js";

describe("E2E incident flow", () => {
  it("builds hypotheses when changed files provided", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ad-e2e-incident-"));
    await fs.writeFile(path.join(root, "package.json"), JSON.stringify({ name: "incident-fix" }));
    try {
      const report = await buildIncidentHypotheses(root, {
        changedFiles: ["src/payments.ts", "src/auth/login.ts"],
      });
      expect(report.timeline.length).toBeGreaterThan(0);
      expect(report.timeline.some((t) => t.relatedPaths.length > 0)).toBe(true);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  }, 60_000);
});
