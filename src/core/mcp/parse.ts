import path from "node:path";

import { inspectRepoFile, pathExistsInsideRoot, tryParseJson } from "../../agents/inspect.js";
import type { AgentId } from "../../types/index.js";
import { isPathInsideRoot } from "../../utils/path.js";
import type { McpParseResult, McpServerConfig, McpTransport } from "./types.js";

const FILESYSTEM_SERVER_HINTS = [
  "server-filesystem",
  "@modelcontextprotocol/server-filesystem",
  "mcp-server-filesystem",
];

function isFilesystemServer(command: string | undefined, args: string[] | undefined): boolean {
  const haystack = [command ?? "", ...(args ?? [])].join(" ").toLowerCase();
  return FILESYSTEM_SERVER_HINTS.some((hint) => haystack.includes(hint));
}

function extractFilesystemScopes(args: string[] | undefined): string[] {
  if (!args) {
    return [];
  }
  const scopes: string[] = [];
  for (const arg of args) {
    if (
      arg.startsWith("-") ||
      arg.startsWith("@") ||
      arg.includes("://") ||
      arg === "npx" ||
      arg === "-y"
    ) {
      continue;
    }
    // Path-like arguments
    if (
      arg.startsWith("/") ||
      arg.startsWith("~") ||
      arg.startsWith("$") ||
      arg.includes("/") ||
      arg.includes("\\") ||
      arg === "." ||
      arg === ".."
    ) {
      scopes.push(arg);
    }
  }
  return scopes;
}

function envKeysOnly(env: unknown): string[] | undefined {
  if (!env || typeof env !== "object" || Array.isArray(env)) {
    return undefined;
  }
  return Object.keys(env as Record<string, unknown>).sort();
}

function detectTransport(entry: Record<string, unknown>): McpTransport {
  const type = typeof entry.type === "string" ? entry.type.toLowerCase() : "";
  if (type === "http" || type === "streamable-http") {
    return "http";
  }
  if (type === "sse") {
    return "sse";
  }
  if (type === "stdio" || entry.command) {
    return "stdio";
  }
  if (entry.url) {
    return "http";
  }
  return "unknown";
}

function parseMcpServersObject(
  data: unknown,
  sourceAgent: AgentId,
  sourcePath: string,
): { servers: McpServerConfig[]; error?: string } {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { servers: [], error: "Root value is not an object" };
  }

  const root = data as Record<string, unknown>;
  const serversRaw = root.mcpServers;
  if (serversRaw === undefined) {
    return { servers: [] };
  }
  if (!serversRaw || typeof serversRaw !== "object" || Array.isArray(serversRaw)) {
    return { servers: [], error: "mcpServers must be an object" };
  }

  const servers: McpServerConfig[] = [];
  for (const [name, value] of Object.entries(serversRaw as Record<string, unknown>)) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      servers.push({
        name,
        sourceAgent,
        sourcePath,
        transport: "unknown",
        parseError: "Server entry is not an object",
      });
      continue;
    }

    const entry = value as Record<string, unknown>;
    const command = typeof entry.command === "string" ? entry.command : undefined;
    const args = Array.isArray(entry.args)
      ? entry.args.filter((a): a is string => typeof a === "string")
      : undefined;
    const url = typeof entry.url === "string" ? entry.url : undefined;
    const envKeys = envKeysOnly(entry.env);
    const filesystemScopes = isFilesystemServer(command, args)
      ? extractFilesystemScopes(args)
      : extractFilesystemScopes(args).filter((s) => s.startsWith("/") || s.startsWith("~"));

    const server: McpServerConfig = {
      name,
      sourceAgent,
      sourcePath,
      transport: detectTransport(entry),
    };
    if (command !== undefined) server.command = command;
    if (args !== undefined) server.args = args;
    if (url !== undefined) server.url = url;
    if (envKeys !== undefined) server.envKeys = envKeys;
    if (filesystemScopes.length > 0) server.filesystemScopes = filesystemScopes;
    servers.push(server);
  }

  return { servers };
}

