import { THRESHOLDS } from "../thresholds.js";
import type { FindingDraft, RuleDefinition } from "../types.js";

const INSTRUCTION_KINDS = new Set([
  "cursor-rule-mdc",
  "cursor-legacy-cursorrules",
  "agents-md",
  "agents-override-md",
  "claude-md",
  "claude-local-md",
  "claude-rule-md",
]);

export const largeInstructionFileRule: RuleDefinition = {
  id: "context/large-instruction-file",
  title: "Large instruction file",
  description: "Flags unusually large AI instruction files that may inflate repeated context.",
  category: "context",
  severity: "warning",
  fixability: "review",
  rationale:
    "Large instruction files consume context on every session and can bury the most important guidance.",
  recommendation:
    "Split into focused rule files, move rare procedures to docs/skills, and keep always-on instructions concise.",
  async check(context): Promise<FindingDraft[]> {
    const findings: FindingDraft[] = [];
    const seen = new Set<string>();

    for (const agent of context.agents) {
      for (const file of agent.configFiles) {
        if (!INSTRUCTION_KINDS.has(file.kind)) {
          continue;
        }
        if (seen.has(file.relativePath)) {
          continue;
        }
        seen.add(file.relativePath);

        if (file.sizeBytes < THRESHOLDS.instructionInfoBytes) {
          continue;
        }

        const severity = file.sizeBytes >= THRESHOLDS.instructionWarningBytes ? "warning" : "info";
        const kb = (file.sizeBytes / 1024).toFixed(0);

        const affected = context.agents
          .filter((a) => a.configPaths.includes(file.relativePath))
          .map((a) => a.id);

        findings.push({
          ruleId: "context/large-instruction-file",
          category: "context",
          severity,
          title: "Large instruction file",
          message: `${file.relativePath} is ${kb} KB`,
          whyItMatters:
            "Large instruction files may increase repeated context usage and make important instructions harder to prioritize. Exact token impact is not measured.",
          recommendation:
            "Keep always-loaded instructions lean; split specialized guidance into scoped rules or linked docs.",
          affectedAgents:
            affected.length > 0 ? affected : agent.id === "cursor" ? ["cursor"] : [agent.id],
          evidence: { path: file.relativePath, detail: `${file.sizeBytes} bytes` },
          fixability: "review",
        });
      }
    }

    return findings;
  },
};
