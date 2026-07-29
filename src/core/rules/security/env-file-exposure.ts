import type { AgentId } from "../../../types/index.js";
import type { FindingDraft, RuleContext, RuleDefinition } from "../types.js";

const ENV_BASENAME = /^\.env(\..+)?$/i;

function isEnvFile(relativePath: string): boolean {
  const base = relativePath.split("/").pop() ?? relativePath;
  return ENV_BASENAME.test(base);
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

async function claudeDeniesRead(context: RuleContext, relativePath: string): Promise<boolean> {
  const settingsFiles =
    context.agents
      .find((a) => a.id === "claude-code")
      ?.configFiles.filter(
        (f) => f.kind === "claude-settings" || f.kind === "claude-settings-local",
      ) ?? [];

  for (const file of settingsFiles) {
    const cached = await context.textCache.read(file.relativePath);
    if (!cached.text) continue;
    const patterns = [
      `Read(./${relativePath})`,
      `Read(${relativePath})`,
      `Read(/**/${relativePath.split("/").pop()})`,
    ];
    if (patterns.some((p) => cached.text!.includes(p))) {
      return true;
    }
    if (/"deny"\s*:\s*\[[^\]]*"Read"\s*[,\]]/.test(cached.text)) {
      return true;
    }
  }
  return false;
}

export const envFileExposureRule: RuleDefinition = {
  id: "security/env-file-exposure",
  title: "Sensitive environment file may enter agent context",
  description:
    "Detects repository .env files when configured AI agents may be able to access them.",
  category: "security",
  severity: "critical",
  fixability: "review",
  rationale:
    "Environment files often contain credentials. If an AI coding agent can read them, secrets may enter model context.",
  recommendation:
    "Exclude the file from AI agent context (for example .cursorignore / Claude Code Read deny rules) and ensure it is not committed.",
  async check(context: RuleContext): Promise<FindingDraft[]> {
    const findings: FindingDraft[] = [];
    const candidates = context.discovery.files.filter((f) => isEnvFile(f.relativePath));

    for (const file of candidates) {
      let affected = agentsWithoutClearExclusion(context, file.relativePath);

      if (affected.includes("claude-code")) {
        if (await claudeDeniesRead(context, file.relativePath)) {
          affected = affected.filter((a) => a !== "claude-code");
        }
      }

      if (affected.length === 0) {
        continue;
      }

      findings.push({
        ruleId: "security/env-file-exposure",
        category: "security",
        severity: "critical",
        title: "Sensitive environment file may enter agent context",
        message: `Sensitive environment file detected and no relevant exclusion was found for: ${file.relativePath}`,
        whyItMatters:
          "Environment files frequently hold API keys and credentials. If readable by an AI coding agent, those values may be included in prompts or logs.",
        recommendation:
          "Add an agent-specific exclusion (for example .cursorignore or a Claude Code Read deny rule), keep the file out of version control, and rotate any credentials that may have been exposed.",
        affectedAgents: affected,
        evidence: { path: file.relativePath },
        fixability: "review",
      });
    }

    return findings;
  },
};
