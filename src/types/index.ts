import type { AgentDetectionResult } from "../agents/types.js";

/**
 * AgentDoctor core types.
 * Designed so scanning stays independent of terminal reporting.
 */

export type Severity = "critical" | "warning" | "info";

export type RuleCategory =
  "security" | "context" | "instructions" | "mcp" | "performance" | "compatibility";

export type LanguageId =
  | "typescript"
  | "javascript"
  | "python"
  | "dart"
  | "php"
  | "go"
  | "rust"
  | "java"
  | "kotlin"
  | "unknown";

export type FrameworkId =
  | "nextjs"
  | "react"
  | "vue"
  | "nuxt"
  | "svelte"
  | "nodejs"
  | "express"
  | "nestjs"
  | "flutter"
  | "laravel"
  | "django"
  | "fastapi"
  | "unknown";

export type PackageManagerId =
  | "npm"
  | "pnpm"
  | "yarn"
  | "bun"
  | "composer"
  | "pub"
  | "pip"
  | "poetry"
  | "cargo"
  | "gradle"
  | "unknown";

export type MonorepoToolId =
  "npm-workspaces" | "pnpm-workspaces" | "turborepo" | "nx" | "multi-project" | "none";

export type AgentId = "cursor" | "claude-code" | "codex";

export interface DiscoveredFile {
  /** Absolute path */
  absolutePath: string;
  /** Path relative to repository root, POSIX-style */
  relativePath: string;
  sizeBytes: number;
  isSymlink: boolean;
}

export interface DiscoveryResult {
  files: DiscoveredFile[];
  directoriesSkipped: string[];
  filesSkippedOversized: number;
  permissionErrors: string[];
  elapsedMs: number;
}

export interface RepositoryInfo {
  root: string;
  languages: LanguageId[];
  primaryLanguage: LanguageId;
  frameworks: FrameworkId[];
  primaryFramework: FrameworkId;
  packageManagers: PackageManagerId[];
  primaryPackageManager: PackageManagerId;
  monorepo: MonorepoToolId;
  filesScanned: number;
}

export type {
  AgentConfigStatus,
  AgentConfigFile,
  AgentConfigFileKind,
  AgentConfigScope,
  AgentDiagnostic,
  AgentDetectionResult,
} from "../agents/types.js";

/** @deprecated Prefer AgentDetectionResult — kept for compatibility. */
export type AgentPresence = AgentDetectionResult;

export interface FindingEvidence {
  path?: string;
  line?: number;
  detail?: string;
}

export type Fixability = "safe" | "review" | "manual" | "none";

export interface Finding {
  id: string;
  ruleId: string;
  category: RuleCategory;
  severity: Severity;
  title: string;
  message: string;
  whyItMatters: string;
  recommendation?: string;
  affectedAgents: AgentId[];
  evidence?: FindingEvidence;
  fixability: Fixability;
}

export interface FindingsSummary {
  critical: number;
  warning: number;
  info: number;
  total: number;
}

export interface CategoryScores {
  security: number;
  context: number;
  instructions: number;
  mcp: number;
  compatibility: number;
  performance: number;
}

export interface AgentScores {
  cursor: number;
  "claude-code": number;
  codex: number;
}

export interface Scores {
  overall: number;
  categories: CategoryScores;
  agents: AgentScores;
}

export interface TimingInfo {
  discoveryMs: number;
  detectionMs: number;
  agentsMs: number;
  rulesMs: number;
  scoringMs: number;
  totalMs: number;
}

export interface ScanDiagnostics {
  warnings: string[];
  errors: string[];
}

/**
 * Whether agent-specific security exposure checks had enough agent configuration
 * to run meaningfully. Additive field — absent consumers may ignore it.
 */
export type AgentSecurityAnalysisMode = "full" | "limited";

export interface ScanResult {
  version: string;
  repository: RepositoryInfo;
  agents: AgentDetectionResult[];
  findings: Finding[];
  summary: FindingsSummary;
  /**
   * Readiness scores when scoring is available.
   * Null while scoring is unavailable — do not treat as readiness.
   */
  scores: Scores | null;
  /** False until the readiness scoring model ships. */
  scoringAvailable: boolean;
  /**
   * `limited` when no supported coding agent is detected/configured.
   * Repository-risk checks may still run; agent exposure claims are not asserted.
   */
  agentSecurityAnalysis: AgentSecurityAnalysisMode;
  timing: TimingInfo;
  diagnostics: ScanDiagnostics;
}

export interface ScanOptions {
  cwd?: string;
  /** Max file size to read/stat deeply; oversized files are counted but skipped for content */
  maxFileSizeBytes?: number;
  verbose?: boolean;
  /** Optional filter for which rule IDs to run */
  includeRules?: string[];
  excludeRules?: string[];
}

export interface CliOptions {
  path?: string;
  json?: boolean;
  ci?: boolean;
  verbose?: boolean;
  minScore?: number;
  dryRun?: boolean;
  yes?: boolean;
}

export const EXIT_CODES = {
  SUCCESS: 0,
  ISSUES_OR_THRESHOLD: 1,
  USAGE_ERROR: 2,
  INTERNAL_ERROR: 3,
} as const;

export type ExitCode = (typeof EXIT_CODES)[keyof typeof EXIT_CODES];
