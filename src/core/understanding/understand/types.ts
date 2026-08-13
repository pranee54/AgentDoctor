import type { QueryEngine } from "../query/engine.js";
import type {
  ListArchitecturesResult,
  ListDependenciesResult,
  ListDomainsResult,
  ListEntrypointsResult,
  ListRelationshipsResult,
  RepositorySummaryResult,
  StatisticsResult,
} from "../query/models.js";

export interface UnderstandSection {
  title: string;
  lines: readonly string[];
}

export interface UnderstandSnapshot {
  repository: RepositorySummaryResult;
  domains: ListDomainsResult;
  entrypoints: ListEntrypointsResult;
  architectures: ListArchitecturesResult;
  dependencies: ListDependenciesResult;
  relationships: ListRelationshipsResult;
  statistics: StatisticsResult;
  unknowns: readonly string[];
  limitations: readonly string[];
  queryCount: number;
}

export interface UnderstandResult {
  text: string;
  sections: readonly UnderstandSection[];
  confidence: number;
  executionTimeMs: number;
  queryCount: number;
  snapshot: UnderstandSnapshot;
}

export interface UnderstandServiceOptions {
  /** Max items per list section. Default 8. */
  maxItems?: number;
}

export type UnderstandEngine = Pick<QueryEngine, "execute">;
