import { analyzeGitIntelligence } from "../../intelligence/git/analyze.js";
import { resolveRepoRoot } from "../../utils/path.js";
import type { TruthLabel } from "../truth.js";

export interface IncidentTimelineItem {
  id: string;
  hypothesis: string;
  truth: TruthLabel;
  relatedPaths: string[];
  method: string;
}

export interface IncidentReport {
  root: string;
  timeline: IncidentTimelineItem[];
  limitations: string[];
}

function normalizePaths(paths: string[]): string[] {
  return [...new Set(paths.map((p) => p.replace(/\\/g, "/")))].sort();
}

export async function buildIncidentHypotheses(
  rootInput: string,
  options?: {
    changedFiles?: string[];
    gitHotspots?: Array<{ path: string; commits: number }>;
  },
): Promise<IncidentReport> {
  const root = resolveRepoRoot(rootInput);
  const limitations = [
    "Timeline items are hypotheses for investigation, not verified incident root cause.",
    "VERIFIED items require explicit changedFiles input or git hotspot file paths.",
  ];

  const changed = normalizePaths(options?.changedFiles ?? []);
  const timeline: IncidentTimelineItem[] = [];

  if (changed.length) {
    timeline.push({
      id: "changed-files",
      hypothesis: "Recent changes concentrated in supplied changedFiles list",
      truth: "VERIFIED",
      relatedPaths: changed,
      method: "caller-supplied changedFiles",
    });
  }

  let hotspots = options?.gitHotspots;
  if (!hotspots) {
    const git = await analyzeGitIntelligence(root);
    if (git.gitAvailable) {
      hotspots = git.hotspots.map((h) => ({ path: h.path, commits: h.commits }));
    } else {
      limitations.push("Git unavailable; hotspot hypotheses skipped.");
    }
  }

  if (hotspots?.length) {
    const top = [...hotspots].sort((a, b) => b.commits - a.commits).slice(0, 5);
    for (const h of top) {
      const overlapsChange = changed.some(
        (c) => c === h.path || h.path.endsWith(c) || c.endsWith(h.path),
      );
      timeline.push({
        id: `hotspot-${h.path.replace(/[^\w]/g, "_")}`,
        hypothesis: "Frequent historical churn (git hotspot) may relate to instability",
        truth: overlapsChange ? "VERIFIED" : "INFERRED",
        relatedPaths: [h.path.replace(/\\/g, "/")],
        method: `git log file appearances (commits=${h.commits})`,
      });
    }
  }

  if (changed.length && hotspots?.length) {
    const hotSet = new Set(hotspots.map((h) => h.path.replace(/\\/g, "/")));
    const overlap = changed.filter((c) => hotSet.has(c));
    if (overlap.length) {
      timeline.push({
        id: "change-hotspot-overlap",
        hypothesis: "Changed files overlap historical hotspots",
        truth: "VERIFIED",
        relatedPaths: overlap,
        method: "intersection(changedFiles, gitHotspots)",
      });
    }
  }

  timeline.sort((a, b) => a.id.localeCompare(b.id));

  return { root, timeline, limitations };
}
