/**
 * Cross-process STDIO MCP client proof: initialize → tools/list → tools/call.
 * This is the same transport path Cursor/Claude/Codex use.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

import { describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../..");
const fixtureSrc = path.join(repoRoot, "fixtures/understanding-dependencies-project");
const cliPath = path.join(repoRoot, "dist/cli/index.js");

describe("Brain MCP STDIO protocol (cross-process)", () => {
  it("initialize, list tools, call brain_overview with clean stdout protocol", async () => {
    await fs.access(cliPath);
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "mcp-stdio-"));
    await fs.cp(fixtureSrc, root, { recursive: true });

    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [cliPath, "brain-mcp", "--root", root],
      stderr: "pipe",
    });

    const client = new Client({ name: "agentdoctor-mcp-test", version: "0.0.0" });
    await client.connect(transport);

    const listed = await client.listTools();
    expect(listed.tools.map((t) => t.name).sort()).toEqual(
      [
        "brain_claims",
        "brain_delta",
        "brain_evidence",
        "brain_explain",
        "brain_overview",
        "brain_ownership",
        "brain_query",
        "brain_risk",
        "brain_snapshot",
        "brain_trace",
      ].sort(),
    );

    const overview = await client.callTool({ name: "brain_overview", arguments: {} });
    expect(overview.isError).not.toBe(true);
    const text = (overview.content as Array<{ type: string; text?: string }>).find(
      (c) => c.type === "text",
    )?.text;
    expect(text).toBeTruthy();
    const parsed = JSON.parse(String(text));
    expect(parsed.ok).toBe(true);
    expect(parsed.snapshot.id).toMatch(/^snap_/);
    expect(typeof parsed.confidence).toBe("number");
    expect(Array.isArray(parsed.evidenceIds)).toBe(true);

    const rejected = await client.callTool({
      name: "brain_query",
      arguments: { type: "$(rm -rf /)" },
    });
    expect(rejected.isError).toBe(true);

    await client.close();
    await fs.rm(root, { recursive: true, force: true });
  }, 120_000);
});
