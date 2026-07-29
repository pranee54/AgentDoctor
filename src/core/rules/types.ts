import type { AgentDetectionResult } from "../../agents/types.js";
import type {
  AgentId,
  DiscoveryResult,
  DiscoveredFile,
  Finding,
  RepositoryInfo,
  RuleCategory,
  Severity,
} from "../../types/index.js";
import type { McpServerConfig } from "../mcp/types.js";
import type { IgnoreIndex } from "./ignore.js";
import type { TextCache } from "./text-cache.js";

export type Fixability = "safe" | "review" | "manual" | "none";

export interface RuleDefinition {
  id: string;
  title: string;
  description: string;
  category: RuleCategory;
  severity: Severity;
  /** Agents this rule typically concerns; findings may narrow further. */
  affectedAgents?: AgentId[];
  fixability: Fixability;
  rationale: string;
  recommendation: string;
  check(context: RuleContext): Promise<FindingDraft[]>;
}

/**
 * Draft finding produced by a rule before ID assignment / deduplication.
 */
export interface FindingDraft {
  ruleId: string;
  category: RuleCategory;
  severity: Severity;
  title: string;
  message: string;
  whyItMatters: string;
  recommendation?: string;
  affectedAgents: AgentId[];
  evidence?: {
    path?: string;
    line?: number;
    detail?: string;
  };
  fixability: Fixability;
}

export interface RuleContext {
  root: string;
  repository: RepositoryInfo;
  discovery: DiscoveryResult;
  agents: AgentDetectionResult[];
  ignore: IgnoreIndex;
  mcpServers: McpServerConfig[];
  textCache: TextCache;
  maxFileSizeBytes: number;
  /** Instruction/config files discovered by agent adapters (unique relative paths). */
  instructionFiles: DiscoveredFile[];
}

export interface FindingsSummary {
  critical: number;
  warning: number;
  info: number;
  total: number;
}

export function finalizeFinding(draft: FindingDraft): Finding {
  const pathKey = draft.evidence?.path?.replace(/\\/g, "/") ?? "repo";
  const detailKey = draft.evidence?.detail?.replace(/\\/g, "/") ?? "";
  const id =
    detailKey.length > 0 ? `${draft.ruleId}:${pathKey}:${detailKey}` : `${draft.ruleId}:${pathKey}`;

  const finding: Finding = {
    id,
    ruleId: draft.ruleId,
    category: draft.category,
    severity: draft.severity,
    title: draft.title,
    message: draft.message,
    whyItMatters: draft.whyItMatters,
    affectedAgents: [...new Set(draft.affectedAgents)].sort(),
    fixability: draft.fixability,
  };

  if (draft.recommendation !== undefined) {
    finding.recommendation = draft.recommendation;
  }
  if (draft.evidence !== undefined) {
    finding.evidence = { ...draft.evidence };
  }

  return finding;
}
