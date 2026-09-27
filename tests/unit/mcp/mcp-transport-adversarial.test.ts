/**
 * MCP JSON-RPC STDIO transport adversarial forge.
 * Uses the real `agentdoctor mcp` combined server — not executeAgentTool unit stubs alone.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { describe, expect, it } from "vitest";

import { pathExists } from "../../../src/utils/fs.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../..");
const cliPath = path.join(repoRoot, "dist/cli/index.js");
const MARKER = "FOREIGN_PROJECT_SECRET_123";

async function write(file: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, content, "utf8");
}

async function hostileFixture(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "ad-mcp-transport-"));
  await write(path.join(root, "package.json"), JSON.stringify({ name: "mcp-transport" }));
  await write(path.join(root, "src", "owned.ts"), "export const owned = 1;\n");
  await write(path.join(root, ".private", "secret.ts"), `export const s = "${MARKER}";\n`);
  await write(path.join(root, "AgentDoctorOS", "internal.ts"), "export const os = 1;\n");
  const nested = path.join(root, "nested-repo");
  await fs.mkdir(path.join(nested, ".git"), { recursive: true });
  await write(path.join(nested, "package.json"), "{}");
  await write(path.join(nested, "leak.ts"), "export const leak = 1;\n");
  await write(path.join(root, "fixtures", "foreign.ts"), "export const f = 1;\n");
  return root;
}

function textOf(result: unknown): string {
  const r = result as { content?: unknown; isError?: boolean };
  const content = r.content as Array<{ type: string; text?: string }> | undefined;
  return content?.find((c) => c.type === "text")?.text ?? JSON.stringify(result);
}

describe("MCP JSON-RPC STDIO transport adversarial forge", () => {
  it("denies foreign/forged file operations over real stdio transport", async () => {
    await fs.access(cliPath);
    const root = await hostileFixture();

    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [cliPath, "mcp", "--root", root],
      stderr: "pipe",
    });
    const client = new Client({ name: "ad-mcp-forge", version: "0.0.0" });
    await client.connect(transport);

    const listed = await client.listTools();
    expect(listed.tools.some((t) => t.name === "file_read")).toBe(true);
    expect(listed.tools.some((t) => t.name === "file_create")).toBe(true);

    const attacks: Array<{ tool: string; args: Record<string, unknown>; label: string }> = [
      { label: "owned_read", tool: "file_read", args: { path: "src/owned.ts" } },
      { label: "private_read", tool: "file_read", args: { path: ".private/secret.ts" } },
      { label: "os_read", tool: "file_read", args: { path: "AgentDoctorOS/internal.ts" } },
      { label: "nested_read", tool: "file_read", args: { path: "nested-repo/leak.ts" } },
      { label: "fixture_read", tool: "file_read", args: { path: "fixtures/foreign.ts" } },
      { label: "traversal_read", tool: "file_read", args: { path: "../etc/passwd" } },
      {
        label: "create_private_bare_approved",
        tool: "file_create",
        args: {
          path: ".private/pwned.ts",
          content: "pwn\n",
          approved: true,
        },
      },
      {
        label: "create_owned_forged_token",
        tool: "file_create",
        args: {
          path: "src/forged.ts",
          content: "x\n",
          approvalToken: "forged-not-real",
          approved: true,
        },
      },
      {
        label: "edit_os_forged",
        tool: "file_edit",
        args: {
          path: "AgentDoctorOS/internal.ts",
          content: "hacked\n",
          approvalToken: "forged",
          approved: true,
        },
      },
    ];

    const rows: Array<{ label: string; deniedOrSafe: boolean; snippet: string }> = [];

    for (const attack of attacks) {
      const result = (await client.callTool({
        name: attack.tool,
        arguments: attack.args,
      })) as { isError?: boolean; content?: unknown };
      const text = textOf(result);
      const blob = text.toLowerCase();
      const isOwnedAllow = attack.label === "owned_read";
      if (isOwnedAllow) {
        expect(result.isError).not.toBe(true);
        expect(text).toContain("owned");
        rows.push({ label: attack.label, deniedOrSafe: true, snippet: text.slice(0, 120) });
        continue;
      }
      const denied =
        result.isError === true ||
        blob.includes("ownership") ||
        blob.includes("approval") ||
        blob.includes("path_escape") ||
        blob.includes("escapes") ||
        blob.includes("trust_required") ||
        blob.includes('"ok":false') ||
        blob.includes('"ok": false');
      expect(text, attack.label).not.toContain(MARKER);
      expect(denied, `${attack.label}: ${text.slice(0, 300)}`).toBe(true);
      rows.push({ label: attack.label, deniedOrSafe: denied, snippet: text.slice(0, 120) });
    }

    expect(await pathExists(path.join(root, ".private", "pwned.ts"))).toBe(false);
    expect(await pathExists(path.join(root, "src", "forged.ts"))).toBe(false);
    expect(rows.every((r) => r.deniedOrSafe)).toBe(true);

    // Intelligence path tools must not return foreign markers
    const overview = await client.callTool({ name: "repo_overview", arguments: {} });
    expect(textOf(overview as unknown)).not.toContain(MARKER);
    expect(textOf(overview as unknown)).not.toContain(".private/secret");

    await client.close();
    await fs.rm(root, { recursive: true, force: true });
  }, 180_000);
});
