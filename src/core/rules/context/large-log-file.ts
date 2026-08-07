import { isLogLikePath } from "../../../discovery/log-like.js";
import type { AgentId } from "../../../types/index.js";
import { claudeDeniesPath } from "../claude-deny.js";
import { codexDeniesPath } from "../codex-deny.js";
import { THRESHOLDS } from "../thresholds.js";
import type { FindingDraft, RuleDefinition } from "../types.js";

export const largeLogFileRule: RuleDefinition = {
  id: "context/large-log-file",
  title: "Large log or dump file in repository",
  description: "Detects large log/dump files that may unnecessarily enter agent context.",
  category: "context",
  severity: "info",
  fixability: "safe",
  rationale: "Large logs add noise and can push useful source code out of the context window.",
  recommendation: "Delete or ignore large logs; add them to .gitignore and agent ignore files.",
  async check(context): Promise<FindingDraft[]> {
    const findings: FindingDraft[] = [];
    const configured = context.agents
      .filter((a) => a.configured || a.detected)
      .map((a) => a.id as AgentId);

    for (const file of context.discovery.files) {
      if (!isLogLikePath(file.relativePath)) {
        continue;
      }
      if (file.sizeBytes < THRESHOLDS.largeLogBytes) {
        continue;
      }

      if (context.ignore.matchesGitignore(file.relativePath)) {
        continue;
      }

      const defaultAgents: AgentId[] = ["cursor", "claude-code", "codex"];
      const candidates = configured.length > 0 ? configured : defaultAgents;
      const affected: AgentId[] = [];
      for (const agent of candidates) {
        if (agent === "cursor" && context.ignore.matchesCursorignore(file.relativePath)) {
          continue;
        }
        if (agent === "claude-code" && (await claudeDeniesPath(context, file.relativePath))) {
          continue;
        }
        if (agent === "codex" && (await codexDeniesPath(context, file.relativePath))) {
          continue;
        }
        affected.push(agent);
      }
      if (affected.length === 0) {
        continue;
      }

      findings.push({
        ruleId: "context/large-log-file",
        category: "context",
        severity: "info",
        title: "Large log or dump file in repository",
        message: `${file.relativePath} is ${(file.sizeBytes / 1024).toFixed(0)} KB`,
        whyItMatters:
          "Large logs and dumps rarely help coding agents and can crowd out useful source context.",
        recommendation: "Remove or ignore this file for both git and AI agent tooling.",
        affectedAgents: affected,
        evidence: { path: file.relativePath, detail: `${file.sizeBytes} bytes` },
        fixability: "safe",
      });
    }

    return findings;
  },
};
