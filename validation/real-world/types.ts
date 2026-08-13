export type PassId =
  | "domain-discovery"
  | "entrypoint-discovery"
  | "dependency-discovery"
  | "relationship-discovery"
  | "architecture-inference"
  | "project-model"
  | "query-engine"
  | "understand";

export type SizeClass = "small" | "medium" | "large";

export type RepoCategory =
  | "application"
  | "library"
  | "framework"
  | "cli"
  | "monorepo"
  | "microservices"
  | "infrastructure";

export interface SetMetrics {
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  precision: number;
  recall: number;
  f1: number;
  coverage: number;
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

export interface RepositoryCatalogEntry {
  id: string;
  url: string;
  commitSha: string;
  framework: string;
  language: string;
  sizeClass: SizeClass;
  category: RepoCategory;
  knownPatterns: string[];
  notes: string;
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

/**
 * Human ground truth for a repository.
 * Must describe the software as it is — never rewritten to match compiler output.
 * `expectationVersion` must bump when expectations intentionally change.
 */
export interface GroundTruth {
  id: string;
  expectationVersion: string;
  /** SHA-256 of canonical expectation body; runner refuses silent edits. */
  expectationLock: string;
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
    /** Soft characteristic: import / package edges expected at this scale. */
    characteristic: "sparse" | "moderate" | "dense";
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

export interface RepositoryScore {
  repositoryId: string;
  framework: string;
  language: string;
  category: RepoCategory;
  score: number;
  passScores: PassScore[];
  executionTimeMs: number;
  memoryBytes: number;
  commitSha: string;
  error?: string;
}

export interface RegressionFinding {
  repositoryId: string;
  passId: PassId;
  expected: unknown;
  actual: unknown;
  evidence: string[];
  suggestedInvestigation: string;
}

export interface RegressionReport {
  suiteVersion: string;
  generatedAt: string;
  findings: RegressionFinding[];
}

export interface CompilerScore {
  suiteVersion: string;
  compilerSchemaVersion: string;
  compilerVersion: string;
  score: number;
  repositoryScores: RepositoryScore[];
  passAggregates: Record<
    PassId,
    {
      score: number;
      precision: number;
      recall: number;
      coverage: number;
      executionTimeMs: number;
      failureCount: number;
    }
  >;
  frameworkAggregates: Record<
    string,
    { score: number; repositoryCount: number; failureCount: number }
  >;
  executionTimeMs: number;
  memoryBytes: number;
}

export interface ValidationReport {
  suiteVersion: string;
  generatedAt: string;
  compilerScore: CompilerScore;
  failedRepositories: string[];
  regressionCount: number;
  ok: boolean;
}

export interface HistoryEntry {
  suiteVersion: string;
  generatedAt: string;
  compilerScore: number;
  passAggregates: CompilerScore["passAggregates"];
  failedRepositories: string[];
  repositoryScores: Array<{ id: string; score: number; executionTimeMs: number }>;
}

export interface ScientificFindings {
  suiteVersion: string;
  generatedAt: string;
  compilerScore: number;
  wherePerformsWell: string[];
  whereConsistentlyFails: string[];
  weakestPass: { passId: PassId; score: number; rationale: string };
  frameworksNeedingSupport: Array<{ framework: string; score: number; rationale: string }>;
  compilerV02Improvements: string[];
}
