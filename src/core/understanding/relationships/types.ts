import type { DependencyDiscoveryResult } from "../dependencies/types.js";
import type { EntrypointDiscoveryResult } from "../entrypoints/types.js";
import type { DomainDiscoveryResult } from "../types/index.js";

export type RelationshipKind =
  | "USES"
  | "OWNS"
  | "IMPLEMENTS"
  | "DEPENDS_ON"
  | "CALLS"
  | "CONFIGURES"
  | "EXPOSES"
  | "ENTERS"
  | "CONTAINS"
  | "PROVIDES"
  | "CONSUMES";

export type RelationshipStrength = "strong" | "medium" | "weak";

export type ComponentRole =
  | "Controller"
  | "Service"
  | "Repository"
  | "Database"
  | "Route"
  | "Widget"
  | "Bloc"
  | "API"
  | "Module"
  | "Configuration"
  | "EntryPoint"
  | "Feature"
  | "Domain"
  | "Package"
  | "Component";

export interface RelationshipMatch {
  source: string;
  target: string;
  relationship: RelationshipKind;
  confidence: number;
  evidence: string[];
  strength: RelationshipStrength;
  bidirectional?: boolean;
}

export interface RelationshipDiscoveryResult {
  relationships: RelationshipMatch[];
  timingMs: number;
  filesConsidered: number;
  filesInspected: number;
}

export interface RelationshipDiscoveryOptions {
  cwd?: string;
  minConfidence?: number;
  maxReadBytes?: number;
  /** Injected dependency graph; when omitted, runs discoverDependencies. */
  dependencies?: DependencyDiscoveryResult;
  /** Injected entrypoints; when omitted, runs discoverEntrypoints. */
  entrypoints?: EntrypointDiscoveryResult;
  /** Injected domains; when omitted, runs discoverDomains. */
  domains?: DomainDiscoveryResult;
}

export interface ClassifiedComponent {
  name: string;
  role: ComponentRole;
  file: string;
}

export interface SemanticSignal {
  kind: "constructor-injection" | "implements" | "extends" | "bloc-provider" | "entity" | "call";
  label: string;
  relatedName?: string;
}
