import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { analyzeWhatIf } from "../../src/product/whatif/engine.js";

describe("E2E what-if service", () => {
  it("reports affected items for a target file", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ad-e2e-whatif-"));
    await fs.mkdir(path.join(root, "src"), { recursive: true });
    await fs.writeFile(path.join(root, "package.json"), JSON.stringify({ name: "whatif-fix" }));
    await fs.writeFile(path.join(root, "src", "core.ts"), "export const core = 1;\n");
    await fs.writeFile(
      path.join(root, "src", "consumer.ts"),
      'import { core } from "./core";\nexport const x = core;\n',
    );
    try {
      const report = await analyzeWhatIf(root, "src/core.ts");
      expect(report.target).toMatch(/core\.ts/);
      expect(report.affected.length).toBeGreaterThan(0);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  }, 60_000);
});
