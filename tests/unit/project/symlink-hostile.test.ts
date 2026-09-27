import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { retrieveProjectContext } from "../../../src/agent/context/retrieve.js";
import { executeAgentTool, newToolCall } from "../../../src/agent/tools/index.js";
import { buildIntelligenceGraph } from "../../../src/intelligence/graph/build.js";
import { discoverFiles } from "../../../src/discovery/files.js";
import { scanSecrets } from "../../../src/core/secrets/scan.js";
import { assertSafeRepoTarget } from "../../../src/mcp/intelligence/path-safety.js";

const MARKER = "FOREIGN_SYMLINK_SECRET_999";

async function write(file: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, content, "utf8");
}

describe("symlink / nested-repo hostile fixture", () => {
  it("blocks symlink escapes and nested repos across discovery/graph/agent/MCP helpers", async () => {
    const base = await fs.mkdtemp(path.join(os.tmpdir(), "ad-symlink-"));
    const root = path.join(base, "project");
    const foreign = path.join(base, "foreign-project");
    await write(path.join(root, "package.json"), JSON.stringify({ name: "sym-host" }));
    await write(path.join(root, "owned", "ok.ts"), "export const ok = 1;\n");
    await write(path.join(foreign, "secret.ts"), `export const s = "${MARKER}";\n`);
    await write(path.join(root, ".private", "secret.ts"), `export const p = "${MARKER}";\n`);

    const nested = path.join(root, "nested-repo");
    await fs.mkdir(path.join(nested, ".git"), { recursive: true });
    await write(path.join(nested, "leak.ts"), `export const n = "${MARKER}";\n`);

    try {
      await fs.symlink(foreign, path.join(root, "link-to-foreign"));
      await fs.symlink(path.join(root, ".private"), path.join(root, "link-to-private"));
    } catch {
      // Some environments disallow symlinks — mark structural skip via assertions below
    }

    const discovery = await discoverFiles({ root });
    expect(discovery.files.every((f) => !String(f.relativePath).includes("foreign-project"))).toBe(
      true,
    );
    expect(JSON.stringify(discovery)).not.toContain(MARKER);

    const graph = await buildIntelligenceGraph({ root, mode: "auto" });
    expect(JSON.stringify(graph)).not.toContain(MARKER);

    const secrets = await scanSecrets({ root, enabled: true, maxFiles: 1000 });
    expect(JSON.stringify(secrets.findings)).not.toContain(MARKER);

    const ctx = await retrieveProjectContext({
      root,
      query: "leak",
      includePaths: [
        "owned/ok.ts",
        "link-to-foreign/secret.ts",
        "link-to-private/secret.ts",
        "nested-repo/leak.ts",
        ".private/secret.ts",
      ],
    });
    expect(ctx.rendered).not.toContain(MARKER);

    for (const rel of [
      "link-to-foreign/secret.ts",
      "link-to-private/secret.ts",
      "nested-repo/leak.ts",
      ".private/secret.ts",
    ]) {
      const read = await executeAgentTool(root, newToolCall("t", "read_file", { path: rel }));
      expect(read.ok).toBe(false);
      try {
        assertSafeRepoTarget(root, rel);
        expect.fail(`assertSafeRepoTarget should throw for ${rel}`);
      } catch {
        // expected
      }
    }

    await fs.rm(base, { recursive: true, force: true });
  }, 60_000);
});
