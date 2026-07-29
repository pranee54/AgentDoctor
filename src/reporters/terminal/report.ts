import { PACKAGE_VERSION } from "../../constants.js";
import { AGENT_DISPLAY_NAMES } from "../../constants.js";
import { formatFramework } from "../../detectors/framework.js";
import { formatLanguage } from "../../detectors/language.js";
import { formatMonorepo } from "../../detectors/monorepo.js";
import { formatPackageManager, formatPackageManagers } from "../../detectors/package-manager.js";
import type { AgentId, Finding, ScanResult, Severity } from "../../types/index.js";
import { colors, symbolFail, symbolInfo, symbolOk, symbolWarn } from "../../utils/colors.js";
import { sanitizeTerminalText } from "../../security/redaction.js";

export interface TerminalReportOptions {
  verbose?: boolean;
}

const DEFAULT_FINDING_LIMIT = 12;

function groupFindings(findings: Finding[]): Record<Severity, Finding[]> {
  return {
    critical: findings.filter((f) => f.severity === "critical"),
    warning: findings.filter((f) => f.severity === "warning"),
    info: findings.filter((f) => f.severity === "info"),
  };
}

function agentGlyph(configured: boolean, detected: boolean): string {
  if (configured) {
    return symbolOk();
  }
  if (detected) {
    return symbolWarn();
  }
  return colors.dim("–");
}

function formatAgents(agents: AgentId[]): string {
  return agents.map((id) => AGENT_DISPLAY_NAMES[id] ?? id).join(", ");
}

function renderFindingBlock(finding: Finding, verbose: boolean): string[] {
  const lines: string[] = [];
  const icon =
    finding.severity === "critical"
      ? symbolFail()
      : finding.severity === "warning"
        ? symbolWarn()
        : symbolInfo();

  lines.push(`  ${icon} ${sanitizeTerminalText(finding.title)}`);
  if (finding.evidence?.path) {
    lines.push(colors.dim(`    ${sanitizeTerminalText(finding.evidence.path)}`));
  }
  if (finding.affectedAgents.length > 0) {
    lines.push(colors.dim(`    Affected: ${formatAgents(finding.affectedAgents)}`));
  }
  lines.push(`    ${sanitizeTerminalText(finding.message)}`);
  if (verbose) {
    lines.push(colors.dim(`    Why: ${sanitizeTerminalText(finding.whyItMatters)}`));
  }
  if (finding.recommendation) {
    lines.push(`    Fix: ${sanitizeTerminalText(finding.recommendation)}`);
  }
  lines.push("");
  return lines;
}

/**
 * Terminal report: agents and actionable findings.
 */
export function renderTerminalReport(
  result: ScanResult,
  options: TerminalReportOptions = {},
): string {
  const lines: string[] = [];
  const verbose = options.verbose ?? false;

  lines.push("");
  lines.push(colors.bold(`🩺 AgentDoctor`) + colors.dim(` v${PACKAGE_VERSION}`));
  lines.push("");
  lines.push(colors.dim("Scanning repository..."));
  lines.push("");

  lines.push(colors.bold("Repository"));
  lines.push(
    `  Framework: ${sanitizeTerminalText(formatFramework(result.repository.primaryFramework))}`,
  );
  lines.push(
    `  Language: ${sanitizeTerminalText(formatLanguage(result.repository.primaryLanguage))}`,
  );
  const packageManagerLabel =
    result.repository.packageManagers.length > 1 ||
    result.repository.primaryPackageManager === "unknown"
      ? formatPackageManagers(result.repository.packageManagers)
      : formatPackageManager(result.repository.primaryPackageManager);
  lines.push(`  Package manager: ${sanitizeTerminalText(packageManagerLabel)}`);
  if (result.repository.monorepo !== "none") {
    lines.push(`  Monorepo: ${sanitizeTerminalText(formatMonorepo(result.repository.monorepo))}`);
  }
  lines.push(`  Files scanned: ${result.repository.filesScanned}`);
  lines.push("");

  lines.push(colors.bold("AI Coding Agents"));
  lines.push("");
  for (const agent of result.agents) {
    const glyph = agentGlyph(agent.configured, agent.detected);
    const status = agent.configured ? "configured" : agent.detected ? "detected" : "not configured";
    lines.push(
      `${glyph} ${pad(sanitizeTerminalText(agent.displayName), 12)} ${colors.dim(status)}`,
    );
    if (verbose && agent.configured) {
      lines.push(colors.dim(`    ${sanitizeTerminalText(agent.summary)}`));
      for (const configPath of agent.configPaths) {
        lines.push(colors.dim(`    · ${sanitizeTerminalText(configPath)}`));
      }
    }
  }
  lines.push("");

  const grouped = groupFindings(result.findings);
  const total = result.summary.total;

  lines.push(colors.bold("Findings"));
  lines.push("");

  if (total === 0) {
    lines.push(`  ${symbolOk()} No findings`);
    lines.push("");
  } else {
    let shown = 0;
    const limit = verbose ? Number.POSITIVE_INFINITY : DEFAULT_FINDING_LIMIT;

    for (const severity of ["critical", "warning", "info"] as const) {
      const list = grouped[severity];
      if (list.length === 0) {
        continue;
      }
      const header =
        severity === "critical"
          ? colors.red(colors.bold("CRITICAL"))
          : severity === "warning"
            ? colors.yellow(colors.bold("WARNING"))
            : colors.cyan(colors.bold("INFO"));
      lines.push(header);
      lines.push("");
      for (const finding of list) {
        if (shown >= limit) {
          break;
        }
        lines.push(...renderFindingBlock(finding, verbose));
        shown += 1;
      }
      if (shown >= limit) {
        break;
      }
    }

    if (total > shown) {
      lines.push(
        colors.dim(
          `  … and ${total - shown} more. Re-run with --verbose to see additional detail.`,
        ),
      );
      lines.push("");
    }
  }

  lines.push(colors.bold("Summary"));
  lines.push("");
  lines.push(`  ${result.summary.critical} critical`);
  lines.push(`  ${result.summary.warning} warning`);
  lines.push(`  ${result.summary.info} info`);
  lines.push("");
  lines.push(colors.dim("Scoring: not included in this release"));
  lines.push("");

  if (verbose) {
    lines.push(colors.dim("Timing"));
    lines.push(`  Discovery: ${result.timing.discoveryMs}ms`);
    lines.push(`  Detection: ${result.timing.detectionMs}ms`);
    lines.push(`  Agents:    ${result.timing.agentsMs}ms`);
    lines.push(`  Rules:     ${result.timing.rulesMs}ms`);
    lines.push(`  Total:     ${result.timing.totalMs}ms`);
    lines.push("");
  }

  return lines.join("\n");
}

function pad(value: string, width: number): string {
  return value.padEnd(width, " ");
}
