import type { AgentDetectionResult } from "../../agents/types.js";
import { parseProjectMcpConfigs } from "../mcp/parse.js";
import type { DiscoveryResult, RepositoryInfo } from "../../types/index.js";
import { createIgnoreIndex, parseIgnoreFile, relativizeIgnorePatterns } from "./ignore.js";
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

  const gitignorePatterns: string[] = [];
  const cursorignorePatterns: string[] = [];

  const rootGitignore = await textCache.read(".gitignore");
  if (rootGitignore.text) {
    gitignorePatterns.push(...parseIgnoreFile(rootGitignore.text));
  }

  const rootCursorignore = await textCache.read(".cursorignore");
  if (rootCursorignore.text) {
    cursorignorePatterns.push(...parseIgnoreFile(rootCursorignore.text));
  }

  for (const file of options.discovery.files) {
    const base = file.relativePath.split("/").pop() ?? file.relativePath;
    if (base !== ".gitignore" && base !== ".cursorignore") {
      continue;
    }
    if (file.relativePath === ".gitignore" || file.relativePath === ".cursorignore") {
      continue;
    }

    const cached = await textCache.read(file.relativePath);
    if (!cached.text) {
      continue;
    }
    const dir = file.relativePath.includes("/")
      ? file.relativePath.slice(0, file.relativePath.lastIndexOf("/"))
      : "";
    const patterns = relativizeIgnorePatterns(dir, parseIgnoreFile(cached.text));
    if (base === ".gitignore") {
      gitignorePatterns.push(...patterns);
    } else {
      cursorignorePatterns.push(...patterns);
    }
  }

  const ignore = createIgnoreIndex({
    gitignorePatterns,
    cursorignorePatterns,
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
