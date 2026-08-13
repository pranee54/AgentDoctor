import type { CompilerPassId } from "./types.js";
import { PROJECT_MODEL_SCHEMA_VERSION, UNDERSTANDING_COMPILER_VERSION } from "./version.js";

export const PROJECT_MODEL_REQUIRED_ROOT_KEYS = [
  "metadata",
  "domains",
  "entrypoints",
  "dependencies",
  "relationships",
  "architectures",
  "summary",
  "compilerMetadata",
] as const;

export const MODEL_PROVENANCE_KEYS = [
  "id",
  "evidence",
  "confidence",
  "sourcePass",
  "timestamp",
] as const;

export const COMPILER_PASSES: readonly CompilerPassId[] = [
  "domain-discovery",
  "entrypoint-discovery",
  "dependency-discovery",
  "relationship-discovery",
  "architecture-inference",
  "project-model",
] as const;

export const PROJECT_MODEL_SCHEMA = {
  schemaVersion: PROJECT_MODEL_SCHEMA_VERSION,
  compilerVersion: UNDERSTANDING_COMPILER_VERSION,
  requiredRootKeys: PROJECT_MODEL_REQUIRED_ROOT_KEYS,
  provenanceKeys: MODEL_PROVENANCE_KEYS,
  passes: COMPILER_PASSES,
} as const;

export type ProjectModelSchema = typeof PROJECT_MODEL_SCHEMA;
