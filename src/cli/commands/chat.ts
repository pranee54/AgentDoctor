import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { ChatService, formatChatResponseForCli } from "../../agent/chat/index.js";
import { MockModelProvider, createModelProvider, loadAiConfig } from "../../ai/index.js";
import { EXIT_CODES, type ExitCode } from "../../types/index.js";
import { resolveRepoRoot } from "../../utils/path.js";
import { colors } from "../../utils/colors.js";

function printBanner(options: {
  root: string;
  name: string;
  providerLabel: string;
  languages: string[];
  frameworks: string[];
}): void {
  const lines = [
    "",
    colors.bold("AgentDoctor Project Chat"),
    "",
    `Project:`,
    `  ${options.name}`,
    `  ${options.root}`,
    "",
    `Detected:`,
    `  ${(options.languages.length ? options.languages : ["(none)"]).join(", ")}`,
    `  frameworks: ${(options.frameworks.length ? options.frameworks : ["(none)"]).join(", ")}`,
    "",
    `AI:`,
    `  ${options.providerLabel}`,
    "",
    "Ask questions about your project.",
    "",
    "Commands:",
    "  /help     Show help",
    "  /project  Project summary",
    "  /context  Context used for last answer",
    "  /clear    Clear conversation memory",
    "  /exit     Leave chat",
    "",
    "Milestone 2 does not edit files or run commands.",
    "",
  ];
  process.stdout.write(`${lines.join("\n")}\n`);
}

function printHelp(): void {
  process.stdout.write(
    [
      "",
      "Ask natural-language questions about this repository.",
      "Answers use project evidence (Brain/graph/context) when available.",
      "",
      "Truth labels: VERIFIED | INFERRED | UNKNOWN | EXTERNAL",
      "",
      "Examples:",
      "  Explain my project.",
      "  How does authentication work?",
      "  Explain this like I'm a beginner.",
      "",
    ].join("\n"),
  );
}

export async function runAskCommand(options: {
  question: string;
  root?: string;
  json?: boolean;
  /** Test-only: force mock provider */
  useMock?: boolean;
}): Promise<ExitCode> {
  const root = resolveRepoRoot(options.root ?? process.cwd());
  const provider = options.useMock ? new MockModelProvider() : createModelProvider(loadAiConfig());
  const chat = new ChatService({
    root,
    provider,
    persistAudit: !options.useMock,
  });

  try {
    const response = await chat.ask(options.question);
    if (options.json) {
      process.stdout.write(`${JSON.stringify(response, null, 2)}\n`);
    } else {
      process.stdout.write(formatChatResponseForCli(response));
    }
    if (response.status === "provider-none") return EXIT_CODES.USAGE_ERROR;
    if (response.status === "provider-error" || response.status === "failed") {
      return EXIT_CODES.INTERNAL_ERROR;
    }
    return EXIT_CODES.SUCCESS;
  } finally {
    await chat.end();
  }
}

export async function runChatCommand(options: {
  root?: string;
  /** Non-interactive scripted lines (tests) */
  scriptedInputs?: string[];
  useMock?: boolean;
}): Promise<ExitCode> {
  const root = resolveRepoRoot(options.root ?? process.cwd());
  const provider = options.useMock ? new MockModelProvider() : createModelProvider(loadAiConfig());
  const chat = new ChatService({
    root,
    provider,
    persistAudit: !options.useMock,
  });

  const started = await chat.start();
  printBanner({
    root: started.summary.root,
    name: started.summary.name,
    providerLabel: started.providerLabel,
    languages: started.summary.languages,
    frameworks: started.summary.frameworks,
  });

  if (provider.id === "none" && !options.useMock) {
    process.stdout.write(
      "Deterministic project chat (no LLM). Architecture, auth, and dependency questions use local analyzers.\n\n",
    );
  }

  const scripted = options.scriptedInputs ? [...options.scriptedInputs] : undefined;
  const rl =
    scripted === undefined
      ? readline.createInterface({ input, output, terminal: Boolean(output.isTTY) })
      : undefined;

  const readLine = async (): Promise<string | null> => {
    if (scripted) {
      if (scripted.length === 0) return null;
      return scripted.shift() ?? null;
    }
    const answer = await rl!.question("You:\n> ");
    return answer;
  };

  try {
    while (true) {
      const raw = await readLine();
      if (raw === null) break;
      const line = raw.trim();
      if (!line) continue;

      if (line === "/exit" || line === "exit" || line === "quit") {
        process.stdout.write("Goodbye.\n");
        break;
      }
      if (line === "/help" || line === "help") {
        printHelp();
        continue;
      }
      if (line === "/project") {
        process.stdout.write(await chat.formatProject());
        continue;
      }
      if (line === "/context") {
        process.stdout.write(chat.formatContext());
        continue;
      }
      if (line === "/clear") {
        chat.clearMemory();
        process.stdout.write("Conversation memory cleared.\n");
        continue;
      }

      const response = await chat.ask(line);
      process.stdout.write(chat.formatResponse(response));
      if (response.status === "provider-error") {
        // stay in loop; user may fix provider elsewhere
      }
    }
    return EXIT_CODES.SUCCESS;
  } finally {
    rl?.close();
    await chat.end();
  }
}
