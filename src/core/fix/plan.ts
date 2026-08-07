import path from "node:path";

import type { Finding, ScanResult } from "../../types/index.js";
import { readTextFile } from "../../utils/fs.js";
import { settingsTextDeniesPath } from "../rules/claude-deny.js";
import { configTextDeniesPath } from "../rules/codex-deny.js";
import { createIgnoreIndex, parseIgnoreFile, pathMatchesAny } from "../rules/ignore.js";
import { isSafeContextFixRule, patternForFinding } from "./patterns.js";
import type { FixAction, FixPlan, SkippedFix } from "./types.js";
import { denyRuleForFixPattern } from "./writers/claude-settings.js";
import { assertWritableCodexConfig, denyKeyForFixPattern } from "./writers/codex-config.js";

const DEFAULT_MAX_IGNORE_BYTES = 512 * 1024;

function cursorConfigured(result: ScanResult): boolean {
  return result.agents.some((a) => a.id === "cursor" && (a.detected || a.configured));
}

function claudeConfigured(result: ScanResult): boolean {
  return result.agents.some((a) => a.id === "claude-code" && (a.detected || a.configured));
}

function codexConfigured(result: ScanResult): boolean {
  return result.agents.some((a) => a.id === "codex" && (a.detected || a.configured));
}

async function loadCursorignorePatterns(root: string): Promise<string[]> {
  const filePath = path.join(root, ".cursorignore");
  const text = await readTextFile(filePath, DEFAULT_MAX_IGNORE_BYTES);
  if (text === null) {
    return [];
  }
  return parseIgnoreFile(text);
}

async function loadClaudeSettingsText(root: string): Promise<string | null> {
  return readTextFile(path.join(root, ".claude/settings.json"), DEFAULT_MAX_IGNORE_BYTES);
}

async function loadCodexConfigText(root: string): Promise<string | null> {
  return readTextFile(path.join(root, ".codex/config.toml"), DEFAULT_MAX_IGNORE_BYTES);
}

/**
 * Build a fix plan from a scan result.
 * Safe context exclusions: Cursor `.cursorignore`, Claude Code Read deny, Codex filesystem deny.
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
  const claudeSettingsText = await loadClaudeSettingsText(root);
  const codexConfigText = await loadCodexConfigText(root);

  const hasCursor = cursorConfigured(result);
  const hasClaude = claudeConfigured(result);
  const hasCodex = codexConfigured(result);

  for (const finding of result.findings) {
    if (finding.fixability !== "safe") {
      skipped.push({
        findingId: finding.id,
        ruleId: finding.ruleId,
        reason:
          finding.fixability === "review"
            ? "Requires human review (not auto-fixed)"
            : finding.fixability === "manual"
              ? "Manual remediation required (not auto-fixed)"
              : "Not auto-fixable",
      });
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
    const wantsClaude = finding.affectedAgents.includes("claude-code");
    const wantsCodex = finding.affectedAgents.includes("codex");

    if (wantsCursor && hasCursor) {
      if (
        cursorIndex.matchesCursorignore(evidencePath) ||
        cursorIndex.matchesCursorignore(pattern)
      ) {
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

    if (wantsClaude && hasClaude) {
      const denyRule = denyRuleForFixPattern(pattern, evidencePath);
      if (claudeSettingsText && settingsTextDeniesPath(claudeSettingsText, evidencePath)) {
        skipped.push({
          findingId: finding.id,
          ruleId: finding.ruleId,
          reason: "Already excluded by Claude Code Read deny",
        });
      } else {
        mergeClaudeAction(actionsByKey, finding, pattern, evidencePath, denyRule);
      }
    } else if (wantsClaude && !hasClaude) {
      skipped.push({
        findingId: finding.id,
        ruleId: finding.ruleId,
        reason: "Claude Code not detected; skipping settings deny fix",
      });
    }

    if (wantsCodex && hasCodex) {
      const denyKey = denyKeyForFixPattern(pattern, evidencePath);
      if (codexConfigText && configTextDeniesPath(codexConfigText, evidencePath)) {
        skipped.push({
          findingId: finding.id,
          ruleId: finding.ruleId,
          reason: "Already excluded by Codex filesystem deny",
        });
      } else if (codexConfigText) {
        // Refuse unwritable/invalid config the same way Claude Fix refuses bad JSON —
        // do not silently skip and leave Codex findings uncleared after a partial Cursor write.
        assertWritableCodexConfig(codexConfigText);
        mergeCodexAction(actionsByKey, finding, pattern, evidencePath, denyKey);
      } else {
        mergeCodexAction(actionsByKey, finding, pattern, evidencePath, denyKey);
      }
    } else if (wantsCodex && !hasCodex) {
      skipped.push({
        findingId: finding.id,
        ruleId: finding.ruleId,
        reason: "Codex not detected; skipping config.toml deny fix",
      });
    }

    for (const agent of finding.affectedAgents) {
      if (agent === "cursor" || agent === "claude-code" || agent === "codex") {
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

function mergeClaudeAction(
  actionsByKey: Map<string, FixAction>,
  finding: Finding,
  pattern: string,
  evidencePath: string,
  denyRule: string,
): void {
  const key = `claude-code:.claude/settings.json:${denyRule}`;
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
    agent: "claude-code",
    targetRelativePath: ".claude/settings.json",
    pattern,
    evidencePath,
    findingIds: [finding.id],
    description: `Exclude ${evidencePath} from Claude Code via permissions.deny ${denyRule}`,
  });
}

function mergeCodexAction(
  actionsByKey: Map<string, FixAction>,
  finding: Finding,
  pattern: string,
  evidencePath: string,
  denyKey: string,
): void {
  const key = `codex:.codex/config.toml:${denyKey}`;
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
    agent: "codex",
    targetRelativePath: ".codex/config.toml",
    pattern,
    evidencePath,
    findingIds: [finding.id],
    description: `Exclude ${evidencePath} from Codex via filesystem deny "${denyKey}"`,
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
    if (
      pathMatchesAny(pattern.replace(/\/$/, ""), existing) &&
      existing.some((p) => p === pattern)
    ) {
      continue;
    }
    const evidenceGuess = pattern.endsWith("/") ? pattern.slice(0, -1) : pattern;
    if (pathMatchesAny(evidenceGuess, existing) || pathMatchesAny(pattern, existing)) {
      continue;
    }
    missing.push(pattern);
  }
  return missing;
}
