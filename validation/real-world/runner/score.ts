import { Queries, createQueryEngine } from "../../../src/core/understanding/query/index.js";
import { validateProjectModel } from "../../../src/core/understanding/model/index.js";
import {
  average,
  confidenceDistribution,
  measureMemoryBytes,
  scoreFromMetrics,
  scoreRequiredForbidden,
} from "../metrics/scoring.js";
import type {
  GroundTruth,
  PassId,
  PassScore,
  RepositoryCatalogEntry,
  RepositoryScore,
  SetMetrics,
} from "../types.js";
import type { CompiledRepository } from "./compile-repo.js";

function ciEquals(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

function withMinCount(
  metrics: SetMetrics,
  actualCount: number,
  minCount: number,
  details: string[],
): SetMetrics {
  if (actualCount >= minCount) {
    return metrics;
  }
  details.push(`count ${actualCount} < minCount ${minCount}`);
  const addedFn = minCount - actualCount;
  const falseNegatives = metrics.falseNegatives + addedFn;
  const recallDenom = metrics.truePositives + falseNegatives;
  const recall = recallDenom === 0 ? 0 : metrics.truePositives / recallDenom;
  const f1 =
    metrics.precision + recall === 0
      ? 0
      : (2 * metrics.precision * recall) / (metrics.precision + recall);
  const coverage =
    minCount === 0 ? metrics.coverage : Math.min(metrics.coverage, actualCount / minCount);
  return {
    ...metrics,
    falseNegatives,
    recall: Number(recall.toFixed(4)),
    f1: Number(f1.toFixed(4)),
    coverage: Number(coverage.toFixed(4)),
  };
}

function passScore(
  passId: PassId,
  metrics: SetMetrics,
  options: {
    executionTimeMs: number;
    memoryBytes: number;
    confidences: readonly number[];
    expected: unknown;
    actual: unknown;
    details?: string[];
  },
): PassScore {
  return {
    passId,
    score: scoreFromMetrics(metrics),
    metrics,
    executionTimeMs: options.executionTimeMs,
    memoryBytes: options.memoryBytes,
    confidence: confidenceDistribution(options.confidences),
    expected: options.expected,
    actual: options.actual,
    details: options.details ?? [],
  };
}

export function scoreRepository(
  compiled: CompiledRepository,
  truth: GroundTruth,
  catalog: RepositoryCatalogEntry,
): RepositoryScore {
  const memoryBytes = measureMemoryBytes();
  const passScores: PassScore[] = [];

  {
    const actualNames = compiled.domains.domains.map((d) => d.name);
    const metrics = scoreRequiredForbidden(
      truth.domains.required,
      truth.domains.forbidden,
      actualNames,
      ciEquals,
    );
    passScores.push(
      passScore("domain-discovery", metrics, {
        executionTimeMs: compiled.timingMs.domains,
        memoryBytes,
        confidences: compiled.domains.domains.map((d) => d.confidence),
        expected: truth.domains,
        actual: actualNames,
      }),
    );
  }

  {
    const details: string[] = [];
    let truePositives = 0;
    let falseNegatives = 0;
    for (const req of truth.entrypoints.required) {
      const hit = compiled.entrypoints.entrypoints.some(
        (entry) =>
          ciEquals(entry.framework, req.framework) &&
          entry.file.replace(/\\/g, "/").endsWith(req.fileSuffix.replace(/\\/g, "/")),
      );
      if (hit) {
        truePositives += 1;
      } else {
        falseNegatives += 1;
        details.push(`missing entrypoint ${req.framework}:${req.fileSuffix}`);
      }
    }
    let falsePositives = 0;
    for (const framework of truth.entrypoints.forbiddenFrameworks) {
      if (compiled.entrypoints.entrypoints.some((entry) => ciEquals(entry.framework, framework))) {
        falsePositives += 1;
        details.push(`forbidden framework present: ${framework}`);
      }
    }
    const precisionDenom = truePositives + falsePositives;
    const recallDenom = truePositives + falseNegatives;
    const precision = precisionDenom === 0 ? 1 : truePositives / precisionDenom;
    const recall = recallDenom === 0 ? 1 : truePositives / recallDenom;
    const metrics: SetMetrics = {
      truePositives,
      falsePositives,
      falseNegatives,
      precision: Number(precision.toFixed(4)),
      recall: Number(recall.toFixed(4)),
      f1:
        precision + recall === 0
          ? 0
          : Number(((2 * precision * recall) / (precision + recall)).toFixed(4)),
      coverage:
        truth.entrypoints.required.length === 0
          ? 1
          : Number((truePositives / truth.entrypoints.required.length).toFixed(4)),
    };
    passScores.push(
      passScore("entrypoint-discovery", metrics, {
        executionTimeMs: compiled.timingMs.entrypoints,
        memoryBytes,
        confidences: compiled.entrypoints.entrypoints.map((e) => e.confidence),
        expected: truth.entrypoints,
        actual: compiled.entrypoints.entrypoints.map((e) => `${e.framework}:${e.file}`),
        details,
      }),
    );
  }

  {
    const details: string[] = [];
    const actualKeys = compiled.dependencies.dependencies.map(
      (d) => `${d.from}|${d.to}|${d.type}`,
    );
    let truePositives = 0;
    let falseNegatives = 0;
    for (const req of truth.dependencies.required) {
      const hit = compiled.dependencies.dependencies.some((dep) => {
        const endpoints = ciEquals(dep.from, req.from) && ciEquals(dep.to, req.to);
        if (!endpoints) {
          return false;
        }
        if (!req.type) {
          return true;
        }
        return ciEquals(dep.type, req.type);
      });
      if (hit) {
        truePositives += 1;
      } else {
        falseNegatives += 1;
        details.push(`missing dependency ${req.from}->${req.to}`);
      }
    }
    let metrics: SetMetrics = {
      truePositives,
      falsePositives: 0,
      falseNegatives,
      precision: truePositives === 0 && falseNegatives === 0 ? 1 : truePositives > 0 ? 1 : 0,
      recall:
        truePositives + falseNegatives === 0
          ? 1
          : truePositives / (truePositives + falseNegatives),
      f1: 0,
      coverage:
        truth.dependencies.required.length === 0
          ? 1
          : truePositives / Math.max(truth.dependencies.required.length, 1),
    };
    metrics.precision = Number(metrics.precision.toFixed(4));
    metrics.recall = Number(metrics.recall.toFixed(4));
    metrics.f1 =
      metrics.precision + metrics.recall === 0
        ? 0
        : Number(
            ((2 * metrics.precision * metrics.recall) / (metrics.precision + metrics.recall)).toFixed(
              4,
            ),
          );
    metrics.coverage = Number(metrics.coverage.toFixed(4));
    metrics = withMinCount(
      metrics,
      compiled.dependencies.dependencies.length,
      truth.dependencies.minCount,
      details,
    );
    passScores.push(
      passScore("dependency-discovery", metrics, {
        executionTimeMs: compiled.timingMs.dependencies,
        memoryBytes,
        confidences: compiled.dependencies.dependencies.map((d) => d.confidence),
        expected: truth.dependencies,
        actual: {
          count: compiled.dependencies.dependencies.length,
          sample: actualKeys.slice(0, 40),
        },
        details,
      }),
    );
  }

  {
    const details: string[] = [];
    let truePositives = 0;
    let falseNegatives = 0;
    for (const req of truth.relationships.required) {
      const hit = compiled.relationships.relationships.some(
        (rel) =>
          ciEquals(rel.source, req.source) &&
          ciEquals(rel.target, req.target) &&
          ciEquals(rel.relationship, req.relationship),
      );
      if (hit) {
        truePositives += 1;
      } else {
        falseNegatives += 1;
        details.push(`missing relationship ${req.source}-${req.relationship}->${req.target}`);
      }
    }
    let metrics: SetMetrics = {
      truePositives,
      falsePositives: 0,
      falseNegatives,
      precision: truePositives === 0 && falseNegatives === 0 ? 1 : truePositives > 0 ? 1 : 0,
      recall:
        truePositives + falseNegatives === 0
          ? 1
          : truePositives / (truePositives + falseNegatives),
      f1: 0,
      coverage:
        truth.relationships.required.length === 0
          ? 1
          : truePositives / Math.max(truth.relationships.required.length, 1),
    };
    metrics.precision = Number(metrics.precision.toFixed(4));
    metrics.recall = Number(metrics.recall.toFixed(4));
    metrics.f1 =
      metrics.precision + metrics.recall === 0
        ? 0
        : Number(
            ((2 * metrics.precision * metrics.recall) / (metrics.precision + metrics.recall)).toFixed(
              4,
            ),
          );
    metrics.coverage = Number(metrics.coverage.toFixed(4));
    metrics = withMinCount(
      metrics,
      compiled.relationships.relationships.length,
      truth.relationships.minCount,
      details,
    );
    passScores.push(
      passScore("relationship-discovery", metrics, {
        executionTimeMs: compiled.timingMs.relationships,
        memoryBytes,
        confidences: compiled.relationships.relationships.map((r) => r.confidence),
        expected: truth.relationships,
        actual: {
          count: compiled.relationships.relationships.length,
          sample: compiled.relationships.relationships
            .slice(0, 40)
            .map((r) => `${r.source}|${r.relationship}|${r.target}`),
        },
        details,
      }),
    );
  }

  {
    const actualPatterns = compiled.architectures.architectures.map((a) => a.pattern);
    const metrics = scoreRequiredForbidden(
      truth.architectures.requiredPatterns,
      truth.architectures.forbiddenPatterns,
      actualPatterns,
      ciEquals,
    );
    passScores.push(
      passScore("architecture-inference", metrics, {
        executionTimeMs: compiled.timingMs.architectures,
        memoryBytes,
        confidences: compiled.architectures.architectures.map((a) => a.confidence),
        expected: truth.architectures,
        actual: actualPatterns,
      }),
    );
  }

  {
    const details: string[] = [];
    const validation = validateProjectModel(compiled.model);
    let truePositives = 0;
    let falseNegatives = 0;
    let falsePositives = 0;
    const checks: Array<[string, boolean]> = [
      ["valid", validation.ok],
      ["minDomains", compiled.model.domains.length >= truth.projectModel.minDomains],
      ["minEntrypoints", compiled.model.entrypoints.length >= truth.projectModel.minEntrypoints],
      [
        "minDependencies",
        compiled.model.dependencies.length >= truth.projectModel.minDependencies,
      ],
      [
        "minRelationships",
        compiled.model.relationships.length >= truth.projectModel.minRelationships,
      ],
      [
        "minArchitectures",
        compiled.model.architectures.length >= truth.projectModel.minArchitectures,
      ],
    ];
    for (const [name, ok] of checks) {
      if (ok) {
        truePositives += 1;
      } else {
        falseNegatives += 1;
        details.push(`failed check: ${name}`);
      }
    }
    if (!validation.ok) {
      falsePositives += 1;
      details.push(...validation.issues.map((i) => `${i.path}: ${i.message}`));
    }
    const precisionDenom = truePositives + falsePositives;
    const recallDenom = truePositives + falseNegatives;
    const metrics: SetMetrics = {
      truePositives,
      falsePositives,
      falseNegatives,
      precision: precisionDenom === 0 ? 1 : Number((truePositives / precisionDenom).toFixed(4)),
      recall: recallDenom === 0 ? 1 : Number((truePositives / recallDenom).toFixed(4)),
      f1: 0,
      coverage: Number((truePositives / checks.length).toFixed(4)),
    };
    metrics.f1 =
      metrics.precision + metrics.recall === 0
        ? 0
        : Number(
            ((2 * metrics.precision * metrics.recall) / (metrics.precision + metrics.recall)).toFixed(
              4,
            ),
          );
    passScores.push(
      passScore("project-model", metrics, {
        executionTimeMs: compiled.timingMs.projectModel,
        memoryBytes,
        confidences: [compiled.model.metadata.confidence],
        expected: truth.projectModel,
        actual: {
          domainCount: compiled.model.domains.length,
          entrypointCount: compiled.model.entrypoints.length,
          dependencyCount: compiled.model.dependencies.length,
          relationshipCount: compiled.model.relationships.length,
          architectureCount: compiled.model.architectures.length,
          valid: validation.ok,
        },
        details,
      }),
    );
  }

  {
    const details: string[] = [];
    const engine = createQueryEngine(compiled.model);
    let truePositives = 0;
    let falseNegatives = 0;
    const domains = engine.execute(Queries.listDomains());
    const entrypoints = engine.execute(Queries.listEntrypoints());
    if (domains.result.count >= truth.query.minListDomains) {
      truePositives += 1;
    } else {
      falseNegatives += 1;
      details.push("listDomains below minimum");
    }
    if (entrypoints.result.count >= truth.query.minListEntrypoints) {
      truePositives += 1;
    } else {
      falseNegatives += 1;
      details.push("listEntrypoints below minimum");
    }
    if (truth.query.mustFindDomain) {
      try {
        const found = engine.execute(Queries.findDomain(truth.query.mustFindDomain));
        if (found.result.domain.name) {
          truePositives += 1;
        } else {
          falseNegatives += 1;
        }
      } catch {
        falseNegatives += 1;
        details.push(`FindDomain failed for ${truth.query.mustFindDomain}`);
      }
    }
    const checks = 2 + (truth.query.mustFindDomain ? 1 : 0);
    const recallDenom = truePositives + falseNegatives;
    const metrics: SetMetrics = {
      truePositives,
      falsePositives: 0,
      falseNegatives,
      precision: 1,
      recall: recallDenom === 0 ? 1 : Number((truePositives / recallDenom).toFixed(4)),
      f1: 0,
      coverage: Number((truePositives / checks).toFixed(4)),
    };
    metrics.f1 =
      metrics.precision + metrics.recall === 0
        ? 0
        : Number(
            ((2 * metrics.precision * metrics.recall) / (metrics.precision + metrics.recall)).toFixed(
              4,
            ),
          );
    passScores.push(
      passScore("query-engine", metrics, {
        executionTimeMs: compiled.timingMs.query,
        memoryBytes,
        confidences: [domains.confidence, entrypoints.confidence],
        expected: truth.query,
        actual: {
          domainCount: domains.result.count,
          entrypointCount: entrypoints.result.count,
        },
        details,
      }),
    );
  }

  {
    const details: string[] = [];
    let truePositives = 0;
    let falseNegatives = 0;
    for (const needle of truth.understand.mustContain) {
      if (compiled.understand.text.includes(needle)) {
        truePositives += 1;
      } else {
        falseNegatives += 1;
        details.push(`missing text: ${needle}`);
      }
    }
    const recallDenom = truePositives + falseNegatives;
    const metrics: SetMetrics = {
      truePositives,
      falsePositives: 0,
      falseNegatives,
      precision: 1,
      recall: recallDenom === 0 ? 1 : Number((truePositives / recallDenom).toFixed(4)),
      f1: 0,
      coverage:
        truth.understand.mustContain.length === 0
          ? 1
          : Number((truePositives / truth.understand.mustContain.length).toFixed(4)),
    };
    metrics.f1 =
      metrics.precision + metrics.recall === 0
        ? 0
        : Number(
            ((2 * metrics.precision * metrics.recall) / (metrics.precision + metrics.recall)).toFixed(
              4,
            ),
          );
    passScores.push(
      passScore("understand", metrics, {
        executionTimeMs: compiled.timingMs.understand,
        memoryBytes,
        confidences: [compiled.understand.confidence],
        expected: truth.understand,
        actual: {
          sectionTitles: compiled.understand.sections.map((s) => s.title),
          textLength: compiled.understand.text.length,
        },
        details,
      }),
    );
  }

  return {
    repositoryId: catalog.id,
    framework: catalog.framework,
    language: catalog.language,
    category: catalog.category,
    score: average(passScores.map((p) => p.score)),
    passScores,
    executionTimeMs: compiled.timingMs.total,
    memoryBytes,
    commitSha: catalog.commitSha,
  };
}

export function failedRepositoryScore(
  catalog: RepositoryCatalogEntry,
  error: string,
): RepositoryScore {
  const emptyMetrics: SetMetrics = {
    truePositives: 0,
    falsePositives: 0,
    falseNegatives: 1,
    precision: 0,
    recall: 0,
    f1: 0,
    coverage: 0,
  };
  const passIds: PassId[] = [
    "domain-discovery",
    "entrypoint-discovery",
    "dependency-discovery",
    "relationship-discovery",
    "architecture-inference",
    "project-model",
    "query-engine",
    "understand",
  ];
  return {
    repositoryId: catalog.id,
    framework: catalog.framework,
    language: catalog.language,
    category: catalog.category,
    score: 0,
    passScores: passIds.map((passId) => ({
      passId,
      score: 0,
      metrics: emptyMetrics,
      executionTimeMs: 0,
      memoryBytes: measureMemoryBytes(),
      confidence: { count: 0, min: 0, max: 0, mean: 0, p50: 0 },
      expected: null,
      actual: null,
      details: [error],
    })),
    executionTimeMs: 0,
    memoryBytes: measureMemoryBytes(),
    commitSha: catalog.commitSha,
    error,
  };
}
