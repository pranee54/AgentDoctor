import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { scan } from "../scanner/scan.js";
import { applyFixPlan, readCursorignore } from "./apply.js";
import { buildFixPlan } from "./plan.js";
import { renderFixPlanTerminal } from "./render.js";
import type { FixApplyResult, FixPlan } from "./types.js";

export interface RunFixOptions {
  cwd: string;
  dryRun: boolean;
  yes: boolean;
}

export interface RunFixResult {
  plan: FixPlan;
  applyResult: FixApplyResult;
  cancelled: boolean;
}

/**
 * Scan → plan → (confirm) → apply Safe Repository Mutation actions.
 */
export async function runFix(options: RunFixOptions): Promise<RunFixResult> {
  const result = await scan({ cwd: options.cwd });
  const plan = await buildFixPlan(result);
  const cursorContent = await readCursorignore(plan.root);

  if (plan.actions.length === 0 || options.dryRun) {
    const applyResult = await applyFixPlan(plan, { dryRun: true });
    return { plan, applyResult, cancelled: false };
  }

  if (!options.yes) {
    const previewText = renderFixPlanTerminal(plan, {
      dryRun: true,
      cursorContent,
    });
    process.stdout.write(previewText);
    const confirmed = await confirm("Apply these changes?");
    if (!confirmed) {
      return {
        plan,
        applyResult: {
          plan,
          dryRun: true,
          writtenFiles: [],
          changedFiles: [],
        },
        cancelled: true,
      };
    }
  }

  const applyResult = await applyFixPlan(plan, { dryRun: false });
  return { plan, applyResult, cancelled: false };
}

async function confirm(question: string): Promise<boolean> {
  if (!input.isTTY || !output.isTTY) {
    process.stderr.write(
      "Error: confirmation required but stdin is not a TTY. Re-run with --yes or --dry-run.\n",
    );
    return false;
  }
  const rl = readline.createInterface({ input, output });
  try {
    const answer = await rl.question(`${question} [y/N] `);
    return /^y(es)?$/i.test(answer.trim());
  } finally {
    rl.close();
  }
}
