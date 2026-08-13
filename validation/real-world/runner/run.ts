import fs from "node:fs";

import { checkoutPath, loadCatalog, loadGroundTruth } from "./catalog.js";
import { ensureCheckout } from "./clone.js";
import { compileRepository } from "./compile-repo.js";
import {
  buildCompilerScore,
  buildValidationReport,
  printSummary,
  writeArtifacts,
} from "./report.js";
import { failedRepositoryScore, scoreRepository } from "./score.js";

async function main(): Promise<void> {
  const only = process.argv.slice(2).filter((arg) => !arg.startsWith("-"));
  const skipClone = process.argv.includes("--skip-clone");
  const catalog = loadCatalog().filter((entry) =>
    only.length === 0 ? true : only.includes(entry.id),
  );

  if (catalog.length === 0) {
    throw new Error("No repositories selected");
  }

  for (const entry of catalog) {
    if (entry.commitSha === "PENDING") {
      throw new Error(
        `Repository ${entry.id} has PENDING commitSha. Run: npm run validate:real-world:pin`,
      );
    }
  }

  const repositoryScores = [];

  for (const entry of catalog) {
    const truth = loadGroundTruth(entry.id);
    process.stdout.write(`[${entry.id}] `);

    try {
      let cwd = checkoutPath(entry.id);
      if (!skipClone || !fs.existsSync(cwd)) {
        process.stdout.write("clone... ");
        cwd = await ensureCheckout(entry);
      }
      process.stdout.write("compile... ");
      const compiled = await compileRepository(cwd);
      const scored = scoreRepository(compiled, truth, entry);
      repositoryScores.push(scored);
      console.log(
        `score=${scored.score.toFixed(2)} time=${scored.executionTimeMs}ms domains=${compiled.domains.domains.length} entry=${compiled.entrypoints.entrypoints.length} deps=${compiled.dependencies.dependencies.length} arch=${compiled.architectures.architectures.length}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      repositoryScores.push(failedRepositoryScore(entry, message));
      console.log(`ERROR ${message}`);
    }
  }

  const compilerScore = buildCompilerScore(repositoryScores);
  const report = buildValidationReport(compilerScore);
  const artifacts = writeArtifacts(report);
  printSummary(report, artifacts.scientificPath);
  console.log(`Report: ${artifacts.reportPath}`);
  console.log(`Regressions: ${artifacts.regressionPath}`);
  console.log(`History: ${artifacts.historyPath}`);
  console.log(`Results: ${artifacts.resultsDir}`);

  // Exit 0 after evidence collection — low scores are expected and informative.
  // Exit 1 only when the laboratory itself failed to execute (clone/compile errors).
  if (!report.ok) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
