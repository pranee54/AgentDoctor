import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { buildSoftwareDigitalTwin } from "../../../src/product/twin/store.js";

describe("digital twin", () => {
  it("returns composed snapshot", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ad-twin-"));
    await fs.writeFile(path.join(root, "package.json"), JSON.stringify({ name: "t" }));
    try {
      const twin = await buildSoftwareDigitalTwin(root);
      expect(twin.dna.name).toBeTruthy();
      expect(twin.limitations.length).toBeGreaterThan(0);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
