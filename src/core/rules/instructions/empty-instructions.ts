import type { FindingDraft, RuleDefinition } from "../types.js";

const EMPTYABLE_KINDS = new Set([
  "cursor-rule-mdc",
  "cursor-legacy-cursorrules",
  "agents-md",
  "agents-override-md",
  "claude-md",
  "claude-local-md",
  "claude-rule-md",
]);

export const emptyInstructionsRule: RuleDefinition = {
  id: "instructions/empty-instructions",
  title: "Empty agent instruction file",
  description: "Flags empty project instruction files that agents will skip or ignore.",
  category: "instructions",
  severity: "warning",
  fixability: "review",
  rationale: "Empty instruction files suggest incomplete setup and waste discovery attention.",
  recommendation: "Add meaningful project guidance or remove the empty file.",
  async check(context): Promise<FindingDraft[]> {
    const findings: FindingDraft[] = [];
    const seen = new Set<string>();

    for (const agent of context.agents) {
      for (const file of agent.configFiles) {
        if (!EMPTYABLE_KINDS.has(file.kind)) {
          continue;
        }
        if (!file.empty || !file.readable) {
          continue;
        }
        if (seen.has(file.relativePath)) {
          continue;
        }
        seen.add(file.relativePath);

        const affected = context.agents
          .filter((a) => a.configPaths.includes(file.relativePath))
          .map((a) => a.id);

        findings.push({
          ruleId: "instructions/empty-instructions",
          category: "instructions",
          severity: "warning",
          title: "Empty agent instruction file",
          message: `${file.relativePath} exists but is empty`,
          whyItMatters:
            "Empty instruction files do not guide agents (Codex skips empty AGENTS.md) and can indicate unfinished configuration.",
          recommendation: "Populate the file with concise project guidance or delete it.",
          affectedAgents: affected.length > 0 ? affected : [agent.id],
          evidence: { path: file.relativePath },
          fixability: "review",
        });
      }
    }

    return findings;
  },
};
