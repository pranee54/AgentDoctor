import type { AgentId } from "../../types/index.js";

/**
 * Parsed MCP server configuration from repository-scoped files only.
 * Never stores environment variable values — keys only.
 *
 * Official project-level sources verified:
 * - Cursor: `.cursor/mcp.json` (`mcpServers`) — cursor.com MCP docs / community + Cursor MCP UI
 * - Claude Code: `.mcp.json` (`mcpServers`) — https://code.claude.com/docs/en/mcp
 * - Codex: `.codex/config.toml` `[mcp_servers.*]` — https://developers.openai.com/codex/mcp
 */

export type McpTransport = "stdio" | "http" | "sse" | "unknown";

export interface McpServerConfig {
  name: string;
  sourceAgent: AgentId;
  sourcePath: string;
  transport: McpTransport;
  command?: string;
  args?: string[];
  url?: string;
  /** Environment variable NAMES only — never values. */
  envKeys?: string[];
  /** Path-like arguments that may indicate filesystem scope. */
  filesystemScopes?: string[];
  parseError?: string;
}

export interface McpParseResult {
  servers: McpServerConfig[];
  diagnostics: Array<{ severity: "warning" | "error" | "info"; message: string; file?: string }>;
}
