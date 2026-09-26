import type { AgentId } from "./types/index.js";

export const PACKAGE_VERSION = "3.0.0";

export const DEFAULT_MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MiB

/** Directories skipped during normal discovery (unless a rule needs them later). */
export const DEFAULT_IGNORE_DIRECTORIES = new Set([
  ".git",
  "node_modules",
  "vendor",
  "dist",
  "build",
  "out",
  ".next",
  ".nuxt",
  ".svelte-kit",
  "coverage",
  ".dart_tool",
  "target",
  ".turbo",
  ".nx",
  ".cache",
  ".venv",
  "venv",
  "__pycache__",
  ".pytest_cache",
  ".mypy_cache",
  ".gradle",
  ".idea",
  ".vscode",
  "Pods",
  "DerivedData",
  ".parcel-cache",
  ".yarn",
  ".pnpm-store",
]);

export const AGENT_DISPLAY_NAMES: Record<AgentId, string> = {
  cursor: "Cursor",
  "claude-code": "Claude Code",
  codex: "Codex",
  copilot: "GitHub Copilot",
  windsurf: "Windsurf",
  "gemini-cli": "Gemini CLI",
  aider: "Aider",
};
