import { spawnSync } from "node:child_process";

import { analyzeGitIntelligence } from "../../intelligence/git/analyze.js";
import { resolveRepoRoot } from "../../utils/path.js";
import type { TruthLabel } from "../truth.js";

export interface EvolutionTimelineEvent {
  id: string;
  date: string;
  author: string;
  subject: string;
  filesTouched: number;
  truth: TruthLabel;
}

export interface EvolutionTrend {
  id: string;
  label: string;
  direction: "up" | "down" | "stable";
  metric: string;
  truth: TruthLabel;
  note: string;
}

export interface SoftwareEvolutionReport {
  root: string;
  gitAvailable: boolean;
  events: EvolutionTimelineEvent[];
  trends: EvolutionTrend[];
  gitIntelligence: Awaited<ReturnType<typeof analyzeGitIntelligence>>;
  limitations: string[];
}

function git(root: string, args: string[]): { ok: boolean; out: string } {
  const r = spawnSync("git", args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  return { ok: r.status === 0, out: typeof r.stdout === "string" ? r.stdout : "" };
}

function parseLogSummary(root: string, maxCommits: number): EvolutionTimelineEvent[] {
  const log = git(root, [
    "log",
    `--max-count=${maxCommits}`,
    "--pretty=format:%H%x09%ai%x09%an%x09%s",
    "--name-only",
  ]);
  if (!log.ok) return [];

  const events: EvolutionTimelineEvent[] = [];
  let pending: Omit<EvolutionTimelineEvent, "filesTouched"> | null = null;
  let fileCount = 0;

  const flush = () => {
    if (!pending) return;
    events.push({ ...pending, filesTouched: fileCount });
    pending = null;
    fileCount = 0;
  };

  for (const line of log.out.split(/\r?\n/)) {
    if (!line.trim()) continue;
    if (line.includes("\t")) {
      flush();
      const [hash, date, author, subject] = line.split("\t");
      if (!hash || !date) continue;
      pending = {
        id: hash.slice(0, 12),
        date: date.trim(),
        author: (author ?? "unknown").trim(),
        subject: (subject ?? "").trim().slice(0, 240),
        truth: "VERIFIED",
      };
      continue;
    }
    if (pending) fileCount += 1;
  }
  flush();
  return events;
}

function inferTrends(
  events: EvolutionTimelineEvent[],
  gitReport: Awaited<ReturnType<typeof analyzeGitIntelligence>>,
): EvolutionTrend[] {
  const trends: EvolutionTrend[] = [];
  if (events.length >= 2) {
    const recent = events.slice(0, Math.min(20, events.length));
    const older = events.slice(Math.min(20, events.length));
    const avgRecent = recent.reduce((s, e) => s + e.filesTouched, 0) / Math.max(1, recent.length);
    const avgOlder =
      older.length > 0 ? older.reduce((s, e) => s + e.filesTouched, 0) / older.length : avgRecent;
    const direction: EvolutionTrend["direction"] =
      avgRecent > avgOlder * 1.15 ? "up" : avgRecent < avgOlder * 0.85 ? "down" : "stable";
    trends.push({
      id: "change-breadth",
      label: "Average files touched per commit (recent window)",
      direction,
      metric: avgRecent.toFixed(2),
      truth: "INFERRED",
      note: "Compared recent ≤20 commits vs earlier commits in the same log window.",
    });
  }

  if (gitReport.hotspots.length >= 2) {
    const top = gitReport.hotspots[0]!;
    const second = gitReport.hotspots[1]!;
    trends.push({
      id: "hotspot-concentration",
      label: "Hotspot file churn concentration",
      direction: top.commits > second.commits * 2 ? "up" : "stable",
      metric: `${top.path} (${top.commits} commits)`,
      truth: "INFERRED",
      note: gitReport.hotspots[0]?.method ?? "git intelligence hotspot method",
    });
  }

  const authors = new Set(events.map((e) => e.author));
  trends.push({
    id: "contributor-breadth",
    label: "Distinct authors in timeline window",
    direction: authors.size >= 3 ? "stable" : "down",
    metric: String(authors.size),
    truth: "INFERRED",
    note: "Author count in parsed log — not organizational bus factor.",
  });

  return trends;
}

export async function buildSoftwareEvolutionTimeline(
  rootInput: string,
  options?: { maxCommits?: number },
): Promise<SoftwareEvolutionReport> {
  const root = resolveRepoRoot(rootInput);
  const maxCommits = Math.max(10, Math.min(500, options?.maxCommits ?? 120));
  const gitIntelligence = await analyzeGitIntelligence(root);
  const limitations = [
    "Timeline events come from git log — shallow or missing git yields empty timeline.",
    "Trends are INFERRED heuristics — not predictive analytics.",
    ...gitIntelligence.limitations,
  ];

  if (!gitIntelligence.gitAvailable) {
    return {
      root,
      gitAvailable: false,
      events: [],
      trends: [],
      gitIntelligence,
      limitations,
    };
  }

  const events = parseLogSummary(root, maxCommits);
  const trends = inferTrends(events, gitIntelligence);

  return {
    root,
    gitAvailable: true,
    events,
    trends,
    gitIntelligence,
    limitations,
  };
}
