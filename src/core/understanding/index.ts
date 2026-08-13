/**
 * Internal Software Understanding Engine.
 * Not wired into scan/CLI. Import from this module only.
 */
export { discoverDomains, scoreDomainConfidence } from "./domain/index.js";
export {
  discoverEntrypoints,
  scoreEntrypointConfidence,
  ENTRYPOINT_MODELS,
} from "./entrypoints/index.js";
export {
  discoverDependencies,
  scoreDependencyConfidence,
  extractReferences,
  RELATION_CONFIDENCE,
} from "./dependencies/index.js";
export {
  discoverRelationships,
  scoreRelationshipConfidence,
  classifyComponent,
  classifyRoleFromPath,
  extractSemanticSignals,
  ROLE_PAIR_RULES,
} from "./relationships/index.js";
export {
  inferArchitectures,
  ARCHITECTURE_RULES,
  listArchitecturePatterns,
  scorePatternConfidence,
} from "./architecture/index.js";
export {
  ProjectModelBuilder,
  buildProjectModel,
  serializeProjectModel,
  parseProjectModel,
  validateProjectModel,
  PROJECT_MODEL_SCHEMA,
  PROJECT_MODEL_SCHEMA_VERSION,
  UNDERSTANDING_COMPILER_VERSION,
} from "./model/index.js";
export {
  QueryEngine,
  createQueryEngine,
  Queries,
  executeQuery,
  validateQuery,
  listSupportedQueryTypes,
  QueryError,
  QueryValidationError,
  QueryNotFoundError,
  QueryUnsupportedError,
} from "./query/index.js";
export {
  UnderstandService,
  createUnderstandService,
  understandAsText,
  UNDERSTAND_LIMITATIONS,
} from "./understand/index.js";
export {
  discoverOwnership,
  ownersForPath,
  matchCodeownersPattern,
  scoreOwnershipConfidence,
} from "./ownership/index.js";
export { discoverRisks } from "./risks/index.js";
export {
  computeContentHash,
  createSnapshotIdentity,
  hashSerializedModel,
} from "./snapshot/index.js";
export { compareProjectModels } from "./delta/index.js";
export {
  buildProjectMind,
  buildProjectMindSync,
  extractClaims,
  findMindClaim,
  findMindOwner,
  findMindRisks,
  listMindOwnership,
  listMindRisks,
  mindSummary,
  PROJECT_MIND_LIMITATIONS,
} from "./mind/index.js";
export type {
  DomainDiscoveryOptions,
  DomainDiscoveryResult,
  DomainMatch,
  UnderstandingConfidence,
  UnderstandingEvidence,
} from "./types/index.js";
export type {
  EntrypointDiscoveryOptions,
  EntrypointDiscoveryResult,
  EntrypointFramework,
  EntrypointMatch,
} from "./entrypoints/types.js";
export type {
  DependencyDiscoveryOptions,
  DependencyDiscoveryResult,
  DependencyMatch,
  DependencyRelationType,
  ExtractedReference,
} from "./dependencies/types.js";
export type {
  RelationshipDiscoveryOptions,
  RelationshipDiscoveryResult,
  RelationshipKind,
  RelationshipMatch,
  RelationshipStrength,
  ComponentRole,
} from "./relationships/types.js";
export type {
  ArchitectureInferenceInput,
  ArchitectureInferenceOptions,
  ArchitectureInferenceResult,
  ArchitectureMatch,
  ArchitecturePattern,
} from "./architecture/types.js";
export type {
  ProjectModel,
  ProjectModelBuilderInput,
  ProjectModelValidationResult,
  CompilerPassId,
} from "./model/types.js";
export type {
  Query,
  QueryType,
  QueryResponse,
  QueryMetadata,
  FindDomainResult,
  RepositorySummaryResult,
} from "./query/index.js";
export type {
  UnderstandResult,
  UnderstandSection,
  UnderstandSnapshot,
  UnderstandServiceOptions,
} from "./understand/types.js";
export type {
  OwnershipDiscoveryOptions,
  OwnershipDiscoveryResult,
  OwnershipMatch,
  OwnershipSource,
} from "./ownership/index.js";
export type {
  RiskDiscoveryOptions,
  RiskDiscoveryResult,
  RiskKind,
  RiskMatch,
  RiskSeverity,
} from "./risks/index.js";
export type { SnapshotIdentity } from "./snapshot/index.js";
export type { SetDelta, UnderstandingDelta } from "./delta/index.js";
export type {
  BuildProjectMindOptions,
  ClaimKind,
  ProjectClaim,
  ProjectMind,
} from "./mind/index.js";
export {
  buildProjectBrain,
  createBrainQueryEngine,
  BrainQueryEngine,
  explainClaim,
  traceBrain,
  buildBrainDelta,
  serializeBrainDelta,
  parseBrainDelta,
  LocalBrainStore,
  BrainStorageError,
  serializeBrain,
  CONFIDENCE_CONTRACT,
  PROJECT_BRAIN_SCHEMA_VERSION,
  BRAIN_STORAGE_FORMAT_VERSION,
  PROJECT_BRAIN_LIMITATIONS,
  PROJECT_BRAIN_CONTRACT,
  assertBrainContract,
  redactBrainForStorage,
  applyClaimLifecycle,
  detectContradictions,
} from "./brain/index.js";
export type {
  ProjectBrain,
  BrainClaim,
  BrainEvidence,
  BrainDelta,
  BrainQuery,
  BrainQueryResponse,
  ClaimExplanation,
  TraceResult,
  TraceMode,
  SnapshotMeta,
  BrainComponent,
  ClaimStatus,
  BuildProjectBrainOptions,
} from "./brain/index.js";
