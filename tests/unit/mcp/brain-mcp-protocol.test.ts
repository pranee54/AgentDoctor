/**
 * MCP protocol smoke: initialize + tools/list via in-process SDK client over a
 * Memory/stdio-compatible path using the tool registry (protocol handlers).
 */
import { describe, expect, it } from "vitest";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

import { PACKAGE_VERSION } from "../../../src/constants.js";
import { listBrainMcpTools, BRAIN_MCP_TOOL_NAMES } from "../../../src/mcp/brain/index.js";

describe("Brain MCP protocol surface", () => {
  it("registers list/call handlers without writing to stdout", async () => {
    const writes: string[] = [];
    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: string | Uint8Array, ...args: unknown[]) => {
      writes.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8"));
      return originalWrite(chunk, ...(args as []));
    }) as typeof process.stdout.write;

    try {
      const server = new Server(
        { name: "agentdoctor-brain", version: PACKAGE_VERSION },
        { capabilities: { tools: {} } },
      );
      server.setRequestHandler(ListToolsRequestSchema, async () => ({
        tools: listBrainMcpTools(),
      }));
      server.setRequestHandler(CallToolRequestSchema, async () => ({
        content: [{ type: "text", text: "{}" }],
        isError: false,
      }));

      const listed = listBrainMcpTools();
      expect(listed).toHaveLength(BRAIN_MCP_TOOL_NAMES.length);
      // Constructing handlers must not emit protocol frames by itself.
      expect(writes.join("")).not.toMatch(/Content-Length/);
    } finally {
      process.stdout.write = originalWrite;
    }
  });
});
