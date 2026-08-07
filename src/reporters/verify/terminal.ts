import { PACKAGE_VERSION } from "../../constants.js";
import type { VerifyFindingRef } from "../../core/verify/compare.js";
import type { VerifyResult } from "../../core/verify/verify.js";
import { colors, symbolFail, symbolOk, symbolWarn } from "../../utils/colors.js";
import { sanitizeForOutput } from "../../utils/path.js";

function renderBucket(
  title: string,
  symbol: string,
  color: (s: string) => string,
  items: VerifyFindingRef[],
  limit: number,
): string[] {
  const lines: string[] = [];
  lines.push(color(`${symbol} ${title} (${items.length})`));
  if (items.length === 0) {
    lines.push(colors.dim("  (none)"));
    lines.push("");
    return lines;
  }
  const shown = items.slice(0, limit);
  for (const item of shown) {
    const path = item.evidence?.path ? ` — ${sanitizeForOutput(item.evidence.path)}` : "";
    lines.push(`  ${sanitizeForOutput(item.ruleId)}${path}`);
    lines.push(colors.dim(`    ${sanitizeForOutput(item.title)}`));
  }
  if (items.length > limit) {
    lines.push(colors.dim(`  … and ${items.length - limit} more`));
  }
  lines.push("");
  return lines;
}

export function renderVerifyTerminalReport(result: VerifyResult, verbose = false): string {
  const lines: string[] = [];
  const limit = verbose ? 50 : 12;

  lines.push("");
  lines.push(colors.bold(`AgentDoctor verify v${PACKAGE_VERSION}`));
  lines.push(colors.dim(`Baseline: ${sanitizeForOutput(result.baselinePath)}`));
  lines.push("");

  lines.push(...renderBucket("Fixed", symbolOk(), colors.green, result.fixed, limit));
  lines.push(...renderBucket("Remaining", symbolWarn(), colors.yellow, result.remaining, limit));
  lines.push(...renderBucket("New", symbolFail(), colors.red, result.new, limit));

  lines.push(colors.bold("Summary"));
  lines.push(
    `  Fixed ${result.summary.fixed} · Remaining ${result.summary.remaining} · New ${result.summary.new} · Unchanged ${result.summary.unchanged}`,
  );
  lines.push(
    colors.dim(`  Before ${result.summary.before} → After ${result.summary.after} findings`),
  );
  if (result.scores) {
    lines.push(colors.dim(`  Score ${result.scores.overall}/100`));
  }
  if (verbose) {
    lines.push(
      colors.dim(
        `  Timing scan=${result.timing.scanMs}ms compare=${result.timing.compareMs}ms total=${result.timing.totalMs}ms`,
      ),
    );
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}
