import { classifyFilesystemScope } from "../../mcp/parse.js";
import type { FindingDraft, RuleDefinition } from "../types.js";

export const mcpBroadFilesystemRule: RuleDefinition = {
  id: "security/mcp-broad-filesystem",
  title: "MCP filesystem server has broad or out-of-repo scope",
  description:
    "Detects MCP filesystem-related path arguments that point at / , home, or paths outside the repository.",
  category: "security",
  severity: "critical",
  fixability: "review",
  rationale:
    "An MCP filesystem server scoped to the entire machine can expose secrets far beyond the project.",
  recommendation:
    "Limit filesystem MCP servers to the repository root (or a specific subdirectory) and avoid / , ~, and $HOME scopes.",
  async check(context): Promise<FindingDraft[]> {
    const findings: FindingDraft[] = [];

    for (const server of context.mcpServers) {
      if (server.parseError) {
        continue;
      }
      const scopes = server.filesystemScopes ?? [];
      for (const scope of scopes) {
        const classification = classifyFilesystemScope(scope, context.root);
        if (classification !== "broad" && classification !== "outside") {
          continue;
        }

        findings.push({
          ruleId: "security/mcp-broad-filesystem",
          category: "security",
          severity: "critical",
          title: "MCP filesystem server has broad or out-of-repo scope",
          message: `MCP server "${server.name}" configures filesystem scope "${scope}" (${classification})`,
          whyItMatters:
            "Broad filesystem MCP scopes can let an agent read files outside the project, including credentials and unrelated personal data.",
          recommendation:
            "Point the filesystem server at the repository directory only. Do not use /, ~, or $HOME.",
          affectedAgents: [server.sourceAgent],
          evidence: {
            path: server.sourcePath,
            detail: `server=${server.name}; scope=${scope}`,
          },
          fixability: "review",
        });
      }
    }

    return findings;
  },
};
