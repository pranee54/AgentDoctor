import { getBrainStatus } from "../../core/brain-cli/service.js";
import { buildIntelligenceGraph } from "../../intelligence/graph/build.js";
import { analyzeGitIntelligence } from "../../intelligence/git/analyze.js";
import { analyzeCodeHealth } from "../health/code-health.js";
import { buildProjectDna, type ProjectDna } from "../dna/build.js";
import { resolveRepoRoot } from "../../utils/path.js";
import type { TruthLabel } from "../truth.js";

export interface SoftwareDigitalTwin {
  root: string;
  generatedAt: string;
  dna: ProjectDna;
  brain: Awaited<ReturnType<typeof getBrainStatus>>;
  graphSummary: {
    nodeCount: number;
    edgeCount: number;
    truth: TruthLabel;
  };
  gitSummary: {
    gitAvailable: boolean;
    hotspotCount: number;
    truth: TruthLabel;
  };
  health: Awaited<ReturnType<typeof analyzeCodeHealth>>;
  limitations: string[];
}

export async function buildSoftwareDigitalTwinSnapshot(
  rootInput: string,
): Promise<SoftwareDigitalTwin> {
  const root = resolveRepoRoot(rootInput);
  const limitations = [
    "Digital twin is a deterministic snapshot of local analyzers, not live runtime state.",
    "Graph summary may be partial when graph build skips files.",
  ];

  const [dna, brain, git] = await Promise.all([
    buildProjectDna(root),
    getBrainStatus(root),
    analyzeGitIntelligence(root),
  ]);

  let nodeCount = 0;
  let edgeCount = 0;
  let graphTruth: TruthLabel = "UNKNOWN";
  try {
    const graph = await buildIntelligenceGraph({ root, mode: "auto" });
    nodeCount = graph.nodes.length;
    edgeCount = graph.edges.length;
    graphTruth = "INFERRED";
    if (graph.limitations?.length) {
      limitations.push(...graph.limitations.slice(0, 3));
    }
  } catch {
    limitations.push("Intelligence graph build failed for twin snapshot.");
  }

  const healthWithGit = await analyzeCodeHealth(root, { gitReport: git });

  return {
    root,
    generatedAt: new Date().toISOString(),
    dna,
    brain,
    graphSummary: {
      nodeCount,
      edgeCount,
      truth: graphTruth,
    },
    gitSummary: {
      gitAvailable: git.gitAvailable,
      hotspotCount: git.hotspots.length,
      truth: git.gitAvailable ? "INFERRED" : "UNKNOWN",
    },
    health: healthWithGit,
    limitations,
  };
}
