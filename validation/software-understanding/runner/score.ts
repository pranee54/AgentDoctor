import { Queries } from "../../../src/core/understanding/query/index.js";
import { createQueryEngine } from "../../../src/core/understanding/query/index.js";
import { validateProjectModel } from "../../../src/core/understanding/model/index.js";
import {
  average,
  confidenceDistribution,
  measureMemoryBytes,
  scoreFromMetrics,
  scoreRequiredForbidden,
} from "../metrics/scoring.js";
import type {
  PassId,
  PassScore,
  RepositoryExpectation,
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
  return {
    ...metrics,
    falseNegatives: metrics.falseNegatives + (minCount - actualCount),
    recall: Math.max(0, metrics.recall * 0.5),
    f1: Math.max(0, metrics.f1 * 0.5),
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
  expected: RepositoryExpectation,
): RepositoryScore {
  const memoryBytes = measureMemoryBytes();
  const passScores: PassScore[] = [];

  // Domains
  {
    const actualNames = compiled.domains.domains.map((d) => d.name);
    const metrics = scoreRequiredForbidden(
      expected.domains.required,
      expected.domains.forbidden,
      actualNames,
      ciEquals,
    );
    passScores.push(
      passScore("domain-discovery", metrics, {
        executionTimeMs: compiled.timingMs.domains,
        memoryBytes,
        confidences: compiled.domains.domains.map((d) => d.confidence),
        expected: expected.domains,
        actual: actualNames,
      }),
    );
  }

  // Entrypoints
  {
    const details: string[] = [];
    let truePositives = 0;
    let falseNegatives = 0;
    for (const req of expected.entrypoints.required) {
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
    for (const framework of expected.entrypoints.forbiddenFrameworks) {
      if (compiled.entrypoints.entrypoints.some((entry) => ciEquals(entry.framework, framework))) {
        falsePositives += 1;
        details.push(`forbidden framework present: ${framework}`);
      }
    }
    const precisionDenom = truePositives + falsePositives;
    const recallDenom = truePositives + falseNegatives;
    const metrics: SetMetrics = {
      truePositives,
      falsePositives,
      falseNegatives,
      precision: precisionDenom === 0 ? 1 : truePositives / precisionDenom,
      recall: recallDenom === 0 ? 1 : truePositives / recallDenom,
      f1: 0,
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
    passScores.push(
      passScore("entrypoint-discovery", metrics, {
        executionTimeMs: compiled.timingMs.entrypoints,
        memoryBytes,
        confidences: compiled.entrypoints.entrypoints.map((e) => e.confidence),
        expected: expected.entrypoints,
        actual: compiled.entrypoints.entrypoints.map((e) => `${e.framework}:${e.file}`),
        details,
      }),
    );
  }

  // Dependencies
  {
    const details: string[] = [];
    const actualKeys = compiled.dependencies.dependencies.map(
      (d) => `${d.from}|${d.to}|${d.type}`,
    );
    const requiredKeys = expected.dependencies.required.map(
      (d) => `${d.from}|${d.to}|${d.type ?? ""}`,
    );
    let truePositives = 0;
    let falseNegatives = 0;
    for (const req of expected.dependencies.required) {
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
    metrics = withMinCount(
      metrics,
      compiled.dependencies.dependencies.length,
      expected.dependencies.minCount,
      details,
    );
    passScores.push(
      passScore("dependency-discovery", metrics, {
        executionTimeMs: compiled.timingMs.dependencies,
        memoryBytes,
        confidences: compiled.dependencies.dependencies.map((d) => d.confidence),
        expected: expected.dependencies,
        actual: actualKeys,
        details,
      }),
    );
    void requiredKeys;
  }

  // Relationships
  {
    const details: string[] = [];
    let truePositives = 0;
    let falseNegatives = 0;
    for (const req of expected.relationships.required) {
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
    metrics = withMinCount(
      metrics,
      compiled.relationships.relationships.length,
      expected.relationships.minCount,
      details,
    );
    passScores.push(
      passScore("relationship-discovery", metrics, {
        executionTimeMs: compiled.timingMs.relationships,
        memoryBytes,
        confidences: compiled.relationships.relationships.map((r) => r.confidence),
        expected: expected.relationships,
        actual: compiled.relationships.relationships.map(
          (r) => `${r.source}|${r.relationship}|${r.target}`,
        ),
        details,
      }),
    );
  }

  // Architectures
  {
    const actualPatterns = compiled.architectures.architectures.map((a) => a.pattern);
    const metrics = scoreRequiredForbidden(
      expected.architectures.requiredPatterns,
      expected.architectures.forbiddenPatterns,
      actualPatterns,
      ciEquals,
    );
    passScores.push(
      passScore("architecture-inference", metrics, {
        executionTimeMs: compiled.timingMs.architectures,
        memoryBytes,
        confidences: compiled.architectures.architectures.map((a) => a.confidence),
        expected: expected.architectures,
        actual: actualPatterns,
      }),
    );
  }

  // Project model
  {
    const details: string[] = [];
    const validation = validateProjectModel(compiled.model);
    let truePositives = 0;
    let falseNegatives = 0;
    let falsePositives = 0;
    const checks: Array<[string, boolean]> = [
      ["valid", validation.ok],
      ["minDomains", compiled.model.domains.length >= expected.projectModel.minDomains],
      ["minEntrypoints", compiled.model.entrypoints.length >= expected.projectModel.minEntrypoints],
      [
        "minDependencies",
        compiled.model.dependencies.length >= expected.projectModel.minDependencies,
      ],
      [
        "minRelationships",
        compiled.model.relationships.length >= expected.projectModel.minRelationships,
      ],
      [
        "minArchitectures",
        compiled.model.architectures.length >= expected.projectModel.minArchitectures,
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
        expected: expected.projectModel,
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

  // Query engine
  {
    const details: string[] = [];
    const engine = createQueryEngine(compiled.model);
    let truePositives = 0;
    let falseNegatives = 0;
    const domains = engine.execute(Queries.listDomains());
    const entrypoints = engine.execute(Queries.listEntrypoints());
    if (domains.result.count >= expected.query.minListDomains) {
      truePositives += 1;
    } else {
      falseNegatives += 1;
      details.push("listDomains below minimum");
    }
    if (entrypoints.result.count >= expected.query.minListEntrypoints) {
      truePositives += 1;
    } else {
      falseNegatives += 1;
      details.push("listEntrypoints below minimum");
    }
    if (expected.query.mustFindDomain) {
      try {
        const found = engine.execute(Queries.findDomain(expected.query.mustFindDomain));
        if (found.result.domain.name) {
          truePositives += 1;
        } else {
          falseNegatives += 1;
        }
      } catch {
        falseNegatives += 1;
        details.push(`FindDomain failed for ${expected.query.mustFindDomain}`);
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
        expected: expected.query,
        actual: {
          domainCount: domains.result.count,
          entrypointCount: entrypoints.result.count,
        },
        details,
      }),
    );
  }

  // Understand
  {
    const details: string[] = [];
    let truePositives = 0;
    let falseNegatives = 0;
    for (const needle of expected.understand.mustContain) {
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
        expected: expected.understand,
        actual: {
          sectionTitles: compiled.understand.sections.map((s) => s.title),
          textLength: compiled.understand.text.length,
        },
        details,
      }),
    );
  }

  return {
    repositoryId: expected.id,
    framework: expected.framework,
    score: average(passScores.map((p) => p.score)),
    passScores,
    executionTimeMs: compiled.timingMs.total,
    memoryBytes,
  };
}
