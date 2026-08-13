export { PROJECT_BRAIN_LIMITATIONS } from "./types.js";
export type { ProjectBrain, ProjectBrainMetadata } from "./types.js";
export { buildProjectBrain } from "./build.js";
export type { BuildProjectBrainOptions } from "./build.js";
export {
  PROJECT_BRAIN_SCHEMA_VERSION,
  CLAIM_SCHEMA_VERSION,
  EVIDENCE_SCHEMA_VERSION,
  DELTA_SCHEMA_VERSION,
  SNAPSHOT_META_SCHEMA_VERSION,
  BRAIN_STORAGE_FORMAT_VERSION,
} from "./version.js";
export {
  CONFIDENCE_CONTRACT,
  clampBrainConfidence,
  assertBrainConfidence,
  averageBrainConfidence,
} from "./confidence.js";
export type { ConfidenceMetadata } from "./confidence.js";
export { buildEvidence, redactEvidence, redactEvidenceList } from "./evidence/index.js";
export type {
  BrainEvidence,
  EvidenceKind,
  EvidenceEpistemics,
  EvidenceRedactionStatus,
} from "./evidence/index.js";
export { buildClaim, createClaimId, applyClaimLifecycle, withClaimStatus } from "./claims/index.js";
export type { BrainClaim, ClaimStatus, ClaimSource } from "./claims/index.js";
export { detectContradictions } from "./contradictions/index.js";
export type { BrainContradiction } from "./contradictions/index.js";
export { buildComponents } from "./components/index.js";
export type { BrainComponent, BrainComponentType } from "./components/index.js";
export {
  LocalBrainStore,
  BrainStorageError,
  serializeBrain,
  checksumPayload,
} from "./storage/index.js";
export type { BrainStoreMeta, SnapshotMeta, SnapshotComparison } from "./storage/index.js";
export { buildBrainDelta, serializeBrainDelta, parseBrainDelta } from "./delta.js";
export type { BrainDelta } from "./delta.js";
export { createBrainQueryEngine, BrainQueryEngine } from "./query.js";
export type { BrainQuery, BrainQueryType, BrainQueryResponse } from "./query.js";
export { explainClaim } from "./explain.js";
export type { ClaimExplanation } from "./explain.js";
export { traceBrain } from "./trace.js";
export type { TraceResult, TraceMode, TraceNode, TraceEdge } from "./trace.js";
export { redactBrainForStorage } from "./security.js";
export { checkBrainCompatibility, migrateBrain, currentVersions } from "./migrate.js";
export { PROJECT_BRAIN_CONTRACT, assertBrainContract, BrainContractError } from "./contract.js";
