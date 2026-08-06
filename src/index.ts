export { scan } from "./core/scanner/scan.js";
export { PACKAGE_VERSION } from "./constants.js";
export type {
  ScanOptions,
  ScanResult,
  RepositoryInfo,
  Finding,
  FindingsSummary,
  Scores,
  AgentPresence,
  AgentDetectionResult,
  AgentSecurityAnalysisMode,
  CliOptions,
  ExitCode,
} from "./types/index.js";
export { EXIT_CODES } from "./types/index.js";
export { agentRegistry } from "./agents/registry.js";
export { detectAgents } from "./agents/detect-agents.js";
export { ruleRegistry, getRuleById } from "./core/rules/registry.js";
export { runRules } from "./core/rules/run-rules.js";
export { buildFixPlan } from "./core/fix/plan.js";
export { applyFixPlan } from "./core/fix/apply.js";
export { runFix } from "./core/fix/run.js";
export type { FixPlan, FixAction, FixApplyResult } from "./core/fix/types.js";
