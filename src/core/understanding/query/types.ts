export type QueryType =
  | "RepositorySummary"
  | "ListDomains"
  | "ListEntrypoints"
  | "ListArchitectures"
  | "ListRelationships"
  | "ListDependencies"
  | "FindDomain"
  | "FindEntrypoint"
  | "FindArchitecture"
  | "FindComponent"
  | "FindRelationship"
  | "FindDependency"
  | "FindEvidence"
  | "Statistics";

export type Query =
  | { type: "RepositorySummary" }
  | { type: "ListDomains" }
  | { type: "ListEntrypoints" }
  | { type: "ListArchitectures" }
  | { type: "ListRelationships" }
  | { type: "ListDependencies" }
  | { type: "FindDomain"; name: string }
  | { type: "FindEntrypoint"; file?: string; framework?: string; id?: string }
  | { type: "FindArchitecture"; pattern: string }
  | { type: "FindComponent"; name: string }
  | {
      type: "FindRelationship";
      source?: string;
      target?: string;
      relationship?: string;
      id?: string;
    }
  | {
      type: "FindDependency";
      from?: string;
      to?: string;
      dependencyType?: string;
      id?: string;
    }
  | { type: "FindEvidence"; needle: string }
  | { type: "Statistics" };

export interface QueryMetadata {
  queryType: QueryType;
  projectName: string;
  modelId: string;
  schemaVersion: string;
  compilerVersion: string;
  modelGeneratedAt: string;
}

/**
 * Canonical envelope returned by every query execution.
 */
export interface QueryResponse<T> {
  result: T;
  evidence: readonly string[];
  confidence: number;
  metadata: QueryMetadata;
  executionTimeMs: number;
}
