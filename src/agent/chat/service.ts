import { randomUUID } from "node:crypto";

import {
  createModelProvider,
  loadAiConfig,
  publicAiConfig,
  redactForModel,
  type ModelProvider,
} from "../../ai/index.js";
import { buildIntelligenceGraph } from "../../intelligence/graph/build.js";
import {
  appendSessionEvent,
  createSession,
  endSession,
  type AgentSession,
} from "../../platform/sessions/store.js";
import { resolveRepoRoot } from "../../utils/path.js";
import { retrieveProjectContext } from "../context/retrieve.js";
import type { ContextBundle } from "../context/types.js";
import { ChatMemory } from "./memory.js";
import { PROJECT_CHAT_SYSTEM_PROMPT, wrapProjectData } from "./prompts.js";
import {
  formatProjectSummary,
  summarizeProjectForChat,
  type ProjectChatSummary,
} from "./project-summary.js";
import { buildChatTurnResponse, formatChatResponseForCli } from "./response.js";
import type { ChatServiceOptions, ChatTurnResponse } from "./types.js";
import { answerDeterministicProjectQuestion } from "./deterministic.js";

export const CHAT_PROVIDER_NONE_MESSAGE = `AI chat is not configured.

Configure an AI provider to use AgentDoctor Project Chat.

Set AGENTDOCTOR_AI_PROVIDER (and AGENTDOCTOR_AI_API_KEY / AGENTDOCTOR_AI_BASE_URL as needed).

AgentDoctor's non-AI project analysis remains available.`;

type CachedGraph = Awaited<ReturnType<typeof buildIntelligenceGraph>>;

/**
 * Project Chat service (Milestone 2).
 * Orchestrates memory → context → model → truth/citations.
 * Does not edit files or execute commands.
 */
export class ChatService {
  readonly root: string;
  readonly memory: ChatMemory;
  private readonly provider: ModelProvider;
  private readonly budgetTokens: number;
  private readonly persistAudit: boolean;
  private readonly systemPrompt: string;
  private auditSession: AgentSession | undefined;
  private graphCache: CachedGraph | undefined;
  private lastContext: ContextBundle | undefined;
  private started = false;

  constructor(options: ChatServiceOptions) {
    this.root = resolveRepoRoot(options.root);
    this.provider = options.provider ?? createModelProvider(loadAiConfig());
    this.budgetTokens = options.budgetTokens ?? 6_000;
    this.persistAudit = options.persistAudit !== false;
    this.systemPrompt = options.systemPromptAddon
      ? `${PROJECT_CHAT_SYSTEM_PROMPT}\n\n${options.systemPromptAddon}`
      : PROJECT_CHAT_SYSTEM_PROMPT;
    this.memory = new ChatMemory({
      root: this.root,
      ...(options.maxMemoryTurns ? { maxTurns: options.maxMemoryTurns } : {}),
      ...(options.maxMemoryChars ? { maxChars: options.maxMemoryChars } : {}),
    });
  }

  get sessionId(): string {
    return this.memory.sessionId;
  }

  getProviderId(): string {
    return this.provider.id;
  }

  getLastContextPaths(): string[] {
    return (this.lastContext?.citations ?? [])
      .map((c) => c.path)
      .filter((p): p is string => Boolean(p));
  }

  getLastContext(): ContextBundle | undefined {
    return this.lastContext;
  }

  async start(): Promise<{ summary: ProjectChatSummary; providerLabel: string }> {
    if (this.started) {
      return {
        summary: await summarizeProjectForChat(this.root),
        providerLabel: this.providerLabel(),
      };
    }
    this.started = true;
    if (this.persistAudit) {
      const cfg = publicAiConfig(loadAiConfig());
      this.auditSession = await createSession({
        root: this.root,
        agentId: "project-chat",
        model: `${this.provider.id}:${cfg.model}`,
      });
      await this.audit("prompt", "CHAT_STARTED", {
        provider: this.provider.id,
        sessionId: this.sessionId,
      });
    }
    // Warm graph once per chat session
    try {
      this.graphCache = await buildIntelligenceGraph({ root: this.root, mode: "auto" });
    } catch {
      this.graphCache = undefined;
    }
    return {
      summary: await summarizeProjectForChat(this.root),
      providerLabel: this.providerLabel(),
    };
  }

