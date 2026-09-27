import { MockModelProvider, createModelProvider, loadAiConfig } from "../../ai/index.js";
import { StudentService } from "../../agent/student.js";
import { parseAgentMode, defaultStudentMode } from "../../agent/modes.js";
import { EXIT_CODES, type ExitCode } from "../../types/index.js";
import { resolveCliProjectRoot } from "../safe-root.js";
import type { AgentToolName } from "../../agent/tools/types.js";

export async function runLearnCommand(options: {
  root?: string;
  mode?: string;
  viva?: boolean;
  docs?: boolean;
  build?: string;
  approve?: boolean;
  applyOpsJson?: string;
  json?: boolean;
  useMock?: boolean;
}): Promise<ExitCode> {
  const gated = await resolveCliProjectRoot(options.root ?? process.cwd());
  if (!gated.ok) {
    console.error(`Error: ${gated.message}`);
    return gated.code;
  }
  const root = gated.root;
  const mode = parseAgentMode(options.mode) ?? defaultStudentMode();
  const provider = options.useMock ? new MockModelProvider() : createModelProvider(loadAiConfig());

  const resolvedMode = options.build
    ? mode === "LEARN"
      ? "BUILD_WITH_ME"
      : mode
    : options.viva || options.docs
      ? "LEARN"
      : mode;

  const student = new StudentService({
    root,
    provider,
    mode: resolvedMode,
  });

  try {
    if (options.build) {
      let toolCalls: Array<{ name: AgentToolName; arguments: Record<string, unknown> }> | undefined;
      if (options.applyOpsJson) {
        try {
          const parsed = JSON.parse(options.applyOpsJson) as unknown;
          if (!Array.isArray(parsed)) throw new Error("expected array");
          toolCalls = parsed.map((item) => {
            const row = item as { name?: string; arguments?: Record<string, unknown> };
            if (!row.name || typeof row.name !== "string") throw new Error("ops need name");
            return {
              name: row.name as AgentToolName,
              arguments: row.arguments ?? {},
            };
          });
        } catch (error) {
          process.stderr.write(
            `Invalid --apply-ops JSON: ${error instanceof Error ? error.message : String(error)}\n`,
          );
          return EXIT_CODES.USAGE_ERROR;
        }
      }
      const result = await student.buildFeature({
        goal: options.build,
        approvedByHuman: options.approve === true,
        ...(toolCalls ? { toolCalls } : {}),
      });
      if (options.json) {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      } else {
        process.stdout.write(result.explanation);
        if (result.status === "awaiting-approval") {
          process.stdout.write("\nRe-run with --approve to execute the coding loop.\n");
        } else if (result.coding) {
          process.stdout.write(result.evidenceText);
        } else {
          process.stdout.write(`${result.evidenceText}\n`);
        }
      }
      if (result.status === "awaiting-approval" || result.status === "mode_forbidden") {
        return EXIT_CODES.USAGE_ERROR;
      }
      if (result.status === "failed" || result.status === "limit") {
        return EXIT_CODES.INTERNAL_ERROR;
      }
      return EXIT_CODES.SUCCESS;
    }

    if (options.viva) {
      const questions = await student.generateVivaQuestions();
      if (options.json) process.stdout.write(`${JSON.stringify({ mode, questions }, null, 2)}\n`);
      else {
        process.stdout.write("\nViva questions (grounded in detected stack):\n\n");
        for (const [i, q] of questions.entries()) process.stdout.write(`  ${i + 1}. ${q}\n`);
        process.stdout.write("\n");
      }
      return EXIT_CODES.SUCCESS;
    }
    if (options.docs) {
      const sections = await student.generateProjectDocumentation();
      if (options.json) process.stdout.write(`${JSON.stringify({ mode, sections }, null, 2)}\n`);
      else {
        for (const s of sections) {
          process.stdout.write(`\n[${s.truth}] ${s.title}\n${s.body}\n`);
        }
        process.stdout.write("\n");
      }
      return EXIT_CODES.SUCCESS;
    }

    const explained = await student.explainProject();
    if (options.json) process.stdout.write(`${JSON.stringify({ mode, ...explained }, null, 2)}\n`);
    else process.stdout.write(explained.text);
    return EXIT_CODES.SUCCESS;
  } finally {
    await student.end();
  }
}
