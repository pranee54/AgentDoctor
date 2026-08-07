import type { FixApplyResult, FixPlan } from "./types.js";
import {
  previewClaudeSettingsActions,
  readClaudeSettings,
  writeClaudeSettings,
} from "./writers/claude-settings.js";
import {
  previewCodexConfigActions,
  readCodexConfig,
  writeCodexConfig,
} from "./writers/codex-config.js";
import {
  previewCursorignoreActions,
  readCursorignore,
  writeCursorignore,
} from "./writers/cursorignore.js";

/**
 * Apply (or dry-run) a fix plan.
 * Safe writers: `.cursorignore`, Claude settings deny, Codex config.toml deny.
 */
export async function applyFixPlan(
  plan: FixPlan,
  options: { dryRun: boolean },
): Promise<FixApplyResult> {
  const cursorContent = await readCursorignore(plan.root);
  const claudeContent = await readClaudeSettings(plan.root);
  const codexContent = await readCodexConfig(plan.root);
  const cursorPreview = previewCursorignoreActions(cursorContent, plan.actions);
  const claudePreview = previewClaudeSettingsActions(claudeContent, plan.actions);
  const codexPreview = previewCodexConfigActions(codexContent, plan.actions);

  const writtenFiles: string[] = [];
  const changedFiles: string[] = [];

  if (cursorPreview) {
    changedFiles.push(cursorPreview.targetRelativePath);
    if (!options.dryRun) {
      await writeCursorignore(plan.root, cursorPreview.after);
      writtenFiles.push(cursorPreview.targetRelativePath);
    }
  }

  if (claudePreview) {
    changedFiles.push(claudePreview.targetRelativePath);
    if (!options.dryRun) {
      await writeClaudeSettings(plan.root, claudePreview.after);
      writtenFiles.push(claudePreview.targetRelativePath);
    }
  }

  if (codexPreview) {
    changedFiles.push(codexPreview.targetRelativePath);
    if (!options.dryRun) {
      await writeCodexConfig(plan.root, codexPreview.after);
      writtenFiles.push(codexPreview.targetRelativePath);
    }
  }

  return {
    plan,
    dryRun: options.dryRun,
    writtenFiles,
    changedFiles,
  };
}

export { previewCursorignoreActions, readCursorignore };
export { previewClaudeSettingsActions, readClaudeSettings };
export { previewCodexConfigActions, readCodexConfig };
