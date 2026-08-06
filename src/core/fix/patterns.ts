import type { Finding } from "../../types/index.js";

const SAFE_CONTEXT_RULES = new Set([
  "context/generated-directory",
  "context/large-log-file",
]);

export function isSafeContextFixRule(ruleId: string): boolean {
  return SAFE_CONTEXT_RULES.has(ruleId);
}

/**
 * Build a gitignore-style pattern that excludes the finding evidence path.
 * Directories (generated-directory) get a trailing slash.
 */
export function patternForFinding(finding: Finding): string | null {
  const evidencePath = finding.evidence?.path?.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!evidencePath) {
    return null;
  }

  if (finding.ruleId === "context/generated-directory") {
    return evidencePath.endsWith("/") ? evidencePath : `${evidencePath}/`;
  }

  if (finding.ruleId === "context/large-log-file") {
    return evidencePath;
  }

  return null;
}
