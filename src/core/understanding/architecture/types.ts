import type { DependencyDiscoveryResult } from "../dependencies/types.js";
import type { EntrypointDiscoveryResult } from "../entrypoints/types.js";
import type { RelationshipDiscoveryResult, RelationshipKind } from "../relationships/types.js";
import type { DomainDiscoveryResult } from "../types/index.js";

export type ArchitecturePattern =
  | "MVC"
  | "MVVM"
  | "Clean Architecture"
  | "Layered Architecture"
  | "Hexagonal"
  | "Onion"
  | "DDD"
  | "Repository Pattern"
  | "Service Layer"
  | "Feature-first"
  | "BLoC"
  | "Riverpod"
  | "Redux"
  | "Microservice"
  | "Modular Monolith"
  | "Plugin Architecture"
  | "Monorepo Workspace";

export interface ArchitectureInferenceInput {
  domains: DomainDiscoveryResult;
  entrypoints: EntrypointDiscoveryResult;
  dependencies: DependencyDiscoveryResult;
  relationships: RelationshipDiscoveryResult;
}

export interface ArchitectureMatch {
  pattern: ArchitecturePattern;
  confidence: number;
  evidence: string[];
  matchedRules: string[];
  conflictingEvidence: string[];
  unknowns: string[];
}

export interface ArchitectureInferenceResult {
  architectures: ArchitectureMatch[];
  timingMs: number;
  patternsEvaluated: number;
}

export interface ArchitectureInferenceOptions {
  /** Minimum confidence to include a pattern (0–1). Default 0.55. Never reaches 1.0. */
  minConfidence?: number;
}

export interface PatternRuleContext {
  input: ArchitectureInferenceInput;
}

export interface PatternRuleResult {
  matchedRules: string[];
  evidence: string[];
  conflictingEvidence: string[];
  unknowns: string[];
  /** Relative weight of support before conflict penalties. */
  supportScore: number;
  /** Relative weight of conflicts. */
  conflictScore: number;
}

export type PatternEvaluator = (ctx: PatternRuleContext) => PatternRuleResult;

export interface ArchitecturePatternDefinition {
  pattern: ArchitecturePattern;
  evaluate: PatternEvaluator;
}

export type RelationPredicate = {
  relationship?: RelationshipKind | RelationshipKind[];
  sourceIncludes?: string | string[];
  targetIncludes?: string | string[];
  evidenceIncludes?: string | string[];
};
