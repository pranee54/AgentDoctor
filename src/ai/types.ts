/**
 * Provider-agnostic model types for AgentDoctor 2.1 Project AI Agent.
 * The model reasons; AgentDoctor owns context, tools, and verification.
 */

export type AiProviderId =
  "none" | "deterministic" | "mock" | "openai-compatible" | "ollama" | "anthropic" | "gemini";

export type ChatRole = "system" | "user" | "assistant" | "tool";

export interface ChatMessage {
  role: ChatRole;
  content: string;
  /** Tool call id when role is tool */
  toolCallId?: string;
  name?: string;
}

export interface ToolSpec {
  name: string;
  description: string;
  /** JSON Schema object for arguments */
  parameters: Record<string, unknown>;
}

export interface ToolCallRequest {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface TokenUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface ChatRequest {
  messages: ChatMessage[];
  tools?: ToolSpec[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  /** AbortSignal for cancellation when supported */
  signal?: AbortSignal;
}

export interface ChatResponse {
  provider: AiProviderId;
  model: string;
  message: ChatMessage;
  toolCalls: ToolCallRequest[];
  usage?: TokenUsage;
  finishReason?: string;
  /** Always true for model-generated content */
  aiGenerated: true;
  error?: string;
}

export interface ModelMetadata {
  provider: AiProviderId;
  model: string;
  supportsTools: boolean;
  supportsStreaming: boolean;
  supportsStructuredOutput: boolean;
}

export interface ModelProvider {
  readonly id: AiProviderId;
  metadata(): ModelMetadata;
  chat(request: ChatRequest): Promise<ChatResponse>;
  /**
   * Optional streaming. Providers that do not support streaming reject.
   */
  streamChat?(
    request: ChatRequest,
  ): AsyncIterable<{ delta: string; done: boolean; response?: ChatResponse }>;
}

/** User-facing copy when AI is not configured. */
export const AI_PROVIDER_REQUIRED_MESSAGE =
  "AI features require an AI provider. AgentDoctor's project analysis features continue to work without AI.";
