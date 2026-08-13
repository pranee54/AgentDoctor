import { createHash } from "node:crypto";

import type { GroundTruth, SetMetrics } from "../types.js";

export function emptySetMetrics(): SetMetrics {
  return {
    truePositives: 0,
    falsePositives: 0,
    falseNegatives: 0,
    precision: 1,
    recall: 1,
    f1: 1,
    coverage: 1,
  };
}

export function scoreRequiredForbidden(
  required: readonly string[],
  forbidden: readonly string[],
  actual: readonly string[],
  equals: (a: string, b: string) => boolean = (a, b) => a === b,
): SetMetrics {
  const actualList = [...actual];
  let truePositives = 0;
  let falseNegatives = 0;
  for (const item of required) {
    if (actualList.some((candidate) => equals(candidate, item))) {
      truePositives += 1;
    } else {
      falseNegatives += 1;
    }
  }
  let falsePositives = 0;
  for (const item of forbidden) {
    if (actualList.some((candidate) => equals(candidate, item))) {
      falsePositives += 1;
    }
  }

  const precisionDenom = truePositives + falsePositives;
  const recallDenom = truePositives + falseNegatives;
  const precision = precisionDenom === 0 ? 1 : truePositives / precisionDenom;
  const recall = recallDenom === 0 ? 1 : truePositives / recallDenom;
  const f1 =
    precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  const coverage =
    required.length === 0 ? 1 : truePositives / required.length;

  return {
    truePositives,
    falsePositives,
    falseNegatives,
    precision: round4(precision),
    recall: round4(recall),
    f1: round4(f1),
    coverage: round4(coverage),
  };
}

export function scoreFromMetrics(metrics: SetMetrics): number {
  return round2(((metrics.precision + metrics.recall) / 2) * 100);
}

export function confidenceDistribution(values: readonly number[]) {
  if (values.length === 0) {
    return { count: 0, min: 0, max: 0, mean: 0, p50: 0 };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, value) => acc + value, 0);
  const mid = Math.floor(sorted.length / 2);
  const p50 =
    sorted.length % 2 === 0
      ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
      : (sorted[mid] ?? 0);
  return {
    count: sorted.length,
    min: round4(sorted[0] ?? 0),
    max: round4(sorted[sorted.length - 1] ?? 0),
    mean: round4(sum / sorted.length),
    p50: round4(p50),
  };
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}

export function average(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return round2(values.reduce((acc, value) => acc + value, 0) / values.length);
}

export function measureMemoryBytes(): number {
  return process.memoryUsage().heapUsed;
}

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort()) {
      sorted[key] = sortKeysDeep(record[key]);
    }
    return sorted;
  }
  return value;
}

/** Canonical JSON body used for expectation locking (excludes lock field itself). */
export function groundTruthBodyForLock(truth: Omit<GroundTruth, "expectationLock">): string {
  const { expectationLock: _ignored, ...rest } = truth as GroundTruth;
  void _ignored;
  return JSON.stringify(sortKeysDeep(rest));
}

export function computeExpectationLock(
  truth: Omit<GroundTruth, "expectationLock">,
): string {
  return createHash("sha256").update(groundTruthBodyForLock(truth)).digest("hex");
}

export function withExpectationLock(
  truth: Omit<GroundTruth, "expectationLock">,
): GroundTruth {
  return {
    ...truth,
    expectationLock: computeExpectationLock(truth),
  };
}
