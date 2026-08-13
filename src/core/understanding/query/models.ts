import type {
  ProjectArchitecture,
  ProjectDependency,
  ProjectDomain,
  ProjectEntrypoint,
  ProjectModel,
  ProjectRelationship,
  ProjectStatistics,
  ProjectSummary,
} from "../model/types.js";

export interface RepositorySummaryResult {
  projectName: string;
  schemaVersion: string;
  compilerVersion: string;
  generatedAt: string;
  topDomains: readonly string[];
  topArchitectures: readonly string[];
  frameworks: readonly string[];
  statistics: ProjectStatistics;
}

export interface ListDomainsResult {
  domains: readonly ProjectDomain[];
  count: number;
}

export interface ListEntrypointsResult {
  entrypoints: readonly ProjectEntrypoint[];
  count: number;
}

export interface ListArchitecturesResult {
  architectures: readonly ProjectArchitecture[];
  count: number;
}

export interface ListRelationshipsResult {
  relationships: readonly ProjectRelationship[];
  count: number;
}

export interface ListDependenciesResult {
  dependencies: readonly ProjectDependency[];
  count: number;
}

export interface FindDomainResult {
  domain: ProjectDomain;
  entrypoints: readonly ProjectEntrypoint[];
  relationships: readonly ProjectRelationship[];
  dependencies: readonly ProjectDependency[];
  architectures: readonly ProjectArchitecture[];
}

export interface FindEntrypointResult {
  entrypoint: ProjectEntrypoint;
}

export interface FindArchitectureResult {
  architecture: ProjectArchitecture;
}

export interface FindComponentResult {
  name: string;
  asRelationshipSource: readonly ProjectRelationship[];
  asRelationshipTarget: readonly ProjectRelationship[];
  asDependencyEndpoint: readonly ProjectDependency[];
  matchingEntrypoints: readonly ProjectEntrypoint[];
  matchingDomains: readonly ProjectDomain[];
}

export interface FindRelationshipResult {
  relationship: ProjectRelationship;
}

export interface FindDependencyResult {
  dependency: ProjectDependency;
}

export interface EvidenceHit {
  collection:
    "domains" | "entrypoints" | "dependencies" | "relationships" | "architectures" | "metadata";
  id: string;
  label: string;
  evidence: readonly string[];
}

export interface FindEvidenceResult {
  needle: string;
  hits: readonly EvidenceHit[];
  count: number;
}

export interface StatisticsResult {
  summary: ProjectSummary;
  model: {
    projectName: string;
    schemaVersion: string;
    compilerVersion: string;
    generatedAt: string;
  };
}

export type QueryResultMap = {
  RepositorySummary: RepositorySummaryResult;
  ListDomains: ListDomainsResult;
  ListEntrypoints: ListEntrypointsResult;
  ListArchitectures: ListArchitecturesResult;
  ListRelationships: ListRelationshipsResult;
  ListDependencies: ListDependenciesResult;
  FindDomain: FindDomainResult;
  FindEntrypoint: FindEntrypointResult;
  FindArchitecture: FindArchitectureResult;
  FindComponent: FindComponentResult;
  FindRelationship: FindRelationshipResult;
  FindDependency: FindDependencyResult;
  FindEvidence: FindEvidenceResult;
  Statistics: StatisticsResult;
};

export interface QueryHandlerContext {
  model: ProjectModel;
}

export interface QueryHandlerOutput<T> {
  result: T;
  evidence: string[];
  confidence: number;
}
