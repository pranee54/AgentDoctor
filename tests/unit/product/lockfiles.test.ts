import { describe, expect, it } from "vitest";

import {
  parsePackageLockJson,
  parsePnpmLockYaml,
  parseYarnLock,
} from "../../../src/product/deps/lockfiles.js";

describe("lockfile parsers", () => {
  it("parses npm v3 packages map", () => {
    const parsed = parsePackageLockJson(
      JSON.stringify({
        lockfileVersion: 3,
        packages: {
          "": { name: "root", version: "1.0.0" },
          "node_modules/lodash": { version: "4.17.21" },
        },
      }),
      "package-lock.json",
    );
    expect(parsed.packages.some((p) => p.name === "lodash" && p.version === "4.17.21")).toBe(true);
    expect(parsed.packages[0]?.truth).toBe("VERIFIED");
  });

  it("parses yarn.lock version blocks", () => {
    const parsed = parseYarnLock(
      `lodash@^4.0.0:\n  version "4.17.21"\n  resolved "https://example.com"\n`,
      "yarn.lock",
    );
    expect(parsed.packages.some((p) => p.name === "lodash")).toBe(true);
  });

  it("parses pnpm packages keys heuristically", () => {
    const parsed = parsePnpmLockYaml(
      `lockfileVersion: 5.6\npackages:\n  /lodash@4.17.21:\n    resolution: {integrity: x}\n`,
      "pnpm-lock.yaml",
    );
    expect(parsed.packages.some((p) => p.name === "lodash" && p.version === "4.17.21")).toBe(true);
  });
});
