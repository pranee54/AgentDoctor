import type { TruthLabel, ContextCitation } from "../context/types.js";
import type { AiProviderId, ModelProvider, TokenUsage } from "../../ai/types.js";
import type { AskProgressReporter } from "../progress.js";

export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
  at: string;
}

export interface TruthClaim {
  text: string;
  label: TruthLabel;
  citationPaths: string[];
}

export interface ChatTurnResponse {
  sessionId: string;
  message: string;
  truthClaims: TruthClaim[];
  citations: ContextCitation[];
  provider: AiProviderId;
  model: string;
  status: "ok" | "provider-none" | "provider-error" | "failed";
  error?: string;
  usage?: TokenUsage;
  contextPaths: string[];
  contextTruncated: boolean;
  limitations: string[];
}

export interface ChatMemorySnapshot {
  sessionId: string;
  root: string;
  topic?: string;
  messages: ChatMessage[];
  referencedPaths: string[];
  lastContextPaths: string[];
  turnCount: number;
}

export interface ChatServiceOptions {
  root: string;
  /** Inject provider for tests; otherwise load from env */
  provider?: ModelProvider;
  budgetTokens?: number;
  maxMemoryTurns?: number;
  maxMemoryChars?: number;
  /** Persist audit via platform sessions (default true) */
  persistAudit?: boolean;
  /** Appended to PROJECT_CHAT_SYSTEM_PROMPT (modes) */
  systemPromptAddon?: string;
  /** Optional ask progress reporter (CLI TTY UX). */
  progress?: AskProgressReporter;
}