/** JSON.parse keeps only the final value for a repeated object key. Preserve the repeated
 * server names so the duplicate-server rule can still report ambiguous MCP configuration. */
function duplicateMcpServerNames(text: string): string[] {
  const match = /"mcpServers"\s*:\s*\{/.exec(text);
  if (!match) return [];
  const openBrace = match.index + match[0].lastIndexOf("{");
  const seen = new Set<string>();
  const duplicates: string[] = [];
  let depth = 1;

  for (let index = openBrace + 1; index < text.length && depth > 0; index += 1) {
    const char = text[index];
    if (char === '"') {
      const start = index;
      index += 1;
      while (index < text.length) {
        if (text[index] === "\\") index += 2;
        else if (text[index] === '"') break;
        else index += 1;
      }
      if (depth !== 1 || index >= text.length) continue;
      let next = index + 1;
      while (/\s/.test(text[next] ?? "")) next += 1;
      if (text[next] !== ":") continue;
      try {
        const name = JSON.parse(text.slice(start, index + 1)) as string;
        if (seen.has(name)) duplicates.push(name);
        else seen.add(name);
      } catch {
        return [];
      }
      continue;
    }
    if (char === "{") depth += 1;
    else if (char === "}") depth -= 1;
  }
  return duplicates;
}

/**
 * Minimal TOML extractor for Codex `[mcp_servers.<name>]` tables.
 * Does not evaluate values beyond strings/arrays needed for command/args.
 * Never captures env values — only env key names from `env = { KEY = ... }`.
 */
function parseCodexMcpToml(
  text: string,
  sourcePath: string,
): { servers: McpServerConfig[]; error?: string } {
  const servers: McpServerConfig[] = [];
  const lines = text.split(/\r?\n/);
  let current: (Partial<McpServerConfig> & { name?: string }) | null = null;

  const flush = () => {
    if (!current?.name) {
      current = null;
      return;
    }
    const server: McpServerConfig = {
      name: current.name,
      sourceAgent: "codex",
      sourcePath,
      transport: current.command ? "stdio" : current.url ? "http" : "unknown",
    };
    if (current.command) server.command = current.command;
    if (current.args) server.args = current.args;
    if (current.url) server.url = current.url;
    if (current.envKeys) server.envKeys = current.envKeys;
    if (current.filesystemScopes) server.filesystemScopes = current.filesystemScopes;
    servers.push(server);
    current = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const header = line.match(/^\[mcp_servers\.([^\]]+)\]$/i);
    if (header) {
      flush();
      const name = header[1];
      current = name ? { name } : null;
      continue;
    }

    if (!current) {
      continue;
    }

    const commandMatch = line.match(/^command\s*=\s*"([^"]*)"/i);
    if (commandMatch?.[1] !== undefined) {
      current.command = commandMatch[1];
      continue;
    }

    const urlMatch = line.match(/^url\s*=\s*"([^"]*)"/i);
    if (urlMatch?.[1] !== undefined) {
      current.url = urlMatch[1];
      continue;
    }

    const argsMatch = line.match(/^args\s*=\s*\[(.*)\]/i);
    if (argsMatch?.[1] !== undefined) {
      const args = [...argsMatch[1].matchAll(/"([^"]*)"/g)].map((m) => m[1] ?? "");
      current.args = args;
      if (isFilesystemServer(current.command, args)) {
        current.filesystemScopes = extractFilesystemScopes(args);
      }
      continue;
    }

    const envMatch = line.match(/^env\s*=\s*\{([^}]*)\}/i);
    if (envMatch?.[1] !== undefined) {
      const keys = [...envMatch[1].matchAll(/([A-Za-z_][A-Za-z0-9_]*)\s*=/g)].map(
        (m) => m[1] ?? "",
      );
      current.envKeys = [...new Set(keys)].sort();
    }
  }
  flush();
  return { servers };
}

