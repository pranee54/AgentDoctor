/** Project Brain schema / storage format versions (independent of AgentDoctor package). */
export const PROJECT_BRAIN_SCHEMA_VERSION = "1.0.0" as const;
export const CLAIM_SCHEMA_VERSION = "1.0.0" as const;
export const EVIDENCE_SCHEMA_VERSION = "1.0.0" as const;
export const DELTA_SCHEMA_VERSION = "1.0.0" as const;
export const SNAPSHOT_META_SCHEMA_VERSION = "1.0.0" as const;
export const BRAIN_STORAGE_FORMAT_VERSION = "1.0.0" as const;

export type ProjectBrainSchemaVersion = typeof PROJECT_BRAIN_SCHEMA_VERSION;
export type ClaimSchemaVersion = typeof CLAIM_SCHEMA_VERSION;
export type EvidenceSchemaVersion = typeof EVIDENCE_SCHEMA_VERSION;
export type DeltaSchemaVersion = typeof DELTA_SCHEMA_VERSION;
export type SnapshotMetaSchemaVersion = typeof SNAPSHOT_META_SCHEMA_VERSION;
export type BrainStorageFormatVersion = typeof BRAIN_STORAGE_FORMAT_VERSION;
