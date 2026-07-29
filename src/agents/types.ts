import type { AgentId, DiscoveredFile, DiscoveryResult } from "../types/index.js";

export type AgentConfigStatus = "absent" | "detected" | "configured" | "misconfigured";

export type AgentConfigFileKind =
  | "cursor-rule-mdc"
  | "cursor-rule-ignored-md"
  | "cursor-legacy-cursorrules"
  | "agents-md"
  | "agents-override-md"
  | "claude-md"
  | "claude-local-md"
  | "claude-rule-md"
  | "claude-settings"
  | "claude-settings-local"
  | "codex-config"
  | "other";

export type AgentConfigScope = "root" | "nested" | "legacy";

export interface AgentConfigFile {
  relativePath: string;
  kind: AgentConfigFileKind;
  sizeBytes: number;
  empty: boolean;
  readable: boolean;
  legacy: boolean;
  scope: AgentConfigScope;
  /** Present when the file exists but could not be parsed (e.g. invalid JSON). */
  parseError?: string;
}

export interface AgentDiagnostic {
  code: string;
  severity: "info" | "warning" | "error";
  message: string;
  file?: string;
}

export interface AgentDetectionResult {
  id: AgentId;
  displayName: string;
  /** Any repository evidence that this agent is in use or configured. */
  detected: boolean;
  /** At least one non-empty, usable project instruction/config file. */
  configured: boolean;
  status: AgentConfigStatus;
  /** Short human summary, e.g. "2 project rules". */
  summary: string;
  configFiles: AgentConfigFile[];
  /** Convenience list derived from configFiles. */
  configPaths: string[];
  diagnostics: AgentDiagnostic[];
  metadata: Record<string, unknown>;
}

export interface AgentDetectionContext {
  root: string;
  discovery: DiscoveryResult;
  maxFileSizeBytes: number;
}

export interface AgentAdapter {
  id: AgentId;
  displayName: string;
  detect(context: AgentDetectionContext): Promise<AgentDetectionResult>;
}

/** Map discovered files by relative path for O(1) lookups. */
export function indexDiscoveredFiles(files: DiscoveredFile[]): Map<string, DiscoveredFile> {
  return new Map(files.map((file) => [file.relativePath, file]));
}

export function basenameOf(relativePath: string): string {
  const parts = relativePath.split("/");
  return parts[parts.length - 1] ?? relativePath;
}

export function dirnameOf(relativePath: string): string {
  const idx = relativePath.lastIndexOf("/");
  return idx === -1 ? "" : relativePath.slice(0, idx);
}

export function isRootLevel(relativePath: string): boolean {
  return !relativePath.includes("/");
}
