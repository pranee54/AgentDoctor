import type {
  PassId,
  PassScore,
  RegressionFinding,
  RegressionReport,
  RepositoryScore,
} from "../types.js";
import { REAL_WORLD_SUITE_VERSION } from "../version.js";

const INVESTIGATION: Record<PassId, string> = {
  "domain-discovery":
    "Inspect path-token lexicon coverage and evidence thresholds for this repository’s directory vocabulary.",
  "entrypoint-discovery":
    "Inspect ENTRYPOINT_MODELS path/signal heuristics for this stack; library vs application shapes often diverge.",
  "dependency-discovery":
    "Inspect language extractors, monorepo package graphs, and ignore-directory coverage for missed edges.",
  "relationship-discovery":
    "Inspect semantic role rules; missing role naming conventions reduce relationship density.",
  "architecture-inference":
    "Architecture consumes prior passes only — weak upstream graphs starve pattern rules.",
  "project-model":
    "Model completeness mirrors upstream pass yields; validate schema issues separately from empty graphs.",
  "query-engine":
    "Query failures usually reflect empty ProjectModel slices, not query executor defects.",
  understand:
    "Understand text mirrors QueryEngine summaries; missing sections indicate empty upstream evidence.",
};

export function collectRegressions(scores: readonly RepositoryScore[]): RegressionReport {
  const findings: RegressionFinding[] = [];
  for (const repo of scores) {
    for (const pass of repo.passScores) {
      if (isMismatch(pass)) {
        findings.push({
          repositoryId: repo.repositoryId,
          passId: pass.passId,
          expected: pass.expected,
          actual: pass.actual,
          evidence: [
            ...(repo.error ? [`runtime:${repo.error}`] : []),
            ...pass.details,
            `precision=${pass.metrics.precision}`,
            `recall=${pass.metrics.recall}`,
            `coverage=${pass.metrics.coverage}`,
            `fp=${pass.metrics.falsePositives}`,
            `fn=${pass.metrics.falseNegatives}`,
          ],
          suggestedInvestigation: INVESTIGATION[pass.passId],
        });
      }
    }
  }
  findings.sort((a, b) => {
    const repo = a.repositoryId.localeCompare(b.repositoryId);
    if (repo !== 0) {
      return repo;
    }
    return a.passId.localeCompare(b.passId);
  });
  return {
    suiteVersion: REAL_WORLD_SUITE_VERSION,
    generatedAt: new Date().toISOString(),
    findings,
  };
}

function isMismatch(pass: PassScore): boolean {
  return (
    pass.metrics.falsePositives > 0 ||
    pass.metrics.falseNegatives > 0 ||
    pass.score < 100 ||
    pass.details.length > 0
  );
}
