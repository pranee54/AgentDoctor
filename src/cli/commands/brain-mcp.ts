import { EXIT_CODES } from "../../types/index.js";
import { BrainMcpError, runBrainMcpStdio } from "../../mcp/brain/index.js";

export interface BrainMcpCommandOptions {
  root: string;
  buildIfMissing?: boolean;
  generatedAt?: string;
}

/**
 * Start Brain MCP over STDIO. Must not write protocol noise to stdout.
 */
export async function runBrainMcpCommand(options: BrainMcpCommandOptions): Promise<number> {
  try {
    if (!options.root || options.root.trim().length === 0) {
      process.stderr.write(
        "Error: --root <path> is required (never scans process.cwd() implicitly)\n",
      );
      return EXIT_CODES.USAGE_ERROR;
    }
    await runBrainMcpStdio({
      root: options.root,
      buildIfMissing: options.buildIfMissing !== false,
      ...(options.generatedAt !== undefined ? { generatedAt: options.generatedAt } : {}),
      log: (message) => process.stderr.write(`${message}\n`),
    });
    // STDIO server runs until stdin closes; resolve when transport ends.
    await new Promise<void>((resolve) => {
      const onClose = () => resolve();
      process.stdin.on("end", onClose);
      process.stdin.on("close", onClose);
    });
    return EXIT_CODES.SUCCESS;
  } catch (error) {
    if (error instanceof BrainMcpError) {
      process.stderr.write(`Error: ${error.message}\n`);
      if (error.code === "invalid_root" || error.code === "invalid_argument") {
        return EXIT_CODES.USAGE_ERROR;
      }
      return EXIT_CODES.INTERNAL_ERROR;
    }
    const message = error instanceof Error ? error.message : "brain-mcp failed";
    process.stderr.write(`Error: ${message}\n`);
    return EXIT_CODES.INTERNAL_ERROR;
  }
}
