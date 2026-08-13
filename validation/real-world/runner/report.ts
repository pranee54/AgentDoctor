import fs from "node:fs";
import path from "node:path";

import { PROJECT_MODEL_SCHEMA_VERSION, UNDERSTANDING_COMPILER_VERSION } from "../../../src/core/understanding/model/version.js";
import { average } from "../metrics/scoring.js";
import type {
  CompilerScore,
  HistoryEntry,
  PassId,
  RepositoryScore,
  ScientificFindings,
  ValidationReport,
} from "../types.js";
import { REAL_WORLD_SUITE_VERSION } from "../version.js";
import { getLabRoot } from "./catalog.js";
import { collectRegressions } from "./regressions.js";

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
    const passes = repositoryScores.flatMap((repo) =>
      repo.passScores.filter((p) => p.passId === passId),
    );
    passAggregates[passId] = {
      score: average(passes.map((p) => p.score)),
      precision: average(passes.map((p) => p.metrics.precision * 100)) / 100,
      recall: average(passes.map((p) => p.metrics.recall * 100)) / 100,
      coverage: average(passes.map((p) => p.metrics.coverage * 100)) / 100,
      executionTimeMs: Math.round(average(passes.map((p) => p.executionTimeMs))),
      failureCount: passes.filter((p) => p.score < 100 || p.details.length > 0).length,
    };
  }

  const frameworkAggregates: CompilerScore["frameworkAggregates"] = {};
  for (const repo of repositoryScores) {
    const bucket = frameworkAggregates[repo.framework] ?? {
      score: 0,
      repositoryCount: 0,
      failureCount: 0,
    };
    bucket.repositoryCount += 1;
    bucket.score += repo.score;
    if (repo.error || repo.score < 70) {
      bucket.failureCount += 1;
    }
    frameworkAggregates[repo.framework] = bucket;
  }
  for (const key of Object.keys(frameworkAggregates)) {
    const bucket = frameworkAggregates[key];
    if (!bucket) {
      continue;
    }
    bucket.score = average([bucket.score / Math.max(bucket.repositoryCount, 1)]);
  }

  return {
    suiteVersion: REAL_WORLD_SUITE_VERSION,
    compilerSchemaVersion: PROJECT_MODEL_SCHEMA_VERSION,
    compilerVersion: UNDERSTANDING_COMPILER_VERSION,
    score: average(repositoryScores.map((r) => r.score)),
    repositoryScores,
    passAggregates,
    frameworkAggregates,
    executionTimeMs: repositoryScores.reduce((acc, r) => acc + r.executionTimeMs, 0),
    memoryBytes: Math.max(0, ...repositoryScores.map((r) => r.memoryBytes)),
  };
}

export function buildValidationReport(compilerScore: CompilerScore): ValidationReport {
  const regressions = collectRegressions(compilerScore.repositoryScores);
  const failedRepositories = compilerScore.repositoryScores
    .filter((r) => Boolean(r.error) || r.score < 70)
    .map((r) => r.repositoryId)
    .sort();
  return {
    suiteVersion: REAL_WORLD_SUITE_VERSION,
    generatedAt: new Date().toISOString(),
    compilerScore,
    failedRepositories,
    regressionCount: regressions.findings.length,
    // Real-world lab always records evidence; "ok" means the suite executed completely.
    ok: compilerScore.repositoryScores.every((r) => !r.error),
  };
}

export function writeArtifacts(report: ValidationReport): {
  reportPath: string;
  regressionPath: string;
  historyPath: string;
  resultsDir: string;
  scientificPath: string;
} {
  const lab = getLabRoot();
  const stamp = report.generatedAt.replace(/[:.]/g, "-");
  const reportsDir = path.join(lab, "reports");
  const regressionsDir = path.join(lab, "regressions");
  const historyDir = path.join(lab, "history");
  const resultsDir = path.join(lab, "results", stamp);
  fs.mkdirSync(reportsDir, { recursive: true });
  fs.mkdirSync(regressionsDir, { recursive: true });
  fs.mkdirSync(historyDir, { recursive: true });
  fs.mkdirSync(resultsDir, { recursive: true });

  const reportPath = path.join(reportsDir, "latest.json");
  const stampedReport = path.join(reportsDir, `report-${stamp}.json`);
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(stampedReport, `${JSON.stringify(report, null, 2)}\n`);

  const regressions = collectRegressions(report.compilerScore.repositoryScores);
  const regressionPath = path.join(regressionsDir, "latest.json");
  const stampedRegression = path.join(regressionsDir, `regressions-${stamp}.json`);
  fs.writeFileSync(regressionPath, `${JSON.stringify(regressions, null, 2)}\n`);
  fs.writeFileSync(stampedRegression, `${JSON.stringify(regressions, null, 2)}\n`);

  for (const repo of report.compilerScore.repositoryScores) {
    fs.writeFileSync(
      path.join(resultsDir, `${repo.repositoryId}.json`),
      `${JSON.stringify(repo, null, 2)}\n`,
    );
  }

  const historyEntry: HistoryEntry = {
    suiteVersion: report.suiteVersion,
    generatedAt: report.generatedAt,
    compilerScore: report.compilerScore.score,
    passAggregates: report.compilerScore.passAggregates,
    failedRepositories: report.failedRepositories,
    repositoryScores: report.compilerScore.repositoryScores.map((r) => ({
      id: r.repositoryId,
      score: r.score,
      executionTimeMs: r.executionTimeMs,
    })),
  };
  const historyPath = path.join(historyDir, `history-${stamp}.json`);
  fs.writeFileSync(historyPath, `${JSON.stringify(historyEntry, null, 2)}\n`);
  appendHistoryIndex(historyEntry);

  const scientific = buildScientificFindings(report);
  const scientificPath = path.join(reportsDir, "scientific-findings.json");
  fs.writeFileSync(scientificPath, `${JSON.stringify(scientific, null, 2)}\n`);
  fs.writeFileSync(
    path.join(reportsDir, `scientific-findings-${stamp}.json`),
    `${JSON.stringify(scientific, null, 2)}\n`,
  );

  return { reportPath, regressionPath, historyPath, resultsDir, scientificPath };
}

