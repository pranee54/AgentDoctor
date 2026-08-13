import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

import { PACKAGE_VERSION } from "../../constants.js";
import { BrainMcpSession, type BrainMcpSessionOptions } from "./session.js";
import { invokeBrainMcpTool, listBrainMcpTools } from "./tools/registry.js";

export type StartBrainMcpServerOptions = BrainMcpSessionOptions;

/**
 * Start the AgentDoctor Brain MCP server over STDIO.
 * Protocol traffic goes to stdout; diagnostics to stderr only.
 */
export async function startBrainMcpServer(
  options: StartBrainMcpServerOptions,
): Promise<{ server: Server; session: BrainMcpSession }> {
  const session = new BrainMcpSession(options);
  await session.initialize();

  const server = new Server(
    {
      name: "agentdoctor-brain",
      version: PACKAGE_VERSION,
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: listBrainMcpTools(),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const name = request.params.name;
    const args = request.params.arguments ?? {};
    const { structured, isError } = await invokeBrainMcpTool(session, name, args);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(structured),
        },
      ],
      structuredContent: structured as Record<string, unknown>,
      isError,
    };
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  return { server, session };
}

export async function runBrainMcpStdio(options: StartBrainMcpServerOptions): Promise<void> {
  await startBrainMcpServer(options);
}
