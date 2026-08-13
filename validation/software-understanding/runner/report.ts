import fs from "node:fs";
import path from "node:path";

import {
  PROJECT_MODEL_SCHEMA_VERSION,
  UNDERSTANDING_COMPILER_VERSION,
} from "../../../src/core/understanding/model/index.js";
import { average } from "../metrics/scoring.js";
import type {
  CompilerScore,
  PassId,
  RepositoryScore,
  ValidationReport,
} from "../types.js";
import { VALIDATION_SUITE_VERSION } from "../version.js";
import { ensureReportsDir } from "./catalog.js";

const PASS_IDS: PassId[] = [
  "domain-discovery",
  "entrypoint-discovery",
  "dependency-discovery",
  "relationship-discovery",
  "architecture-inference",
  "project-model",
  "query-engine",
  "understand",
];

export function buildCompilerScore(repositoryScores: RepositoryScore[]): CompilerScore {
  const passAggregates = {} as CompilerScore["passAggregates"];
  for (const passId of PASS_IDS) {
    const scores = repositoryScores.map(
      (repo) => repo.passScores.find((p) => p.passId === passId)!,
    );
    passAggregates[passId] = {
      score: average(scores.map((s) => s.score)),
      precision: average(scores.map((s) => s.metrics.precision * 100)) / 100,
      recall: average(scores.map((s) => s.metrics.recall * 100)) / 100,
      executionTimeMs: average(scores.map((s) => s.executionTimeMs)),
    };
  }

  return {
    suiteVersion: VALIDATION_SUITE_VERSION,
    compilerSchemaVersion: PROJECT_MODEL_SCHEMA_VERSION,
    compilerVersion: UNDERSTANDING_COMPILER_VERSION,
    score: average(repositoryScores.map((r) => r.score)),
    repositoryScores,
    passAggregates,
    executionTimeMs: repositoryScores.reduce((acc, repo) => acc + repo.executionTimeMs, 0),
    memoryBytes: Math.max(0, ...repositoryScores.map((r) => r.memoryBytes)),
  };
}

export function buildValidationReport(compilerScore: CompilerScore): ValidationReport {
  const failedRepositories = compilerScore.repositoryScores
    .filter((repo) => repo.score < 70)
    .map((repo) => repo.repositoryId);

  return {
    suiteVersion: VALIDATION_SUITE_VERSION,
    generatedAt: new Date().toISOString(),
    compilerScore,
    failedRepositories,
    ok: failedRepositories.length === 0,
  };
}

export function writeValidationReport(report: ValidationReport): string {
  const reportsDir = ensureReportsDir();
  const latestPath = path.join(reportsDir, "latest.json");
  const stampedPath = path.join(
    reportsDir,
    `report-${report.generatedAt.replace(/[:.]/g, "-")}.json`,
  );
  const json = `${JSON.stringify(report, null, 2)}\n`;
  fs.writeFileSync(latestPath, json, "utf8");
  fs.writeFileSync(stampedPath, json, "utf8");
  return latestPath;
}

export function printValidationSummary(report: ValidationReport): void {
  const { compilerScore } = report;
  console.log(`Software Understanding Validation ${report.suiteVersion}`);
  console.log(`Compiler score: ${compilerScore.score.toFixed(2)}`);
  console.log(
    `Schema ${compilerScore.compilerSchemaVersion} / compiler ${compilerScore.compilerVersion}`,
  );
  console.log("");
  for (const repo of compilerScore.repositoryScores) {
    console.log(`- ${repo.repositoryId.padEnd(10)} score=${repo.score.toFixed(2)} time=${repo.executionTimeMs}ms`);
  }
  console.log("");
  console.log("Pass aggregates:");
  for (const passId of PASS_IDS) {
    const agg = compilerScore.passAggregates[passId];
    console.log(
      `  ${passId.padEnd(24)} score=${agg.score.toFixed(2)} P=${agg.precision.toFixed(3)} R=${agg.recall.toFixed(3)}`,
    );
  }
  console.log("");
  console.log(report.ok ? "RESULT: PASS" : `RESULT: FAIL (${report.failedRepositories.join(", ")})`);
}
