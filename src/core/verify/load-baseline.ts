import fs from "node:fs/promises";
import path from "node:path";

import type { Finding } from "../../types/index.js";

const DEFAULT_BASELINE_NAMES = ["agentdoctor-report.json", ".agentdoctor-baseline.json"] as const;

export interface LoadedBaseline {
  path: string;
  findings: Finding[];
}

function isFindingLike(value: unknown): value is Finding {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.ruleId === "string" &&
    typeof record.severity === "string" &&
    typeof record.title === "string" &&
    typeof record.message === "string"
  );
}

/**
 * Load findings from a prior `scan --json` report (or a bare `{ findings: [...] }` file).
 */
export async function loadBaselineFindings(baselinePath: string): Promise<LoadedBaseline> {
  const absolute = path.resolve(baselinePath);
  let raw: string;
  try {
    raw = await fs.readFile(absolute, "utf8");
  } catch {
    throw new Error(`baseline not found or unreadable: ${absolute}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new Error(`baseline is not valid JSON: ${absolute}`);
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error(`baseline JSON must be an object: ${absolute}`);
  }

  const findingsUnknown = (parsed as { findings?: unknown }).findings;
  if (!Array.isArray(findingsUnknown)) {
    throw new Error(`baseline JSON must include a findings array: ${absolute}`);
  }

  const findings: Finding[] = [];
  for (const item of findingsUnknown) {
    if (!isFindingLike(item)) {
      throw new Error(`baseline contains an invalid finding entry: ${absolute}`);
    }
    findings.push(item);
  }

  return { path: absolute, findings };
}

/**
 * Resolve baseline path: explicit flag, else first default filename that exists under root.
 */
export async function resolveBaselinePath(
  root: string,
  explicitBaseline?: string,
): Promise<string | undefined> {
  if (explicitBaseline) {
    return path.isAbsolute(explicitBaseline)
      ? explicitBaseline
      : path.resolve(root, explicitBaseline);
  }

  for (const name of DEFAULT_BASELINE_NAMES) {
    const candidate = path.join(root, name);
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // try next
    }
  }
  return undefined;
}

export { DEFAULT_BASELINE_NAMES };
