import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  discoverOwnership,
  matchCodeownersPattern,
  ownersForPath,
} from "../../../src/core/understanding/ownership/index.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((d) => fs.rm(d, { recursive: true, force: true })));
});

async function makeTemp(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "agentdoctor-ownership-"));
  tempDirs.push(dir);
  return dir;
}

describe("CODEOWNERS pattern matching", () => {
  it("matches anchored and wildcard patterns", () => {
    expect(matchCodeownersPattern("src/core/a.ts", "/src/")).toBe(true);
    expect(matchCodeownersPattern("docs/guide.md", "*.md")).toBe(true);
    expect(matchCodeownersPattern("packages/api/src/x.ts", "/packages/api/")).toBe(true);
    expect(matchCodeownersPattern("other/x.ts", "/packages/api/")).toBe(false);
  });
});

describe("discoverOwnership", () => {
  it("reads CODEOWNERS and package maintainers with evidence", async () => {
    const root = await makeTemp();
    await fs.mkdir(path.join(root, ".github"), { recursive: true });
    await fs.writeFile(
      path.join(root, ".github", "CODEOWNERS"),
      "# owners\n/src/ @platform-team\n*.md @docs-team\n",
      "utf8",
    );
    await fs.writeFile(
      path.join(root, "package.json"),
      JSON.stringify({
        name: "demo",
        author: "Ada <ada@example.com>",
        maintainers: ["Bob <bob@example.com>"],
      }),
      "utf8",
    );
    await fs.mkdir(path.join(root, "src"));
    await fs.writeFile(path.join(root, "src", "index.ts"), "export {};\n", "utf8");

    const result = await discoverOwnership({ cwd: root });
    expect(result.ownerships.length).toBeGreaterThanOrEqual(2);
    expect(result.ownerships.some((o) => o.source === "codeowners")).toBe(true);
    expect(result.ownerships.some((o) => o.source === "package-maintainers")).toBe(true);
    expect(result.ownerships.every((o) => o.evidence.length > 0)).toBe(true);
    expect(result.unknowns).toEqual([]);

    const srcOwner = ownersForPath("src/index.ts", result.ownerships);
    expect(srcOwner?.owners).toContain("@platform-team");
  });

  it("reports unknown when no ownership evidence exists", async () => {
    const root = await makeTemp();
    await fs.writeFile(path.join(root, "package.json"), JSON.stringify({ name: "x" }), "utf8");
    const result = await discoverOwnership({ cwd: root });
    expect(result.ownerships).toEqual([]);
    expect(result.unknowns.length).toBeGreaterThan(0);
  });
});
