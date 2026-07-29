import type { FindingDraft, RuleDefinition } from "../types.js";

export const malformedMcpRule: RuleDefinition = {
  id: "mcp/malformed-config",
  title: "Malformed MCP configuration",
  description: "Flags MCP config files that exist but cannot be safely parsed.",
  category: "mcp",
  severity: "warning",
  fixability: "manual",
  rationale: "Broken MCP configuration prevents tools from loading and may hide security settings.",
  recommendation: "Fix JSON/TOML syntax and validate against the agent’s MCP schema.",
  async check(context): Promise<FindingDraft[]> {
    const findings: FindingDraft[] = [];
    const seen = new Set<string>();

    for (const server of context.mcpServers) {
      if (!server.parseError) {
        continue;
      }
      if (seen.has(server.sourcePath)) {
        continue;
      }
      seen.add(server.sourcePath);

      findings.push({
        ruleId: "mcp/malformed-config",
        category: "mcp",
        severity: "warning",
        title: "Malformed MCP configuration",
        message: `${server.sourcePath} could not be parsed: ${server.parseError}`,
        whyItMatters:
          "Agents will not load malformed MCP configuration, leaving expected tools unavailable.",
        recommendation:
          "Correct the configuration syntax. Do not commit secrets into MCP env values.",
        affectedAgents: [server.sourceAgent],
        evidence: { path: server.sourcePath, detail: server.parseError },
        fixability: "manual",
      });
    }

    return findings;
  },
};

export const duplicateMcpServerRule: RuleDefinition = {
  id: "mcp/duplicate-server",
  title: "Duplicate MCP server definition",
  description: "Detects the same MCP server name defined more than once across project configs.",
  category: "mcp",
  severity: "info",
  fixability: "review",
  rationale: "Duplicate server names can make it unclear which configuration is active.",
  recommendation: "Keep a single definition per server name per agent scope.",
  async check(context): Promise<FindingDraft[]> {
    const findings: FindingDraft[] = [];
    const byKey = new Map<string, typeof context.mcpServers>();

    for (const server of context.mcpServers) {
      if (server.parseError || server.name.startsWith("(")) {
        continue;
      }
      const key = `${server.sourceAgent}::${server.name}`;
      const list = byKey.get(key) ?? [];
      list.push(server);
      byKey.set(key, list);
    }

    for (const [key, list] of byKey) {
      if (list.length < 2) {
        continue;
      }
      const first = list[0];
      if (!first) continue;
      findings.push({
        ruleId: "mcp/duplicate-server",
        category: "mcp",
        severity: "info",
        title: "Duplicate MCP server definition",
        message: `MCP server "${first.name}" is defined ${list.length} times for ${first.sourceAgent}`,
        whyItMatters:
          "Duplicate names make it harder to reason about which MCP server configuration an agent will use.",
        recommendation:
          "Deduplicate server entries so each name appears once per agent config scope.",
        affectedAgents: [first.sourceAgent],
        evidence: {
          path: first.sourcePath,
          detail: `key=${key}; paths=${list.map((s) => s.sourcePath).join(",")}`,
        },
        fixability: "review",
      });
    }

    return findings;
  },
};
