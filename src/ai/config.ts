import type { AiProviderId } from "./types.js";

/**
 * AI provider configuration.
 * Secrets come only from environment variables — never from Brain or committed files.
 */

export interface AiConfig {
  provider: AiProviderId;
  model: string;
  baseUrl?: string;
  /** Present only in memory from env — never serialized to Brain/evidence */
  apiKey?: string;
  configured: boolean;
}

const DEFAULT_MODELS: Record<AiProviderId, string> = {
  none: "none",
  deterministic: "local-analyzers",
  mock: "mock",
  "openai-compatible": "gpt-4o-mini",
  ollama: "llama3.2",
  anthropic: "claude-sonnet-4-5",
  gemini: "gemini-2.0-flash",
};

function normalizeProvider(raw: string | undefined): AiProviderId {
  const v = (raw ?? "none").trim().toLowerCase();
  switch (v) {
    case "none":
    case "":
      return "none";
    case "mock":
      return "mock";
    case "openai":
    case "openai-compatible":
    case "openrouter":
      return "openai-compatible";
    case "ollama":
      return "ollama";
    case "anthropic":
      return "anthropic";
    case "gemini":
    case "google":
      return "gemini";
    default:
      return "none";
  }
}

/**
 * Load AI config from environment.
 * Does not read API keys from disk. Does not write secrets anywhere.
 */
export function loadAiConfig(env: NodeJS.ProcessEnv = process.env): AiConfig {
  const provider = normalizeProvider(env.AGENTDOCTOR_AI_PROVIDER);
  const model = (env.AGENTDOCTOR_AI_MODEL ?? DEFAULT_MODELS[provider]).trim();
  const baseUrl = env.AGENTDOCTOR_AI_BASE_URL?.trim() || undefined;
  const apiKey = env.AGENTDOCTOR_AI_API_KEY?.trim() || undefined;

  const configured =
    provider !== "none" &&
    (provider === "mock" ||
      provider === "ollama" ||
      Boolean(apiKey) ||
      (provider === "openai-compatible" && Boolean(baseUrl)));

  const result: AiConfig = {
    provider,
    model,
    configured: provider === "mock" ? true : configured,
  };
  if (baseUrl) result.baseUrl = baseUrl;
  if (apiKey) result.apiKey = apiKey;
  return result;
}

/** Safe view for logs / CLI — never includes apiKey. */
export function publicAiConfig(
  config: AiConfig,
): Omit<AiConfig, "apiKey"> & { apiKeySet: boolean } {
  const pub: Omit<AiConfig, "apiKey"> & { apiKeySet: boolean } = {
    provider: config.provider,
    model: config.model,
    configured: config.configured,
    apiKeySet: Boolean(config.apiKey),
  };
  if (config.baseUrl) pub.baseUrl = config.baseUrl;
  return pub;
}