  async ask(userMessage: string): Promise<ChatTurnResponse> {
    await this.start();
    const safeUser = redactForModel(userMessage);
    this.memory.addUser(safeUser);
    await this.audit("prompt", "CHAT_USER_MESSAGE", {
      chars: String(safeUser.length),
    });

    if (this.provider.id === "none") {
      const response = await answerDeterministicProjectQuestion({
        root: this.root,
        question: safeUser,
        sessionId: this.sessionId,
      });
      this.memory.addAssistant(response.message, response.contextPaths);
      await this.audit("prompt", "CHAT_DETERMINISTIC", { status: response.status });
      return response;
    }

    const query = this.memory.resolveQuery(safeUser);
    const context = await retrieveProjectContext({
      root: this.root,
      query,
      budgetTokens: this.budgetTokens,
      includePaths: [
        ...this.memory.getReferencedPaths().slice(-8),
        ...this.memory.getLastContextPaths().slice(-8),
      ],
      ...(this.graphCache ? { graph: this.graphCache } : {}),
    });
    this.lastContext = context;
    await this.audit("file-read", "CHAT_CONTEXT_RETRIEVED", {
      citations: String(context.citations.length),
      tokens: String(context.estimatedTokens),
    });

    const history = this.memory.historyForModel().slice(0, -1); // exclude current user (added separately)
    const messages = [
      { role: "system" as const, content: this.systemPrompt },
      { role: "system" as const, content: wrapProjectData(context.rendered) },
      ...history.map((m) => ({ role: m.role, content: redactForModel(m.content) })),
      { role: "user" as const, content: safeUser },
    ];

    await this.audit("prompt", "CHAT_MODEL_REQUESTED", {
      provider: this.provider.id,
      messages: String(messages.length),
    });

    const modelResult = await this.provider.chat({
      messages,
      temperature: 0.2,
      maxTokens: 2048,
    });

    if (modelResult.error) {
      const response = buildChatTurnResponse({
        sessionId: this.sessionId,
        modelText: `AgentDoctor could not reach the configured AI provider.\n\nProvider: ${modelResult.provider}\nModel: ${modelResult.model}\nError: ${sanitizeProviderError(modelResult.error)}`,
        context,
        provider: modelResult.provider,
        model: modelResult.model,
        status: "provider-error",
        error: sanitizeProviderError(modelResult.error),
        ...(modelResult.usage ? { usage: modelResult.usage } : {}),
      });
      await this.audit("error", "CHAT_FAILED", {
        reason: "provider-error",
        provider: modelResult.provider,
      });
      return response;
    }

    const text = redactForModel(modelResult.message.content || "");
    const response = buildChatTurnResponse({
      sessionId: this.sessionId,
      modelText: text,
      context,
      provider: modelResult.provider,
      model: modelResult.model,
      status: "ok",
      ...(modelResult.usage ? { usage: modelResult.usage } : {}),
    });

    this.memory.addAssistant(response.message, response.contextPaths);
    await this.audit("prompt", "CHAT_MODEL_RESPONSE", {
      status: response.status,
      citations: String(response.citations.length),
    });
    await this.audit("prompt", "CHAT_COMPLETED", {
      turn: String(this.memory.snapshot().turnCount),
    });
    return response;
  }

  clearMemory(): void {
    this.memory.clear();
    this.lastContext = undefined;
  }

  async end(): Promise<void> {
    if (this.auditSession) {
      await endSession(this.auditSession);
      this.auditSession = undefined;
    }
  }

  formatResponse(response: ChatTurnResponse): string {
    return formatChatResponseForCli(response);
  }

  formatProject(): Promise<string> {
    return summarizeProjectForChat(this.root).then(formatProjectSummary);
  }

  formatContext(): string {
    const paths = this.getLastContextPaths();
    if (!paths.length) {
      return "No context retrieved yet. Ask a project question first.\n";
    }
    const lines = ["Context used for the last answer:", ""];
    for (const p of paths) {
      lines.push(`  ✓ ${p}`);
    }
    if (this.lastContext?.limitations.length) {
      lines.push("");
      lines.push("Limitations:");
      for (const l of this.lastContext.limitations.slice(0, 5)) {
        lines.push(`  - ${l}`);
      }
    }
    lines.push("");
    return `${lines.join("\n")}\n`;
  }

  private providerLabel(): string {
    const cfg = publicAiConfig(loadAiConfig());
    if (this.provider.id === "none") return "none (AI chat disabled)";
    if (this.provider.id === "mock") return "mock (tests/demo)";
    return `${this.provider.id} / ${cfg.model}`;
  }

  private async audit(
    type: "prompt" | "file-read" | "error" | "session-end",
    summary: string,
    detail?: Record<string, string>,
  ): Promise<void> {
    if (!this.persistAudit || !this.auditSession) return;
    await appendSessionEvent(this.auditSession, {
      type,
      summary,
      risk: type === "error" ? "low" : "none",
      ...(detail ? { detail } : {}),
    });
  }
}

function sanitizeProviderError(message: string): string {
  return redactForModel(message)
    .replace(/Bearer\s+\S+/gi, "Bearer [REDACTED]")
    .replace(/sk-[A-Za-z0-9]+/g, "[REDACTED]");
}

export function createChatService(options: ChatServiceOptions): ChatService {
  return new ChatService(options);
}

/** Test helper: unique id without IO */
export function newChatSessionId(): string {
  return randomUUID();
}
