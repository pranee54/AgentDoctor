import type { AgentId } from "../../types/index.js";

export type FixKind = "append-ignore-pattern";

/** Allowlisted relative paths fix may create or modify. */
export const FIX_PATH_ALLOWLIST = [
  ".cursorignore",
  ".claude/settings.json",
  ".codex/config.toml",
] as const;

export type FixAllowlistedPath = (typeof FIX_PATH_ALLOWLIST)[number];

export interface FixAction {
  id: string;
  kind: FixKind;
  agent: AgentId;
  targetRelativePath: FixAllowlistedPath;
  /** Ignore pattern to ensure is present (gitignore-style). */
  pattern: string;
  /** Evidence path this pattern is meant to exclude. */
  evidencePath: string;
  findingIds: string[];
  description: string;
}

export interface SkippedFix {
  findingId: string;
  ruleId: string;
  reason: string;
}

export interface FixPlan {
  root: string;
  actions: FixAction[];
  skipped: SkippedFix[];
}

export interface FixApplyResult {
  plan: FixPlan;
  dryRun: boolean;
  writtenFiles: string[];
  /** Relative paths that would be / were written */
  changedFiles: string[];
}
