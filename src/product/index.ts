export type { TruthLabel, ProductEvidence } from "./truth.js";
export { minProductTruth, truthLabelDescription } from "./truth.js";

export { traceRequirements } from "./requirements/trace.js";
export type { RequirementTrace, RequirementsTraceReport } from "./requirements/trace.js";

export { analyzeApiSurface } from "./api/doctor.js";
export type { ApiDoctorReport, ApiEndpointFinding } from "./api/doctor.js";

export { analyzeDatabaseSchema } from "./database/doctor.js";
export type {
  DatabaseDoctorReport,
  SchemaObjectFinding,
  SchemaDriftFinding,
  SchemaRelationFinding,
} from "./database/doctor.js";

export { analyzeEvents } from "./events/doctor.js";
export type { EventsDoctorReport, EventFlowNode, EventFlowEdge } from "./events/doctor.js";

export { analyzeDependencies } from "./deps/analyze.js";
export type {
  DependencyAnalysisReport,
  DirectDependency,
  DuplicatePackageName,
  UpgradeImpactHint,
} from "./deps/analyze.js";

export { analyzeCodeHealth } from "./health/code-health.js";
export type { CodeHealthReport, CodeHealthIndicator } from "./health/code-health.js";

export { buildSoftwareMap } from "./map/software-map.js";
export type { SoftwareMap, SoftwareMapNode, SoftwareMapNodeKind } from "./map/software-map.js";

export {
  appendChangeLedgerEntry,
  readChangeLedger,
  listChangeLedgerEntries,
} from "./ledger/change-ledger.js";
export type { ChangeLedgerEntry, ChangeLedgerListResult } from "./ledger/change-ledger.js";

export { analyzeWhatIf } from "./whatif/engine.js";
export type { WhatIfReport, WhatIfAffectedItem } from "./whatif/engine.js";

export {
  loadDecisionLedger,
  appendDecisionLedgerEntry,
  parseAdrDecisions,
  resolveDecisionPath,
} from "./decisions/ledger.js";
export type { DecisionRecord, DecisionLedgerResult } from "./decisions/ledger.js";

export {
  runForensicAnalysis,
  assertForensicReadOnly,
  ForensicWriteRefusedError,
} from "./forensic/mode.js";
export type { ForensicAnalysisReport } from "./forensic/mode.js";

export { buildSoftwareDigitalTwinSnapshot } from "./twin/digital-twin.js";
export type { SoftwareDigitalTwin } from "./twin/digital-twin.js";
export {
  buildSoftwareDigitalTwin,
  updateTwin,
  loadTwinSnapshot,
  saveTwinSnapshot,
  invalidateTwinSnapshot,
} from "./twin/store.js";
export type { StoredTwinSnapshot, TwinSnapshotMeta } from "./twin/store.js";

export {
  parsePackageLockJson,
  parseYarnLock,
  parsePnpmLockYaml,
  parseAllLockfiles,
} from "./deps/lockfiles.js";
export type { LockfilePackageVersion, ParsedLockfile } from "./deps/lockfiles.js";

export { discoverOpenApiEndpoints } from "./api/openapi.js";

export { buildIndex, searchIndex, searchHybrid, documentId } from "./search/index.js";
export type { TfidfIndex, IndexDocument } from "./search/index.js";

export { runEvalLab } from "./eval/lab.js";
export type { EvalLabReport, EvalCheckResult } from "./eval/lab.js";

export { diagnoseAgentDoctorSelf } from "./self/diagnose.js";
export type { SelfDiagnoseReport, SelfDiagnoseFinding } from "./self/diagnose.js";

export { analyzeInfra } from "./ops/infra.js";
export type { InfraReport, InfraArtifact } from "./ops/infra.js";

export { buildIncidentHypotheses } from "./ops/incident.js";
export type { IncidentReport, IncidentTimelineItem } from "./ops/incident.js";

export { discoverProjectRoots, resolveStartedProjectRoot } from "./discovery/roots.js";
export type {
  ProjectDiscoveryReport,
  ProjectCandidate,
  DiscoverProjectOptions,
} from "./discovery/roots.js";

export { buildProjectDna, persistProjectDna } from "./dna/build.js";
export type { ProjectDna } from "./dna/build.js";

export { enrichGraphWithLanguageAdapters } from "./graph/enrich-languages.js";
export type { LanguageGraphEnrichmentStats } from "./graph/enrich-languages.js";

export { analyzeSecuritySurface } from "./security/doctor.js";
export type { SecurityDoctorReport, SecurityPatternFinding } from "./security/doctor.js";

export {
  analyzeTestBrain,
  persistTestBrainReport,
  mapTestsFromGraph,
} from "./testbrain/analyze.js";
export type {
  TestBrainReport,
  FileTestMapping,
  TestBrainGraphStats,
  FileTestMappingEvidence,
} from "./testbrain/analyze.js";

export { analyzePrivacySurface } from "./privacy/doctor.js";
export type { PrivacyDoctorReport, PrivacyFinding } from "./privacy/doctor.js";

export { searchSymbolsAndConcepts } from "./search/software-search.js";
export type { SoftwareSearchReport, SoftwareSearchHit } from "./search/software-search.js";

export { buildTechnicalDebtRoadmap } from "./techdebt/roadmap.js";
export type { TechnicalDebtRoadmap, TechnicalDebtItem } from "./techdebt/roadmap.js";

export {
  loadOrganizationModel,
  saveOrganizationModel,
  linkProjectToOrgModel,
  resolveLinkedProjectRoot,
} from "./org/model.js";
export type { OrganizationModel, OrgEntityRef, OrgProjectLink } from "./org/model.js";

export { analyzeFeatureIntelligence } from "./features/intelligence.js";
export type {
  FeatureIntelligenceReport,
  FeatureFlow,
  FeatureFlowLink,
} from "./features/intelligence.js";

export { buildSoftwareEvolutionTimeline } from "./evolution/timeline.js";
export type {
  SoftwareEvolutionReport,
  EvolutionTimelineEvent,
  EvolutionTrend,
} from "./evolution/timeline.js";

export { queryMemory } from "./memory/institutional.js";
export type { InstitutionalMemoryQueryResult, MemoryHit } from "./memory/institutional.js";

export { evaluateApprovalRecord, formatApprovalRecordSummary } from "./approval/model.js";
export type {
  ApprovalRecord,
  ApprovalState,
  ApprovalRisk,
  ApprovalEvaluationInput,
  ApprovalEvaluationResult,
} from "./approval/model.js";

export {
  issueApprovalGrant,
  consumeApprovalGrant,
  hashPlanPayload,
  hashFileWritePlan,
} from "./approval/session.js";
export type { ApprovalGrant, ConsumeApprovalResult } from "./approval/session.js";
