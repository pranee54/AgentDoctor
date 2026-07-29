import { DEFAULT_MAX_FILE_SIZE_BYTES } from "../constants.js";
import type { DiscoveryResult } from "../types/index.js";
import { agentRegistry } from "./registry.js";
import type { AgentDetectionResult } from "./types.js";

export interface DetectAgentsOptions {
  root: string;
  discovery: DiscoveryResult;
  maxFileSizeBytes?: number;
  adapters?: typeof agentRegistry;
}

export interface DetectAgentsResult {
  agents: AgentDetectionResult[];
  elapsedMs: number;
}

/**
 * Run all registered agent adapters against the repository.
 */
export async function detectAgents(options: DetectAgentsOptions): Promise<DetectAgentsResult> {
  const started = performance.now();
  const adapters = options.adapters ?? agentRegistry;
  const maxFileSizeBytes = options.maxFileSizeBytes ?? DEFAULT_MAX_FILE_SIZE_BYTES;

  const agents: AgentDetectionResult[] = [];
  for (const adapter of adapters) {
    const result = await adapter.detect({
      root: options.root,
      discovery: options.discovery,
      maxFileSizeBytes,
    });
    agents.push(result);
  }

  return {
    agents,
    elapsedMs: Math.round(performance.now() - started),
  };
}
