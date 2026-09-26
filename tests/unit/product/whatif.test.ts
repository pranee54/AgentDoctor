import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { analyzeWhatIf } from "../../../src/product/whatif/engine.js";

describe("what-if engine", () => {
  it("lists target without graph when build disabled", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ad-wi-"));
    await fs.writeFile(path.join(root, "foo.ts"), "export const x = 1;\n");
    try {
      const report = await analyzeWhatIf(root, "foo.ts", { buildGraph: false });
      expect(report.affected.some((a) => a.pathOrSymbol === "foo.ts")).toBe(true);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
