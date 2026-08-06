import path from "node:path";

import type { Finding, ScanResult } from "../../types/index.js";
import { readTextFile } from "../../utils/fs.js";
import { createIgnoreIndex, parseIgnoreFile, pathMatchesAny } from "../rules/ignore.js";
import { isSafeContextFixRule, patternForFinding } from "./patterns.js";
import type { FixAction, FixPlan, SkippedFix } from "./types.js";

const DEFAULT_MAX_IGNORE_BYTES = 512 * 1024;

function cursorConfigured(result: ScanResult): boolean {
  return result.agents.some((a) => a.id === "cursor" && (a.detected || a.configured));
}

async function loadCursorignorePatterns(root: string): Promise<string[]> {
  const filePath = path.join(root, ".cursorignore");
  const text = await readTextFile(filePath, DEFAULT_MAX_IGNORE_BYTES);
  if (text === null) {
    return [];
  }
  return parseIgnoreFile(text);
}

/**
 * Build a fix plan from a scan result.
 * Week 1: Cursor `.cursorignore` appends for safe context findings only.
 */
export async function buildFixPlan(result: ScanResult): Promise<FixPlan> {
  const root = result.repository.root;
  const skipped: SkippedFix[] = [];
  const actionsByKey = new Map<string, FixAction>();

  const existingCursorPatterns = await loadCursorignorePatterns(root);
  const cursorIndex = createIgnoreIndex({
    gitignorePatterns: [],
    cursorignorePatterns: existingCursorPatterns,
  });

  const hasCursor = cursorConfigured(result);

  for (const finding of result.findings) {
    if (finding.fixability !== "safe") {
      continue;
    }

    if (!isSafeContextFixRule(finding.ruleId)) {
      skipped.push({
        findingId: finding.id,
        ruleId: finding.ruleId,
        reason: "No automated fixer for this safe rule yet",
      });
      continue;
    }

    const pattern = patternForFinding(finding);
    const evidencePath = finding.evidence?.path?.replace(/\\/g, "/");
    if (!pattern || !evidencePath) {
      skipped.push({
        findingId: finding.id,
        ruleId: finding.ruleId,
        reason: "Finding has no usable evidence path",
      });
      continue;
    }

    const wantsCursor = finding.affectedAgents.includes("cursor");
    if (wantsCursor && hasCursor) {
      if (cursorIndex.matchesCursorignore(evidencePath) || cursorIndex.matchesCursorignore(pattern)) {
        skipped.push({
          findingId: finding.id,
          ruleId: finding.ruleId,
          reason: "Already excluded by .cursorignore",
        });
      } else {
        mergeCursorAction(actionsByKey, finding, pattern, evidencePath);
      }
    } else if (wantsCursor && !hasCursor) {
      skipped.push({
        findingId: finding.id,
        ruleId: finding.ruleId,
        reason: "Cursor not detected; skipping .cursorignore fix",
      });
    }

    for (const agent of finding.affectedAgents) {
      if (agent === "cursor") {
        continue;
      }
      skipped.push({
        findingId: finding.id,
        ruleId: finding.ruleId,
        reason: `Fix writer for ${agent} not implemented yet`,
      });
    }
  }

  return {
    root,
    actions: [...actionsByKey.values()].sort((a, b) => a.id.localeCompare(b.id)),
    skipped,
  };
}

function mergeCursorAction(
  actionsByKey: Map<string, FixAction>,
  finding: Finding,
  pattern: string,
  evidencePath: string,
): void {
  const key = `cursor:.cursorignore:${pattern}`;
  const existing = actionsByKey.get(key);
  if (existing) {
    if (!existing.findingIds.includes(finding.id)) {
      existing.findingIds.push(finding.id);
    }
    return;
  }

  actionsByKey.set(key, {
    id: key,
    kind: "append-ignore-pattern",
    agent: "cursor",
    targetRelativePath: ".cursorignore",
    pattern,
    evidencePath,
    findingIds: [finding.id],
    description: `Exclude ${evidencePath} from Cursor agent context via .cursorignore`,
  });
}

/** Patterns that would be newly appended given current file contents. */
export function missingPatternsForCursorignore(
  currentContent: string | null,
  patterns: string[],
): string[] {
  const existing = currentContent === null ? [] : parseIgnoreFile(currentContent);
  const missing: string[] = [];
  for (const pattern of patterns) {
    if (existing.includes(pattern)) {
      continue;
    }
    if (pathMatchesAny(pattern.replace(/\/$/, ""), existing) && existing.some((p) => p === pattern)) {
      continue;
    }
    // Also skip if an existing pattern already excludes this path
    const evidenceGuess = pattern.endsWith("/") ? pattern.slice(0, -1) : pattern;
    if (pathMatchesAny(evidenceGuess, existing) || pathMatchesAny(pattern, existing)) {
      continue;
    }
    missing.push(pattern);
  }
  return missing;
}
