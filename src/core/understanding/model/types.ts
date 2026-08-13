import type { ArchitectureInferenceResult, ArchitecturePattern } from "../architecture/types.js";
import type { DependencyDiscoveryResult, DependencyRelationType } from "../dependencies/types.js";
import type { EntrypointDiscoveryResult, EntrypointFramework } from "../entrypoints/types.js";
import type {
  RelationshipDiscoveryResult,
  RelationshipKind,
  RelationshipStrength,
} from "../relationships/types.js";
import type { DomainDiscoveryResult } from "../types/index.js";
import type { ProjectModelSchemaVersion, UnderstandingCompilerVersion } from "./version.js";

export type CompilerPassId =
  | "domain-discovery"
  | "entrypoint-discovery"
  | "dependency-discovery"
  | "relationship-discovery"
  | "architecture-inference"
  | "project-model";

/**
 * Every modeled object carries provenance required by the compiler contract.
 */
export interface ModelProvenance {
  id: string;
  evidence: readonly string[];
  confidence: number;
  sourcePass: CompilerPassId;
  timestamp: string;
}

export interface ProjectIdentity extends ModelProvenance {
  name: string;
}

export interface ProjectDomain extends ModelProvenance {
  name: string;
  paths: readonly string[];
}

export interface ProjectEntrypoint extends ModelProvenance {
  framework: EntrypointFramework;
  file: string;
}

export interface ProjectDependency extends ModelProvenance {
  from: string;
  to: string;
  type: DependencyRelationType;
}

export interface ProjectRelationship extends ModelProvenance {
  source: string;
  target: string;
  relationship: RelationshipKind;
  strength: RelationshipStrength;
  bidirectional: boolean;
}

export interface ProjectArchitecture extends ModelProvenance {
  pattern: ArchitecturePattern;
  matchedRules: readonly string[];
  conflictingEvidence: readonly string[];
  unknowns: readonly string[];
}

export interface ProjectStatistics {
  domainCount: number;
  entrypointCount: number;
  dependencyCount: number;
  relationshipCount: number;
  architectureCount: number;
  evidenceCount: number;
  averageConfidence: number;
  passTimingMs: {
    domains: number;
    entrypoints: number;
    dependencies: number;
    relationships: number;
    architectures: number;
  };
}

export interface ProjectSummary {
  topDomains: readonly string[];
  topArchitectures: readonly string[];
  frameworks: readonly string[];
  statistics: ProjectStatistics;
}

export interface ProjectMetadata extends ModelProvenance {
  schemaVersion: ProjectModelSchemaVersion;
  project: ProjectIdentity;
}

export interface CompilerMetadata {
  compilerVersion: UnderstandingCompilerVersion;
  schemaVersion: ProjectModelSchemaVersion;
  generatedAt: string;
  passes: readonly CompilerPassId[];
}

/**
 * Canonical immutable output of the Software Understanding Compiler.
 */
export interface ProjectModel {
  metadata: ProjectMetadata;
  domains: readonly ProjectDomain[];
  entrypoints: readonly ProjectEntrypoint[];
  dependencies: readonly ProjectDependency[];
  relationships: readonly ProjectRelationship[];
  architectures: readonly ProjectArchitecture[];
  summary: ProjectSummary;
  compilerMetadata: CompilerMetadata;
}

export interface ProjectModelBuilderInput {
  domains: DomainDiscoveryResult;
  entrypoints: EntrypointDiscoveryResult;
  dependencies: DependencyDiscoveryResult;
  relationships: RelationshipDiscoveryResult;
  architectures: ArchitectureInferenceResult;
  /** Optional display name; defaults to "project". */
  projectName?: string;
  /** Fixed ISO timestamp for deterministic builds (tests). */
  generatedAt?: string;
}

export interface ProjectModelValidationIssue {
  path: string;
  message: string;
}

export interface ProjectModelValidationResult {
  ok: boolean;
  issues: readonly ProjectModelValidationIssue[];
}
