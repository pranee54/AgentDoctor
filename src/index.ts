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
  CliOptions,
  ExitCode,
} from "./types/index.js";
export { EXIT_CODES } from "./types/index.js";
export { agentRegistry } from "./agents/registry.js";
export { detectAgents } from "./agents/detect-agents.js";
export { ruleRegistry, getRuleById } from "./core/rules/registry.js";
export { runRules } from "./core/rules/run-rules.js";
