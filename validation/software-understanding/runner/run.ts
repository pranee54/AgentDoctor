import fs from "node:fs";

import type { RepositoryExpectation } from "../types.js";
import { listBenchmarkCases } from "./catalog.js";
import { compileRepository } from "./compile-repo.js";
import {
  buildCompilerScore,
  buildValidationReport,
  printValidationSummary,
  writeValidationReport,
} from "./report.js";
import { scoreRepository } from "./score.js";

async function main(): Promise<void> {
  const cases = listBenchmarkCases();
  const repositoryScores = [];

  for (const benchmark of cases) {
    if (!fs.existsSync(benchmark.repoRoot)) {
      throw new Error(`Missing framework repo: ${benchmark.repoRoot}`);
    }
    if (!fs.existsSync(benchmark.expectedPath)) {
      throw new Error(`Missing expected file: ${benchmark.expectedPath}`);
    }
    const expected = JSON.parse(
      fs.readFileSync(benchmark.expectedPath, "utf8"),
    ) as RepositoryExpectation;
    process.stdout.write(`Compiling ${benchmark.id}... `);
    const compiled = await compileRepository(benchmark.repoRoot);
    const scored = scoreRepository(compiled, expected);
    repositoryScores.push(scored);
    console.log(`score=${scored.score.toFixed(2)} (${compiled.timingMs.total}ms)`);
  }

  const compilerScore = buildCompilerScore(repositoryScores);
  const report = buildValidationReport(compilerScore);
  const reportPath = writeValidationReport(report);
  printValidationSummary(report);
  console.log(`Report written: ${reportPath}`);

  if (!report.ok) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Validation failed: ${message}`);
  process.exitCode = 1;
});
