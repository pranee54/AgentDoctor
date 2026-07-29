import { THRESHOLDS } from "../thresholds.js";
import type { FindingDraft, RuleDefinition } from "../types.js";

const LOG_LIKE = /\.(log|out|dump)$/i;
const HEAVY_NAME = /(^|\/)(debug|trace|coverage-final|chrome-devtools|heapdump)/i;

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
    const affected = context.agents.filter((a) => a.configured || a.detected).map((a) => a.id);

    for (const file of context.discovery.files) {
      const base = file.relativePath.split("/").pop() ?? file.relativePath;
      const looksLog = LOG_LIKE.test(base) || HEAVY_NAME.test(file.relativePath);
      if (!looksLog) {
        continue;
      }
      if (file.sizeBytes < THRESHOLDS.largeLogBytes) {
        continue;
      }

      // Skip if clearly ignored for Cursor and no other agents configured
      if (
        context.ignore.matchesGitignore(file.relativePath) ||
        context.ignore.matchesCursorignore(file.relativePath)
      ) {
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
        affectedAgents: affected.length > 0 ? affected : ["cursor", "claude-code", "codex"],
        evidence: { path: file.relativePath, detail: `${file.sizeBytes} bytes` },
        fixability: "safe",
      });
    }

    return findings;
  },
};
