import type { AgentId } from "../../../types/index.js";
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
  if (TEMPLATE_BASENAMES.has(lower)) {
    return "template";
  }
  if (BACKUP_BASENAMES.has(lower)) {
    return "backup";
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

      if (kind === "template") {
        findings.push({
          ruleId: "security/env-file-exposure",
          category: "security",
          severity: "info",
          title: "Environment template file present",
          message: `Environment template file detected at ${file.relativePath}`,
          whyItMatters:
            "Template env files are usually placeholders, but they can still document secret names. Filename classification only — contents were not inspected.",
          recommendation:
            "Keep templates free of real credentials. Prefer documenting variable names without values.",
          affectedAgents: [],
          evidence: { path: file.relativePath, detail: "template" },
          fixability: "review",
        });
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
        severity: kind === "backup" ? "warning" : "critical",
        title: "Sensitive environment file may enter agent context",
        message: `Sensitive environment file detected and no relevant exclusion was found for: ${file.relativePath}`,
        whyItMatters:
          "Environment files frequently hold API keys and credentials. If readable by an AI coding agent, those values may be included in prompts or logs.",
        recommendation:
          "Add an agent-specific exclusion (for example .cursorignore or a Claude Code Read deny rule), keep the file out of version control, and rotate any credentials that may have been exposed.",
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
