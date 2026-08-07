import type { AgentId } from "../../../types/index.js";
import { claudeDeniesPath } from "../claude-deny.js";
import { codexDeniesPath } from "../codex-deny.js";
import { isSampleOrTestPath } from "../path-kind.js";
import type { FindingDraft, RuleContext, RuleDefinition } from "../types.js";

export type EnvFileKind = "runtime" | "template" | "backup";

const TEMPLATE_BASENAMES = new Set([".env.example", ".env.sample", ".env.template", ".env.dist"]);

const BACKUP_BASENAMES = new Set([".env_backup", ".env_old", ".env_local"]);

/**
 * Classify environment-like filenames. Precision over recall.
 * Does not inspect file contents.
 */
export function classifyEnvBasename(base: string): EnvFileKind | null {
  const normalized = base.trim();
  if (!normalized.toLowerCase().startsWith(".env")) {
    return null;
  }
  const lower = normalized.toLowerCase();
  if (BACKUP_BASENAMES.has(lower)) {
    return "backup";
  }
  if (TEMPLATE_BASENAMES.has(lower)) {
    return "template";
  }
  // .env.local.example, .env.testing.example, .env.example.local, etc.
  if (/\.(?:example|sample|template)(?:\.|$)/i.test(normalized)) {
    return "template";
  }
  if (/\.env(?:\.[A-Za-z0-9_-]+)*\.(?:example|sample|template)$/i.test(normalized)) {
    return "template";
  }
  if (lower === ".env") {
    return "runtime";
  }
  // .env.<name> but not templates above
  if (/^\.env\.[A-Za-z0-9_.-]+$/.test(normalized)) {
    return "runtime";
  }
  return null;
}

function isEnvFile(relativePath: string): EnvFileKind | null {
  const base = relativePath.split("/").pop() ?? relativePath;
  return classifyEnvBasename(base);
}

function hasConfiguredOrDetectedAgents(context: RuleContext): boolean {
  return context.agents.some((a) => a.detected || a.configured);
}

function agentsWithoutClearExclusion(context: RuleContext, relativePath: string): AgentId[] {
  const affected: AgentId[] = [];

  for (const agent of context.agents) {
    if (!agent.detected && !agent.configured) {
      continue;
    }

    if (agent.id === "cursor") {
      if (!context.ignore.isExcludedForCursor(relativePath)) {
        affected.push("cursor");
      }
      continue;
    }

    if (agent.id === "claude-code") {
      affected.push("claude-code");
      continue;
    }

    if (agent.id === "codex") {
      affected.push("codex");
    }
  }

  return affected;
}

export const envFileExposureRule: RuleDefinition = {
  id: "security/env-file-exposure",
  title: "Sensitive environment file may enter agent context",
  description:
    "Detects repository .env files as repository risk and, when agents are configured, possible agent context exposure.",
  category: "security",
  severity: "critical",
  fixability: "review",
  rationale:
    "Environment files often contain credentials. Repository presence is a risk; agent readability can add exposure.",
  recommendation:
    "Keep runtime .env files out of version control, exclude them from AI agent context, and rotate credentials if exposed.",
  async check(context: RuleContext): Promise<FindingDraft[]> {
    const findings: FindingDraft[] = [];
    const agentsPresent = hasConfiguredOrDetectedAgents(context);

    for (const file of context.discovery.files) {
      const kind = isEnvFile(file.relativePath);
      if (!kind) {
        continue;
      }
      if (isSampleOrTestPath(file.relativePath)) {
        continue;
      }
      // Templates document variable names; they are not agent-readiness findings.
      if (kind === "template") {
        continue;
      }

      if (!agentsPresent) {
        findings.push({
          ruleId: "security/env-file-exposure",
          category: "security",
          severity: kind === "backup" ? "warning" : "critical",
          title: "Sensitive environment file present in repository",
          message: `Sensitive environment file present in the repository: ${file.relativePath}`,
          whyItMatters:
            "No supported coding-agent configuration was detected, so agent-specific exposure was not asserted. The file is still high-risk repository material if tracked or shared.",
          recommendation:
            "Keep runtime environment files out of version control and rotate credentials if the file may have been shared.",
          affectedAgents: [],
          evidence: {
            path: file.relativePath,
            detail: kind === "backup" ? "backup-no-agent" : "runtime-no-agent",
          },
          fixability: "review",
        });
        continue;
      }

      let affected = agentsWithoutClearExclusion(context, file.relativePath);

      if (affected.includes("claude-code")) {
        if (await claudeDeniesPath(context, file.relativePath)) {
          affected = affected.filter((a) => a !== "claude-code");
        }
      }

      if (affected.includes("codex")) {
        if (await codexDeniesPath(context, file.relativePath)) {
          affected = affected.filter((a) => a !== "codex");
        }
      }

      if (affected.length === 0) {
        continue;
      }

      findings.push({
        ruleId: "security/env-file-exposure",
        category: "security",
        severity: kind === "backup" ? "warning" : "critical",
        title: "Sensitive environment file may enter agent context",
        message: `Sensitive environment file detected and no relevant exclusion was found for: ${file.relativePath}`,
        whyItMatters:
          "Environment files frequently hold API keys and credentials. If readable by an AI coding agent, those values may be included in prompts or logs.",
        recommendation:
          "Add an agent-specific exclusion (for example .cursorignore, a Claude Code Read deny rule, or a Codex filesystem deny), keep the file out of version control, and rotate any credentials that may have been exposed.",
        affectedAgents: affected,
        evidence: {
          path: file.relativePath,
          detail: kind === "backup" ? "backup" : "runtime",
        },
        fixability: "review",
      });
    }

    return findings;
  },
};
