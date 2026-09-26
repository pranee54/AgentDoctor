export { CONTRACTS_VERSION, DEFAULT_FEATURE_FLAGS } from "./contracts/index.js";
export { buildIntelligenceGraph } from "./intelligence/graph/build.js";
export { analyzeGitIntelligence } from "./intelligence/git/analyze.js";
export { buildC4Views } from "./architecture/c4.js";
export {
  loadArchitectureContract,
  checkArchitecture,
  checkArchitectureAtRoot,
  initArchitecture,
  explainArchitecture,
  DEFAULT_ARCHITECTURE_CONTRACT,
} from "./architecture/contract.js";
export type {
  ArchitectureContract,
  ArchitectureViolation,
  ArchitectureCheckResult,
} from "./architecture/contract.js";
export { loadCoverage, parseLcov, parseIstanbul, parseCobertura } from "./coverage/load.js";
export type { NormalizedCoverage, CoverageFormat, CoverageFile } from "./coverage/types.js";
export { parseSourceFile, languageAdapters, detectLanguage } from "./languages/index.js";
export type { LanguageAdapter, ParseResult, LanguageId } from "./languages/index.js";
export {
  createKnowledgeRecord,
  listKnowledge,
  transitionKnowledge,
  retrieveAuthoritative,
} from "./knowledge/store.js";
export {
  FilesystemStorageProvider,
  MemoryStorageProvider,
  tryCreateSqliteStorage,
  tryCreatePostgresStorage,
} from "./storage/provider.js";
export { SqliteStorageProvider } from "./storage/sqlite.js";
export { PostgresStorageProvider } from "./storage/postgres.js";
export { LocalIdentityProvider, OidcIdentityProvider, hasRbacPermission } from "./auth/index.js";
export type { IdentityClaims, IdentityProvider, RbacRole, RbacPermission } from "./auth/index.js";
export {
  initWorkspace,
  listWorkspaces,
  loadWorkspace,
  addRepositoryToWorkspace,
  removeWorkspace,
  workspaceStatus,
  assertWorkspacePathAccess,
  readFileWithinWorkspace,
} from "./workspace/index.js";
export type { WorkspaceModel } from "./workspace/index.js";
export { composePolicy, explainComposedDecision } from "./policy/compose.js";
export {
  runControlledCommand,
  parseArgv,
  assertArgsInsideRoot,
  explainControlledRun,
} from "./enforcement/runner.js";
export { registerLocalDevUser, authenticateLocalDev, authorize } from "./team/auth.js";
export { runProjectInit, listProposals, reviewProposal } from "./core/brain-product/init.js";
export { collectOpsHealth } from "./ops/health.js";
export { listPolicyPacks, getPolicyPack } from "./policy/packs.js";
export {
  listIntelligenceMcpTools,
  INTELLIGENCE_MCP_TOOL_NAMES,
} from "./mcp/intelligence/registry.js";
export { scan } from "./core/scanner/scan.js";
export { verify } from "./core/verify/verify.js";
export { compareFindings } from "./core/verify/compare.js";
export { PACKAGE_VERSION } from "./constants.js";
export {
  analyzeChange,
  verifyChange,
  inspectEvidence,
  verifyEvidence,
  explainChange,
  diffChange,
  changeStatus,
  deriveGraphChangeImpact,
  derivePackageImpact,
  EVIDENCE_SCHEMA_VERSION,
} from "./assurance/change.js";
export type { ChangeAssessment, EvidenceManifest, VerificationStatus } from "./assurance/change.js";
export {
  buildProofFromEvidence,
  inspectProof,
  verifyProof,
  exportProof,
  explainProof,
} from "./assurance/proof.js";
export type {
  ChangeProof,
  IntegrityStatus,
  CorrectnessStatus,
  EngineeringChecksStatus,
  ProofVerificationState,
} from "./assurance/proof.js";
export {
  assertInsideRepo,
  resolveSafeRepoPath,
  safeRelPath,
  PathEscapeError,
} from "./security/paths.js";
export {
  resolveImportSpecifier,
  resolveImportEdges,
  loadTsconfigPaths,
} from "./intelligence/resolve/imports.js";
export type {
  ImportConfidence,
  ImportResolutionResult,
  TsconfigPathsConfig,
} from "./intelligence/resolve/imports.js";
export {
  graphBuild,
  graphUpdate,
  graphRebuild,
  graphStatus,
} from "./intelligence/graph/incremental.js";
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
export type { VerifyResult, VerifyOptions } from "./core/verify/verify.js";
export type { VerifyFindingRef, FindingCompareResult } from "./core/verify/compare.js";
export { EXIT_CODES } from "./types/index.js";
export { agentRegistry } from "./agents/registry.js";
export { detectAgents } from "./agents/detect-agents.js";
export { ruleRegistry, getRuleById } from "./core/rules/registry.js";
export { runRules } from "./core/rules/run-rules.js";
export { buildFixPlan } from "./core/fix/plan.js";
export { applyFixPlan } from "./core/fix/apply.js";
export type { ApplyFixPlanOptions } from "./core/fix/apply.js";
export { runFix } from "./core/fix/run.js";
export {
  evaluatePolicy,
  evaluateScanPolicy,
  evaluateVerifyPolicy,
  parseFailOnRules,
  parseSeverityGate,
} from "./core/policy/evaluate.js";
export type {
  PolicyOptions,
  PolicyViolation,
  PolicyViolationCode,
  PolicyInput,
} from "./core/policy/evaluate.js";
export type { FixPlan, FixAction, FixApplyResult } from "./core/fix/types.js";

