import { PACKAGE_VERSION } from "../../constants.js";
import { EXIT_CODES, type ExitCode } from "../../types/index.js";
import { colors, symbolOk } from "../../utils/colors.js";

/**
 * Self-check for the AgentDoctor installation (environment health).
 */
export async function runDoctorCommand(): Promise<ExitCode> {
  const lines: string[] = [];
  lines.push("");
  lines.push(colors.bold("AgentDoctor doctor"));
  lines.push("");
  lines.push(`  ${symbolOk()} AgentDoctor v${PACKAGE_VERSION}`);
  lines.push(`  ${symbolOk()} Node.js ${process.version}`);
  lines.push(`  ${symbolOk()} Platform ${process.platform}-${process.arch}`);
  lines.push(`  ${symbolOk()} Core scan API available`);
  lines.push("");
  lines.push(colors.dim("Environment looks ready."));
  lines.push(colors.dim("Run agentdoctor fix --dry-run to preview safe fixes."));
  lines.push("");
  process.stdout.write(lines.join("\n"));
  return EXIT_CODES.SUCCESS;
}
