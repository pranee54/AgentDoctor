/** Semver of the Project Model JSON schema shape. */
export const PROJECT_MODEL_SCHEMA_VERSION = "1.0.0" as const;

/**
 * Internal understanding compiler version that produced the model.
 * Independent of the published AgentDoctor package version.
 */
export const UNDERSTANDING_COMPILER_VERSION = "0.1.0" as const;

export type ProjectModelSchemaVersion = typeof PROJECT_MODEL_SCHEMA_VERSION;
export type UnderstandingCompilerVersion = typeof UNDERSTANDING_COMPILER_VERSION;
