import { EXIT_CODES, type ExitCode } from "../../types/index.js";
import { isDirectory } from "../../utils/fs.js";
import { resolveRepoRoot } from "../../utils/path.js";
import {
  applyFixPlan,
  readClaudeSettings,
  readCodexConfig,
  readCursorignore,
} from "../../core/fix/apply.js";
import { buildFixPlan } from "../../core/fix/plan.js";
import { renderFixPlanTerminal } from "../../core/fix/render.js";
import { runFix } from "../../core/fix/run.js";
import { scan } from "../../core/scanner/scan.js";
import { colors } from "../../utils/colors.js";

export interface FixCommandOptions {
  targetPath?: string;
  dryRun?: boolean;
  yes?: boolean;
}

/**
 * Safe Repository Mutation — apply allowlisted agent-config exclusions.
 */
export async function runFixCommand(options: FixCommandOptions): Promise<ExitCode> {
  const target = resolveRepoRoot(options.targetPath ?? process.cwd());

  if (!(await isDirectory(target))) {
    console.error(`Error: not a directory: ${target}`);
    return EXIT_CODES.USAGE_ERROR;
  }

  const dryRun = options.dryRun === true;
  const yes = options.yes === true;

  try {
    if (dryRun) {
      const result = await scan({ cwd: target });
      const plan = await buildFixPlan(result);
      const cursorContent = await readCursorignore(plan.root);
      const claudeSettingsContent = await readClaudeSettings(plan.root);
      const codexConfigContent = await readCodexConfig(plan.root);
      const applyResult = await applyFixPlan(plan, { dryRun: true });
      process.stdout.write(
        renderFixPlanTerminal(plan, {
          dryRun: true,
          cursorContent,
          claudeSettingsContent,
          codexConfigContent,
          applyResult,
        }),
      );
      return EXIT_CODES.SUCCESS;
    }

    const { plan, applyResult, cancelled } = await runFix({
      cwd: target,
      dryRun: false,
      yes,
    });

    if (cancelled) {
      process.stdout.write("\n  Cancelled. No files were modified.\n\n");
      return EXIT_CODES.USAGE_ERROR;
    }

    const cursorContentAfter = await readCursorignore(plan.root);
    const claudeSettingsAfter = await readClaudeSettings(plan.root);
    const codexConfigAfter = await readCodexConfig(plan.root);
    process.stdout.write(
      renderFixPlanTerminal(plan, {
        dryRun: false,
        cursorContent: cursorContentAfter,
        claudeSettingsContent: claudeSettingsAfter,
        codexConfigContent: codexConfigAfter,
        applyResult,
      }),
    );

    if (applyResult.writtenFiles.length > 0) {
      const after = await scan({ cwd: target });
      const remainingSafeContext = after.findings.filter(
        (f) =>
          f.fixability === "safe" &&
          (f.ruleId === "context/generated-directory" || f.ruleId === "context/large-log-file"),
      );
      process.stdout.write(
        colors.dim(`  Re-scan: ${remainingSafeContext.length} safe context finding(s) remain.\n\n`),
      );
    }

    return EXIT_CODES.SUCCESS;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    if (isFixConfigOrPermissionError(message)) {
      return EXIT_CODES.USAGE_ERROR;
    }
    return EXIT_CODES.INTERNAL_ERROR;
  }
}

function isFixConfigOrPermissionError(message: string): boolean {
  return (
    message.includes("refusing") ||
    message.includes("not valid JSON") ||
    message.includes("EACCES") ||
    message.includes("EPERM") ||
    message.includes("permission denied")
  );
}
