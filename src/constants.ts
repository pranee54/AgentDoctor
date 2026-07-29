export const PACKAGE_VERSION = "0.1.3-beta";

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

export const AGENT_DISPLAY_NAMES: Record<"cursor" | "claude-code" | "codex", string> = {
  cursor: "Cursor",
  "claude-code": "Claude Code",
  codex: "Codex",
};
