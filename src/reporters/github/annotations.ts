import type { Finding, Severity } from "../../types/index.js";

/**
 * GitHub Actions workflow commands for file annotations.
 * Emitted to stderr so `--json` stdout stays pure JSON.
 *
 * @see https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions
 */
export function renderGithubAnnotations(findings: Finding[]): string {
  const lines: string[] = [];
  for (const finding of findings) {
    lines.push(formatAnnotation(finding));
  }
  return lines.length > 0 ? `${lines.join("\n")}\n` : "";
}

function formatAnnotation(finding: Finding): string {
  const level = annotationLevel(finding.severity);
  const properties: string[] = [];
  const file = finding.evidence?.path?.replace(/\\/g, "/");
  if (file) {
    properties.push(`file=${escapeProperty(file)}`);
  }
  if (finding.evidence?.line !== undefined && Number.isFinite(finding.evidence.line)) {
    properties.push(`line=${finding.evidence.line}`);
  }
  properties.push(`title=${escapeProperty(`${finding.ruleId}: ${finding.title}`)}`);

  const message = escapeMessage(`${finding.message} (${finding.ruleId})`);
  const props = properties.length > 0 ? ` ${properties.join(",")}` : "";
  return `::${level}${props}::${message}`;
}

function annotationLevel(severity: Severity): "error" | "warning" | "notice" {
  return severity === "critical" ? "error" : severity === "warning" ? "warning" : "notice";
}

function escapeProperty(value: string): string {
  return value
    .replace(/%/g, "%25")
    .replace(/\r/g, "%0D")
    .replace(/\n/g, "%0A")
    .replace(/:/g, "%3A")
    .replace(/,/g, "%2C");
}

function escapeMessage(value: string): string {
  return value.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
}
