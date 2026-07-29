import { getRuleById } from "../../core/rules/registry.js";
import { EXIT_CODES, type ExitCode } from "../../types/index.js";
import { colors } from "../../utils/colors.js";
import { AGENT_DISPLAY_NAMES } from "../../constants.js";

/**
 * Explain a rule by stable ID.
 */
export async function runExplainCommand(ruleId: string | undefined): Promise<ExitCode> {
  if (!ruleId || ruleId.trim() === "") {
    console.error("Error: provide a rule id, e.g. agentdoctor explain security/env-file-exposure");
    return EXIT_CODES.USAGE_ERROR;
  }

  const rule = getRuleById(ruleId.trim());
  if (!rule) {
    console.error(`Error: unknown rule id "${ruleId}"`);
    console.error("Run agentdoctor explain with a documented rule from docs/rules.md");
    return EXIT_CODES.USAGE_ERROR;
  }

  const agents =
    rule.affectedAgents?.map((id) => AGENT_DISPLAY_NAMES[id] ?? id).join(", ") ??
    "Depends on finding evidence";

  const lines: string[] = [];
  lines.push("");
  lines.push(colors.bold(`Explain: ${rule.id}`));
  lines.push("");
  lines.push(`  Title:        ${rule.title}`);
  lines.push(`  Category:     ${rule.category}`);
  lines.push(`  Severity:     ${rule.severity}`);
  lines.push(`  Fixability:   ${rule.fixability}`);
  lines.push(`  Agents:       ${agents}`);
  lines.push("");
  lines.push(colors.bold("What it detects"));
  lines.push(`  ${rule.description}`);
  lines.push("");
  lines.push(colors.bold("Why it matters"));
  lines.push(`  ${rule.rationale}`);
  lines.push("");
  lines.push(colors.bold("Recommended solution"));
  lines.push(`  ${rule.recommendation}`);
  lines.push("");
  lines.push(colors.bold("Can AgentDoctor safely fix it?"));
  lines.push(
    rule.fixability === "safe"
      ? "  Potentially yes. Conservative auto-fix is planned but not applied today."
      : rule.fixability === "review"
        ? "  Only with review. Automatic fixes are not applied today."
        : rule.fixability === "manual"
          ? "  No automatic fix. Manual remediation required."
          : "  No fix available.",
  );
  lines.push("");
  process.stdout.write(lines.join("\n"));
  return EXIT_CODES.SUCCESS;
}