/** AgentDoctor 2.1 AI provider layer (optional — core works without AI). */
export {
  createModelProvider,
  loadAiConfig,
  publicAiConfig,
  redactForModel,
  AI_PROVIDER_REQUIRED_MESSAGE,
  NoneModelProvider,
  MockModelProvider,
  OpenAiCompatibleProvider,
} from "./ai/index.js";
export type {
  AiConfig,
  AiProviderId,
  ChatMessage,
  ChatRequest,
  ChatResponse,
  ModelMetadata,
  ModelProvider,
  ToolSpec,
  ToolCallRequest,
  TokenUsage,
} from "./ai/index.js";

/** AgentDoctor 2.1 Project AI Agent core (M1 scaffolding). */
export {
  AgentState,
  AgentStateMachine,
  AgentRuntime,
  DEFAULT_AGENT_LIMITS,
  retrieveProjectContext,
  truthLabelHelp,
  minTruth,
} from "./agent/index.js";
export type {
  AgentLimits,
  AgentAuditEvent,
  AgentRuntimeOptions,
  AgentTurnResult,
  AgentStateTransition,
  ContextBundle,
  ContextCitation,
  EvidenceType,
  TruthLabel,
  RetrieveContextOptions,
} from "./agent/index.js";

export {
  ChatService,
  createChatService,
  ChatMemory,
  CHAT_PROVIDER_NONE_MESSAGE,
  buildChatTurnResponse,
  formatChatResponseForCli,
  summarizeProjectForChat,
} from "./agent/chat/index.js";
export type {
  ChatTurnResponse,
  ChatServiceOptions,
  TruthClaim,
  ProjectChatSummary,
} from "./agent/chat/index.js";

/** AgentDoctor 2.1 agent tools + plan (M3). */
export {
  listAgentToolSpecs,
  getToolSpec,
  riskForTool,
  executeAgentTool,
  isReadTool,
  newToolCall,
  evaluateApproval,
  formatApprovalPrompt,
  buildAgentPlan,
  formatAgentPlan,
  approvePlan,
  runCodingLoop,
  verifyAgentWork,
  formatVerificationReport,
} from "./agent/index.js";
export type {
  AgentToolName,
  AgentToolSpec,
  AgentToolCall,
  AgentToolResult,
  AgentRiskLevel,
  ApprovalRequest,
  ApprovalResult,
  ApprovalDecision,
  AgentPlan,
  AgentPlanStep,
  CodingLoopOptions,
  CodingLoopResult,
  AgentVerificationReport,
  VerificationCheck,
} from "./agent/index.js";

export {
  getModeProfile,
  defaultStudentMode,
  parseAgentMode,
  modeAllowsMutation,
  modeBlocksToolCategory,
  StudentService,
} from "./agent/index.js";

export {
  traceRequirements,
  analyzeApiSurface,
  analyzeDatabaseSchema,
  analyzeEvents,
  analyzeDependencies,
  analyzeCodeHealth,
  buildSoftwareMap,
  appendChangeLedgerEntry,
  readChangeLedger,
  analyzeWhatIf,
  loadDecisionLedger,
  runForensicAnalysis,
  assertForensicReadOnly,
  buildSoftwareDigitalTwin,
  runEvalLab,
  diagnoseAgentDoctorSelf,
  analyzeInfra,
  buildIncidentHypotheses,
  enrichGraphWithLanguageAdapters,
  analyzeSecuritySurface,
  analyzePrivacySurface,
  searchSymbolsAndConcepts,
  buildTechnicalDebtRoadmap,
  loadOrganizationModel,
  saveOrganizationModel,
  linkProjectToOrgModel,
  analyzeFeatureIntelligence,
  buildSoftwareEvolutionTimeline,
  queryMemory,
  evaluateApprovalRecord,
  formatApprovalRecordSummary,
  issueApprovalGrant,
  consumeApprovalGrant,
  hashPlanPayload,
  hashFileWritePlan,
  minProductTruth,
  truthLabelDescription,
} from "./product/index.js";
export type {
  TruthLabel as ProductTruthLabel,
  ProductEvidence,
  RequirementsTraceReport,
  ApiDoctorReport,
  DatabaseDoctorReport,
  EventsDoctorReport,
  DependencyAnalysisReport,
  CodeHealthReport,
  SoftwareMap,
  ChangeLedgerEntry,
  WhatIfReport,
  DecisionRecord,
  ForensicAnalysisReport,
  SoftwareDigitalTwin,
  EvalLabReport,
  SelfDiagnoseReport,
  InfraReport,
  IncidentReport,
  LanguageGraphEnrichmentStats,
  SecurityDoctorReport,
  PrivacyDoctorReport,
  SoftwareSearchReport,
  TechnicalDebtRoadmap,
  OrganizationModel,
  FeatureIntelligenceReport,
  SoftwareEvolutionReport,
  InstitutionalMemoryQueryResult,
  ApprovalRecord,
} from "./product/index.js";
export { rolePrompt, roleAllowedTools, runRoleAgent } from "./agent/roles.js";
export type { AgentRole, RoleAgentOptions } from "./agent/roles.js";
export type {
  AgentMode,
  ModeProfile,
  StudentDocSection,
  BuildWithMeResult,
} from "./agent/index.js";