function appendHistoryIndex(entry: HistoryEntry): void {
  const indexPath = path.join(getLabRoot(), "history", "index.json");
  let index: HistoryEntry[] = [];
  if (fs.existsSync(indexPath)) {
    index = JSON.parse(fs.readFileSync(indexPath, "utf8")) as HistoryEntry[];
  }
  index.push(entry);
  fs.writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`);
}

export function buildScientificFindings(report: ValidationReport): ScientificFindings {
  const { compilerScore } = report;
  const passEntries = Object.entries(compilerScore.passAggregates) as Array<
    [PassId, CompilerScore["passAggregates"][PassId]]
  >;
  passEntries.sort((a, b) => a[1].score - b[1].score);
  const weakest = passEntries[0];
  const strongest = [...passEntries].sort((a, b) => b[1].score - a[1].score);

  const frameworkEntries = Object.entries(compilerScore.frameworkAggregates).sort(
    (a, b) => a[1].score - b[1].score,
  );

  const wherePerformsWell = strongest
    .filter(([, agg]) => agg.score >= 70)
    .slice(0, 4)
    .map(
      ([passId, agg]) =>
        `${passId} (score=${agg.score.toFixed(2)}, precision=${agg.precision.toFixed(3)}, recall=${agg.recall.toFixed(3)})`,
    );

  const whereConsistentlyFails = passEntries
    .filter(([, agg]) => agg.score < 70 || agg.failureCount >= Math.ceil(compilerScore.repositoryScores.length * 0.4))
    .map(
      ([passId, agg]) =>
        `${passId} fails on ${agg.failureCount}/${compilerScore.repositoryScores.length} repos (score=${agg.score.toFixed(2)})`,
    );

  const lowRepos = compilerScore.repositoryScores
    .filter((r) => r.score < 50)
    .map((r) => `${r.repositoryId} (${r.framework}, score=${r.score.toFixed(2)}${r.error ? `, error=${r.error}` : ""})`);

  if (lowRepos.length > 0) {
    whereConsistentlyFails.push(`Lowest repositories: ${lowRepos.slice(0, 8).join("; ")}`);
  }

  const frameworksNeedingSupport = frameworkEntries
    .filter(([, agg]) => agg.score < 92 || agg.failureCount > 0)
    .slice(0, 6)
    .map(([framework, agg]) => {
      const weakRepos = compilerScore.repositoryScores
        .filter((r) => r.framework === framework)
        .flatMap((r) =>
          r.passScores
            .filter((p) => p.score < 100)
            .map((p) => p.passId),
        );
      const uniqueWeak = [...new Set(weakRepos)];
      return {
        framework,
        score: agg.score,
        rationale:
          uniqueWeak.length > 0
            ? `Weak passes: ${uniqueWeak.join(", ")} across ${agg.repositoryCount} repo(s).`
            : `${agg.failureCount}/${agg.repositoryCount} repos below threshold.`,
      };
    });

  const weakestPassId = weakest?.[0] ?? "architecture-inference";
  const weakestScore = weakest?.[1].score ?? 0;

  const compilerV02Improvements: string[] = [];
  for (const [passId, agg] of passEntries) {
    if (agg.score >= 95 && agg.failureCount === 0) {
      continue;
    }
    switch (passId) {
      case "domain-discovery":
        compilerV02Improvements.push(
          "Domain lexicon over-fits commerce tokens and misses/over-fires on library path vocabulary; calibrate minEvidence for large monorepos.",
        );
        break;
      case "entrypoint-discovery":
        compilerV02Improvements.push(
          "Library packages (express, axios, commander) lack app-style entry files; add package-main/export discovery distinct from application bootstraps.",
        );
        break;
      case "dependency-discovery":
        compilerV02Improvements.push(
          "Go/multi-service trees and some Dart/PHP layouts under-produce edges (microservices-demo deps=0); strengthen non-JS extractors.",
        );
        break;
      case "relationship-discovery":
        compilerV02Improvements.push(
          "Relationship density collapses when dependency graphs are empty; fix upstream extractors before adding role rules.",
        );
        break;
      case "architecture-inference":
        compilerV02Improvements.push(
          "Architecture inference over-emits DDD/Onion/Riverpod and under-detects MVC/Layered/Service Layer on real apps (laravel, express, fastapi, spring-petclinic).",
        );
        compilerV02Improvements.push(
          "Gate pattern emission on stronger role-edge evidence; stop inferring mobile patterns (Riverpod/BLoC) on PHP/JS backends.",
        );
        break;
      case "project-model":
        compilerV02Improvements.push(
          "Project-model gaps track empty upstream slices (deps/relationships); keep schema validation strict.",
        );
        break;
      case "query-engine":
        compilerV02Improvements.push(
          "Query engine is correct when data exists; v0.2 should not change the query API.",
        );
        break;
      case "understand":
        compilerV02Improvements.push(
          "Understand output is structurally fine; usefulness rises only after architecture/domain noise is reduced.",
        );
        break;
      default:
        break;
    }
  }
  if (compilerV02Improvements.length === 0) {
    compilerV02Improvements.push(
      "Maintain regression history; broaden repository sample sizes before changing heuristics.",
    );
  }

  // Surface concrete architecture false-positive classes from this run.
  const archFalsePositives = new Map<string, number>();
  for (const repo of compilerScore.repositoryScores) {
    const arch = repo.passScores.find((p) => p.passId === "architecture-inference");
    if (!arch || !Array.isArray(arch.actual)) {
      continue;
    }
    const required = new Set(
      ((arch.expected as { requiredPatterns?: string[] } | null)?.requiredPatterns ?? []).map((p) =>
        p.toLowerCase(),
      ),
    );
    for (const pattern of arch.actual as string[]) {
      if (!required.has(pattern.toLowerCase())) {
        archFalsePositives.set(pattern, (archFalsePositives.get(pattern) ?? 0) + 1);
      }
    }
  }
  const noisy = [...archFalsePositives.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([pattern, count]) => `${pattern}(${count})`);
  if (noisy.length > 0) {
    whereConsistentlyFails.push(`Architecture false-positive noise leaders: ${noisy.join(", ")}`);
  }

  return {
    suiteVersion: report.suiteVersion,
    generatedAt: report.generatedAt,
    compilerScore: compilerScore.score,
    wherePerformsWell:
      wherePerformsWell.length > 0
        ? wherePerformsWell
        : ["No pass scored ≥70 against honest real-world ground truth."],
    whereConsistentlyFails:
      whereConsistentlyFails.length > 0
        ? whereConsistentlyFails
        : ["No systemic failure cluster detected in this run."],
    weakestPass: {
      passId: weakestPassId,
      score: weakestScore,
      rationale: `Lowest aggregate score across ${compilerScore.repositoryScores.length} repositories; failureCount=${weakest?.[1].failureCount ?? 0}.`,
    },
    frameworksNeedingSupport,
    compilerV02Improvements: [...new Set(compilerV02Improvements)],
  };
}

export function printSummary(report: ValidationReport, scientificPath: string): void {
  console.log(`\nReal-World Validation ${report.suiteVersion}`);
  console.log(`Compiler score: ${report.compilerScore.score.toFixed(2)}`);
  console.log(
    `Schema ${report.compilerScore.compilerSchemaVersion} / compiler ${report.compilerScore.compilerVersion}`,
  );
  console.log(`Regressions: ${report.regressionCount}`);
  console.log(`Failed repositories: ${report.failedRepositories.join(", ") || "(none)"}`);
  console.log("\nPass aggregates:");
  for (const passId of PASS_IDS) {
    const agg = report.compilerScore.passAggregates[passId];
    console.log(
      `  ${passId.padEnd(24)} score=${agg.score.toFixed(2)} P=${agg.precision.toFixed(3)} R=${agg.recall.toFixed(3)} cov=${agg.coverage.toFixed(3)} fails=${agg.failureCount}`,
    );
  }
  console.log(`\nScientific findings: ${scientificPath}`);
  console.log(`RESULT: ${report.ok ? "COMPLETE" : "INCOMPLETE (clone/compile errors)"}`);
}
