import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { buildSoftwareMap } from "../../../src/product/map/software-map.js";

describe("software map", () => {
  it("builds tree with package node", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ad-map-"));
    await fs.writeFile(path.join(root, "package.json"), JSON.stringify({ name: "x" }));
    await fs.mkdir(path.join(root, "docs"), { recursive: true });
    try {
      const map = await buildSoftwareMap(root);
      expect(map.tree.children?.length).toBeGreaterThan(0);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
