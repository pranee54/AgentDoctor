import type { Finding } from "../../types/index.js";
import type { FindingDraft } from "./types.js";
import { finalizeFinding } from "./types.js";

/**
 * Merge findings that share the same rule + evidence path into one finding
 * with unioned affected agents. Distinct problems are not merged.
 */
export function dedupeFindings(drafts: FindingDraft[]): Finding[] {
  const map = new Map<string, FindingDraft>();

  for (const draft of drafts) {
    const pathKey = (draft.evidence?.path ?? "repo").replace(/\\/g, "/");
    const detailKey = (draft.evidence?.detail ?? "").replace(/\\/g, "/");
    const key = `${draft.ruleId}::${pathKey}::${detailKey}::${draft.title}`;
    const existing = map.get(key);
    if (!existing) {
      const next: FindingDraft = {
        ...draft,
        affectedAgents: [...draft.affectedAgents],
      };
      if (draft.evidence) {
        next.evidence = { ...draft.evidence };
      }
      map.set(key, next);
      continue;
    }

    existing.affectedAgents = [
      ...new Set([...existing.affectedAgents, ...draft.affectedAgents]),
    ].sort();

    // Prefer higher severity if somehow duplicated with different severities
    const rank = { critical: 3, warning: 2, info: 1 } as const;
    if (rank[draft.severity] > rank[existing.severity]) {
      existing.severity = draft.severity;
      existing.message = draft.message;
      existing.whyItMatters = draft.whyItMatters;
      if (draft.recommendation !== undefined) {
        existing.recommendation = draft.recommendation;
      }
    }
  }

  return [...map.values()].map(finalizeFinding).sort((a, b) => {
    const severityRank = { critical: 0, warning: 1, info: 2 };
    const sev = severityRank[a.severity] - severityRank[b.severity];
    if (sev !== 0) return sev;
    return a.id.localeCompare(b.id);
  });
}

export function summarizeFindings(findings: Finding[]): {
  critical: number;
  warning: number;
  info: number;
  total: number;
} {
  return {
    critical: findings.filter((f) => f.severity === "critical").length,
    warning: findings.filter((f) => f.severity === "warning").length,
    info: findings.filter((f) => f.severity === "info").length,
    total: findings.length,
  };
}
