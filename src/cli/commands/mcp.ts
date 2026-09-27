import type { ExitCode } from "../../types/index.js";
import { EXIT_CODES } from "../../types/index.js";
import { resolveCliProjectRoot } from "../safe-root.js";
import { runAgentDoctorMcpStdio } from "../../mcp/agentdoctor/server.js";

/**
 * Start combined AgentDoctor MCP (Brain tools + intelligence tools) over STDIO.
 */
export async function runMcpCommand(options: {
  root: string;
  buildIfMissing?: boolean;
}): Promise<ExitCode> {
  const gated = await resolveCliProjectRoot(options.root);
  if (!gated.ok) {
    console.error(`Error: ${gated.message}`);
    return gated.code;
  }
  await runAgentDoctorMcpStdio({
    root: gated.root,
    buildIfMissing: options.buildIfMissing !== false,
  });
  return EXIT_CODES.SUCCESS;
}
