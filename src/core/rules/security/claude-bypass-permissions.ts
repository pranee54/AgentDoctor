import type { FindingDraft, RuleDefinition } from "../types.js";

/**
 * Detects Claude Code `defaultMode: bypassPermissions` in project settings.
 * Official docs warn this skips permission prompts and should only be used in
 * isolated environments: https://code.claude.com/docs/en/permissions
 */
export const claudeBypassPermissionsRule: RuleDefinition = {
  id: "security/claude-bypass-permissions",
  title: "Claude Code bypassPermissions mode enabled",
  description: "Flags project Claude Code settings that set defaultMode to bypassPermissions.",
  category: "security",
  severity: "warning",
  affectedAgents: ["claude-code"],
  fixability: "review",
  rationale:
    "bypassPermissions skips interactive approval for many tool calls, increasing blast radius if the agent is prompted maliciously.",
  recommendation:
    "Use default or acceptEdits mode for normal development. Reserve bypassPermissions for isolated containers/VMs only.",
  async check(context): Promise<FindingDraft[]> {
    const claude = context.agents.find((a) => a.id === "claude-code");
    if (!claude) {
      return [];
    }

    const findings: FindingDraft[] = [];
    for (const file of claude.configFiles) {
      if (file.kind !== "claude-settings" && file.kind !== "claude-settings-local") {
        continue;
      }
      if (file.parseError || !file.readable || file.empty) {
        continue;
      }
      const cached = await context.textCache.read(file.relativePath);
      if (!cached.text) {
        continue;
      }
      // Match JSON string values only — do not execute settings.
      if (
        /"defaultMode"\s*:\s*"bypassPermissions"/.test(cached.text) ||
        /"defaultMode"\s*:\s*"bypasspermissions"/i.test(cached.text)
      ) {
        findings.push({
          ruleId: "security/claude-bypass-permissions",
          category: "security",
          severity: "warning",
          title: "Claude Code bypassPermissions mode enabled",
          message: `${file.relativePath} sets defaultMode to bypassPermissions`,
          whyItMatters:
            "Official Claude Code docs state bypassPermissions skips permission prompts (with limited circuit breakers). This widens what an agent session can do without confirmation.",
          recommendation:
            "Change defaultMode to default (or acceptEdits if appropriate) unless this project runs only in a locked-down isolated environment.",
          affectedAgents: ["claude-code"],
          evidence: { path: file.relativePath },
          fixability: "review",
        });
      }
    }
    return findings;
  },
};