export async function parseProjectMcpConfigs(
  root: string,
  maxFileSizeBytes: number,
): Promise<McpParseResult> {
  const servers: McpServerConfig[] = [];
  const diagnostics: McpParseResult["diagnostics"] = [];

  const jsonTargets: Array<{ relative: string; agent: AgentId }> = [
    { relative: ".cursor/mcp.json", agent: "cursor" },
    { relative: ".mcp.json", agent: "claude-code" },
  ];

  for (const target of jsonTargets) {
    if (!(await pathExistsInsideRoot(root, target.relative))) {
      continue;
    }
    const inspected = await inspectRepoFile(root, target.relative, maxFileSizeBytes);
    if (!inspected.readable || inspected.text === null) {
      diagnostics.push({
        severity: "warning",
        message: `MCP config could not be read: ${inspected.error ?? "unknown error"}`,
        file: target.relative,
      });
      servers.push({
        name: "(unreadable)",
        sourceAgent: target.agent,
        sourcePath: target.relative,
        transport: "unknown",
        parseError: inspected.error ?? "unreadable",
      });
      continue;
    }
    if (inspected.empty) {
      diagnostics.push({
        severity: "info",
        message: `MCP config is empty`,
        file: target.relative,
      });
      continue;
    }

    const parsedJson = tryParseJson(inspected.text);
    if (!parsedJson.ok) {
      diagnostics.push({
        severity: "warning",
        message: `MCP config could not be parsed: ${parsedJson.error}`,
        file: target.relative,
      });
      servers.push({
        name: "(malformed)",
        sourceAgent: target.agent,
        sourcePath: target.relative,
        transport: "unknown",
        parseError: parsedJson.error,
      });
      continue;
    }

    const parsed = parseMcpServersObject(parsedJson.data, target.agent, target.relative);
    if (parsed.error) {
      diagnostics.push({
        severity: "warning",
        message: parsed.error,
        file: target.relative,
      });
    }
    servers.push(...parsed.servers);
    for (const duplicateName of duplicateMcpServerNames(inspected.text)) {
      const duplicate = parsed.servers.find((server) => server.name === duplicateName);
      if (duplicate) servers.push({ ...duplicate });
    }
  }

  const codexConfig = ".codex/config.toml";
  if (await pathExistsInsideRoot(root, codexConfig)) {
    const inspected = await inspectRepoFile(root, codexConfig, maxFileSizeBytes);
    if (inspected.readable && inspected.text) {
      const parsed = parseCodexMcpToml(inspected.text, codexConfig);
      servers.push(...parsed.servers);
    } else if (inspected.exists && inspected.error) {
      diagnostics.push({
        severity: "warning",
        message: `Codex MCP config could not be read: ${inspected.error}`,
        file: codexConfig,
      });
    }
  }

  return { servers, diagnostics };
}

/**
 * Classify whether a filesystem scope string is overly broad relative to the repo.
 * Does not follow or read the path.
 */
export function classifyFilesystemScope(
  scope: string,
  root: string,
): "broad" | "outside" | "ok" | "unknown" {
  const trimmed = scope.trim();
  if (!trimmed) {
    return "unknown";
  }
  if (trimmed === "/" || trimmed === "~" || trimmed === "$HOME" || trimmed === "${HOME}") {
    return "broad";
  }
  if (trimmed.startsWith("~/") || trimmed.startsWith("$HOME/") || trimmed.startsWith("${HOME}/")) {
    return "broad";
  }
  if (trimmed === ".." || trimmed.startsWith("../")) {
    return "outside";
  }

  if (path.isAbsolute(trimmed)) {
    try {
      if (!isPathInsideRoot(root, trimmed)) {
        return "outside";
      }
      return "ok";
    } catch {
      return "unknown";
    }
  }

  // Relative paths are treated as repo-relative → ok
  if (trimmed === "." || !trimmed.startsWith("..")) {
    return "ok";
  }
  return "unknown";
}
