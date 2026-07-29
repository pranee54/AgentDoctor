import { THRESHOLDS } from "../thresholds.js";
import type { FindingDraft, RuleDefinition } from "../types.js";

const COMPARE_KINDS = new Set([
  "cursor-rule-mdc",
  "cursor-legacy-cursorrules",
  "agents-md",
  "agents-override-md",
  "claude-md",
  "claude-local-md",
  "claude-rule-md",
]);

function normalizeContent(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .toLowerCase();
}

/** Strip simple MDC/YAML frontmatter for comparison. */
function stripFrontmatter(text: string): string {
  if (!text.startsWith("---")) {
    return text;
  }
  const end = text.indexOf("\n---", 3);
  if (end === -1) {
    return text;
  }
  return text.slice(end + 4);
}

export const duplicateContentRule: RuleDefinition = {
  id: "instructions/duplicate-content",
  title: "Duplicate agent instructions",
  description: "Detects exact normalized duplicate instruction content across agent config files.",
  category: "instructions",
  severity: "info",
  fixability: "review",
  rationale:
    "Duplicated instructions across agents can drift over time; sharing a canonical source reduces maintenance.",
  recommendation:
    "Prefer one canonical instruction file where tooling allows (for example CLAUDE.md importing AGENTS.md), accepting intentional duplication for cross-agent compatibility when needed.",
  async check(context): Promise<FindingDraft[]> {
    const files: Array<{ path: string; normalized: string; agents: string[] }> = [];
    const seenPaths = new Set<string>();

    for (const agent of context.agents) {
      for (const file of agent.configFiles) {
        if (!COMPARE_KINDS.has(file.kind) || file.empty || !file.readable) {
          continue;
        }
        if (seenPaths.has(file.relativePath)) {
          const existing = files.find((f) => f.path === file.relativePath);
          existing?.agents.push(agent.id);
          continue;
        }
        seenPaths.add(file.relativePath);
        const cached = await context.textCache.read(file.relativePath);
        if (!cached.text || cached.binary) {
          continue;
        }
        const normalized = normalizeContent(stripFrontmatter(cached.text));
        if (normalized.length < THRESHOLDS.duplicateMinChars) {
          continue;
        }
        files.push({ path: file.relativePath, normalized, agents: [agent.id] });
      }
    }

    const findings: FindingDraft[] = [];
    const reported = new Set<string>();

    for (let i = 0; i < files.length; i += 1) {
      for (let j = i + 1; j < files.length; j += 1) {
        const a = files[i];
        const b = files[j];
        if (!a || !b) continue;
        if (a.normalized !== b.normalized) {
          continue;
        }
        const pairKey = [a.path, b.path].sort().join("|");
        if (reported.has(pairKey)) {
          continue;
        }
        reported.add(pairKey);

        const affected = context.agents
          .filter(
            (agent) => agent.configPaths.includes(a.path) || agent.configPaths.includes(b.path),
          )
          .map((agent) => agent.id);

        findings.push({
          ruleId: "instructions/duplicate-content",
          category: "instructions",
          severity: "info",
          title: "Duplicate agent instructions",
          message: `${a.path} and ${b.path} contain identical normalized project instructions`,
          whyItMatters:
            "Duplication can be intentional for cross-agent compatibility, but identical copies often drift. Prefer a single canonical source when supported.",
          recommendation:
            "Keep shared guidance in one file and reference/import it from agent-specific files where the tool supports that.",
          affectedAgents: affected,
          evidence: { path: a.path, detail: `duplicate_of=${b.path}` },
          fixability: "review",
        });
      }
    }

    return findings;
  },
};
