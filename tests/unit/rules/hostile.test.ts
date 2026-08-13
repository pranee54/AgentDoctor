import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { scan } from "../../../src/index.js";
import { PACKAGE_VERSION } from "../../../src/constants.js";
import { renderTerminalReport } from "../../../src/reporters/terminal/report.js";

const tempDirs: string[] = [];

async function tempRepo(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "agentdoctor-hostile-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((d) => fs.rm(d, { recursive: true, force: true })));
});

describe("hostile repository input", () => {
  it("sanitizes ANSI escape sequences in filenames in terminal output", async () => {
    const root = await tempRepo();
    await fs.writeFile(path.join(root, "package.json"), "{}\n");
    await fs.writeFile(path.join(root, "CLAUDE.md"), "See `docs/missing.md`\n");
    const nasty = `evil\u001b[31mname.md`;
    await fs.writeFile(path.join(root, nasty), "x");

    const result = await scan({ cwd: root });
    const output = renderTerminalReport(result);
    // ESC character must not appear in rendered output
    expect(output.includes("\u001b")).toBe(false);
  });

  it("does not follow symlinks outside the repository", async () => {
    const root = await tempRepo();
    const outside = await tempRepo();
    await fs.writeFile(path.join(outside, "secret.txt"), "OUTSIDE_SECRET_VALUE");
    await fs.writeFile(path.join(root, "package.json"), "{}\n");
    await fs.writeFile(path.join(root, "CLAUDE.md"), "# ok\n");
    try {
      await fs.symlink(outside, path.join(root, "escape-link"));
    } catch {
      // Some environments disallow symlinks — skip soft
      return;
    }

    const result = await scan({ cwd: root });
    const json = JSON.stringify(result);
    expect(json).not.toContain("OUTSIDE_SECRET_VALUE");
  });

  it("handles path traversal references without escaping", async () => {
    const root = await tempRepo();
    await fs.writeFile(path.join(root, "package.json"), "{}\n");
    await fs.writeFile(
      path.join(root, "CLAUDE.md"),
      "Do not read `../../etc/passwd` or `../outside.md`\n",
    );

    const result = await scan({ cwd: root });
    expect(result.findings.some((f) => f.ruleId === "instructions/missing-path-reference")).toBe(
      true,
    );
    expect(JSON.stringify(result)).not.toMatch(/root:.*:.*passwd/);
  });

  it("skips binary masquerading as markdown without crashing", async () => {
    const root = await tempRepo();
    await fs.writeFile(path.join(root, "package.json"), "{}\n");
    const buf = Buffer.alloc(64);
    buf[0] = 0;
    buf[1] = 255;
    await fs.writeFile(path.join(root, "CLAUDE.md"), buf);

    const result = await scan({ cwd: root });
    expect(result.version).toBe(PACKAGE_VERSION);
    expect(result.scoringAvailable).toBe(true);
    expect(result.scores).not.toBeNull();
  });
});
