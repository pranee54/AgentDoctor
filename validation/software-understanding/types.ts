export type PassId =
  | "domain-discovery"
  | "entrypoint-discovery"
  | "dependency-discovery"
  | "relationship-discovery"
  | "architecture-inference"
  | "project-model"
  | "query-engine"
  | "understand";

export interface SetMetrics {
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  precision: number;
  recall: number;
  f1: number;
}

export interface ConfidenceDistribution {
  count: number;
  min: number;
  max: number;
  mean: number;
  p50: number;
}

export interface PassScore {
  passId: PassId;
  score: number;
  metrics: SetMetrics;
  executionTimeMs: number;
  memoryBytes: number;
  confidence: ConfidenceDistribution;
  expected: unknown;
  actual: unknown;
  details: string[];
}

export interface RepositoryScore {
  repositoryId: string;
  framework: string;
  score: number;
  passScores: PassScore[];
  executionTimeMs: number;
  memoryBytes: number;
}

export interface CompilerScore {
  suiteVersion: string;
  compilerSchemaVersion: string;
  compilerVersion: string;
  score: number;
  repositoryScores: RepositoryScore[];
  passAggregates: Record<
    PassId,
    { score: number; precision: number; recall: number; executionTimeMs: number }
  >;
  executionTimeMs: number;
  memoryBytes: number;
}

export interface ValidationReport {
  suiteVersion: string;
  generatedAt: string;
  compilerScore: CompilerScore;
  failedRepositories: string[];
  ok: boolean;
}

export interface ExpectedEntrypoint {
  framework: string;
  fileSuffix: string;
}

export interface ExpectedDependency {
  from: string;
  to: string;
  type?: string;
}

export interface ExpectedRelationship {
  source: string;
  target: string;
  relationship: string;
}

export interface RepositoryExpectation {
  id: string;
  framework: string;
  version: string;
  domains: {
    required: string[];
    forbidden: string[];
  };
  entrypoints: {
    required: ExpectedEntrypoint[];
    forbiddenFrameworks: string[];
  };
  dependencies: {
    required: ExpectedDependency[];
    minCount: number;
  };
  relationships: {
    required: ExpectedRelationship[];
    minCount: number;
  };
  architectures: {
    requiredPatterns: string[];
    forbiddenPatterns: string[];
  };
  projectModel: {
    minDomains: number;
    minEntrypoints: number;
    minDependencies: number;
    minRelationships: number;
    minArchitectures: number;
  };
  query: {
    mustFindDomain?: string;
    minListDomains: number;
    minListEntrypoints: number;
  };
  understand: {
    mustContain: string[];
  };
}

export interface BenchmarkCase {
  id: string;
  framework: string;
  repoRoot: string;
  expectedPath: string;
}
