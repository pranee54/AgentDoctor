import type { AgentDetectionResult } from "../../agents/types.js";
import { parseProjectMcpConfigs } from "../mcp/parse.js";
import type { DiscoveryResult, RepositoryInfo } from "../../types/index.js";
import { createIgnoreIndex, parseIgnoreFile } from "./ignore.js";
import { TextCache } from "./text-cache.js";
import type { RuleContext } from "./types.js";

export async function buildRuleContext(options: {
  root: string;
  repository: RepositoryInfo;
  discovery: DiscoveryResult;
  agents: AgentDetectionResult[];
  maxFileSizeBytes: number;
}): Promise<RuleContext> {
  const textCache = new TextCache(options.root, options.maxFileSizeBytes);

  const gitignore = await textCache.read(".gitignore");
  const cursorignore = await textCache.read(".cursorignore");

  const ignore = createIgnoreIndex({
    gitignorePatterns: gitignore.text ? parseIgnoreFile(gitignore.text) : [],
    cursorignorePatterns: cursorignore.text ? parseIgnoreFile(cursorignore.text) : [],
  });

  const mcp = await parseProjectMcpConfigs(options.root, options.maxFileSizeBytes);

  const instructionPaths = new Set<string>();
  for (const agent of options.agents) {
    for (const file of agent.configFiles) {
      instructionPaths.add(file.relativePath);
    }
  }

  const instructionFiles = options.discovery.files.filter((f) =>
    instructionPaths.has(f.relativePath),
  );

  return {
    root: options.root,
    repository: options.repository,
    discovery: options.discovery,
    agents: options.agents,
    ignore,
    mcpServers: mcp.servers,
    textCache,
    maxFileSizeBytes: options.maxFileSizeBytes,
    instructionFiles,
  };
}
