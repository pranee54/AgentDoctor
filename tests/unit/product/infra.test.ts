import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { analyzeInfra } from "../../../src/product/ops/infra.js";

describe("infra analyze", () => {
  it("detects Dockerfile and compose services", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ad-infra-"));
    await fs.writeFile(path.join(root, "Dockerfile"), "FROM node:20\n");
    await fs.writeFile(
      path.join(root, "docker-compose.yml"),
      "services:\n  api:\n    image: x\n  web:\n    image: y\n",
    );
    try {
      const report = await analyzeInfra(root);
      expect(report.artifacts.some((a) => a.kind === "docker")).toBe(true);
      expect(report.services.some((s) => s.startsWith("api@"))).toBe(true);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
