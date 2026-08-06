import type { FixApplyResult, FixPlan } from "./types.js";
import { previewCursorignoreActions } from "./writers/cursorignore.js";

export function renderFixPlanTerminal(
  plan: FixPlan,
  options: {
    dryRun: boolean;
    cursorContent: string | null;
    applyResult?: FixApplyResult;
  },
): string {
  const lines: string[] = [];
  lines.push("");
  lines.push(options.dryRun ? "AgentDoctor fix (dry-run)" : "AgentDoctor fix");
  lines.push("");

  if (plan.actions.length === 0) {
    lines.push("  No applicable fixes.");
    if (plan.skipped.length > 0) {
      lines.push("");
      lines.push(`  Skipped findings: ${plan.skipped.length}`);
      const reasons = summarizeSkipReasons(plan.skipped.map((s) => s.reason));
      for (const [reason, count] of reasons) {
        lines.push(`    - ${reason} (${count})`);
      }
    }
    lines.push("");
    return lines.join("\n");
  }

  lines.push(`  Proposed actions: ${plan.actions.length}`);
  for (const action of plan.actions) {
    lines.push(`    • [${action.agent}] ${action.description}`);
    lines.push(`      pattern: ${action.pattern}`);
    lines.push(`      findings: ${action.findingIds.length}`);
  }

  const preview = previewCursorignoreActions(options.cursorContent, plan.actions);
  if (preview) {
    lines.push("");
    lines.push("  File changes:");
    lines.push(`    ${preview.targetRelativePath} (+${preview.patternsToAdd.length} pattern(s))`);
    lines.push("");
    for (const previewLine of preview.preview.split("\n")) {
      lines.push(`  ${previewLine}`);
    }
  }

  if (options.applyResult && !options.dryRun) {
    lines.push("");
    if (options.applyResult.writtenFiles.length > 0) {
      lines.push(`  Wrote: ${options.applyResult.writtenFiles.join(", ")}`);
    } else {
      lines.push("  No files written.");
    }
  } else if (options.dryRun) {
    lines.push("");
    lines.push("  No files were modified (dry-run).");
    lines.push("  Re-run without --dry-run to apply.");
  }

  if (plan.skipped.length > 0) {
    lines.push("");
    lines.push(`  Skipped: ${plan.skipped.length} finding(s) (writers pending or already fixed)`);
  }

  lines.push("");
  return lines.join("\n");
}

function summarizeSkipReasons(reasons: string[]): Array<[string, number]> {
  const map = new Map<string, number>();
  for (const reason of reasons) {
    map.set(reason, (map.get(reason) ?? 0) + 1);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}
