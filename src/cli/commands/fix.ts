import { EXIT_CODES, type ExitCode } from "../../types/index.js";
import { colors } from "../../utils/colors.js";

/**
 * Safe automatic fixes are not implemented yet.
 */
export async function runFixCommand(options: {
  dryRun?: boolean;
  yes?: boolean;
}): Promise<ExitCode> {
  const lines: string[] = [];
  lines.push("");
  lines.push(colors.bold("AgentDoctor fix"));
  lines.push("");
  if (options.dryRun) {
    lines.push("  Dry-run mode requested.");
  }
  lines.push("  Fix mode is not implemented yet.");
  lines.push("  No files were modified.");
  lines.push("");
  process.stdout.write(lines.join("\n"));
  return EXIT_CODES.SUCCESS;
}
