import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { analyzeDependencies } from "../../../src/product/deps/analyze.js";

describe("dependency analyze", () => {
  it("lists direct dependencies from package.json", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ad-deps-"));
    await fs.writeFile(
      path.join(root, "package.json"),
      JSON.stringify({ name: "a", dependencies: { lodash: "^4.0.0" } }),
    );
    await fs.writeFile(
      path.join(root, "package-lock.json"),
      JSON.stringify({
        lockfileVersion: 3,
        packages: { "node_modules/lodash": { version: "4.17.21" } },
      }),
    );
    try {
      const report = await analyzeDependencies(root);
      expect(report.directDependencies.some((d) => d.name === "lodash")).toBe(true);
      expect(report.lockfilesParsed).toContain("package-lock.json");
      expect(report.transitiveFromLockfile.some((p) => p.name === "lodash")).toBe(true);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
