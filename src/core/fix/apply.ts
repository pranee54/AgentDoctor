import type { FixApplyResult, FixPlan } from "./types.js";
import {
  previewCursorignoreActions,
  readCursorignore,
  writeCursorignore,
} from "./writers/cursorignore.js";

/**
 * Apply (or dry-run) a fix plan.
 * Week 1: only `.cursorignore` mutations are supported.
 */
export async function applyFixPlan(
  plan: FixPlan,
  options: { dryRun: boolean },
): Promise<FixApplyResult> {
  const current = await readCursorignore(plan.root);
  const preview = previewCursorignoreActions(current, plan.actions);

  if (!preview) {
    return {
      plan,
      dryRun: options.dryRun,
      writtenFiles: [],
      changedFiles: [],
    };
  }

  if (!options.dryRun) {
    await writeCursorignore(plan.root, preview.after);
  }

  return {
    plan,
    dryRun: options.dryRun,
    writtenFiles: options.dryRun ? [] : [preview.targetRelativePath],
    changedFiles: [preview.targetRelativePath],
  };
}

export { previewCursorignoreActions, readCursorignore };
