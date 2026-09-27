import fs from "node:fs/promises";
import path from "node:path";

import { planContext } from "../../platform/tokens/plan.js";
import { buildIntelligenceGraph } from "../../intelligence/graph/build.js";
import { assertProjectOwnedRepoPath, ProjectOwnershipError } from "../../project/ownership.js";
import { resolveRepoRoot } from "../../utils/path.js";
import { resolveSafeRepoPath, PathEscapeError } from "../../security/paths.js";
import type { ContextBundle, ContextCitation } from "./types.js";
import type { RepositoryGraph } from "../../platform/types.js";
import {
  collectBrainEvidenceForQuery,
  extractQueryTerms,
  isControlPlaneRelativePath,
} from "./brain-evidence.js";
import { noopAskProgress, type AskProgressReporter } from "../progress.js";

export interface RetrieveContextOptions {
  root: string;
  query: string;
  budgetTokens?: number;
  /** Optional relative paths the caller already wants included */
  includePaths?: string[];
  maxExcerptChars?: number;
  /** Reuse a previously built graph (session cache) */
  graph?: RepositoryGraph & { builder?: string; astFilesParsed?: number };
  /** Max owned source files to excerpt (after brain + includePaths). */
  maxSourceFiles?: number;
  /** Optional progress reporter (real operation boundaries only). */
  progress?: AskProgressReporter;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

async function tryReadOwnedExcerpt(
  root: string,
  rel: string,
  maxExcerpt: number,
): Promise<ContextCitation | null> {
  const norm = rel.split(path.sep).join("/");
  if (isControlPlaneRelativePath(norm)) {
    return {
      source: "repository",
      path: norm,
      evidenceType: "metadata",
      confidence: "UNKNOWN",
      note: "control_plane: not application source evidence",
    };
  }
  try {
    const abs = resolveSafeRepoPath(root, rel);
    await assertProjectOwnedRepoPath(root, abs, rel);
    // Directories (module roots) are not source excerpts.
    const st = await fs.stat(abs);
    if (st.isDirectory()) {
      return {
        source: "repository",
        path: norm,
        evidenceType: "metadata",
        confidence: "INFERRED",
        note: "brain-referenced directory (no file excerpt)",
      };
    }
    const text = await fs.readFile(abs, "utf8");
    const excerpt = text.slice(0, maxExcerpt);
    return {
      source: "repository",
      path: norm,
      evidenceType: "source-code",
      confidence: "VERIFIED",
      excerpt,
    };
  } catch (error) {
    if (error instanceof PathEscapeError) {
      return {
        source: "repository",
        path: norm,
        evidenceType: "metadata",
        confidence: "UNKNOWN",
        note: "path_escape: rejected",
      };
    }
    if (error instanceof ProjectOwnershipError) {
      return {
        source: "repository",
        path: norm,
        evidenceType: "metadata",
        confidence: "UNKNOWN",
        note: `ownership_denied: ${error.ownership}`,
      };
    }
    return {
      source: "repository",
      path: norm,
      evidenceType: "metadata",
      confidence: "UNKNOWN",
      note: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Retrieve a budgeted project context pack for the agent.
 * Pipeline: Brain claims → owned source paths → graph plan → ranked excerpts.
 * Hostile paths are rejected via resolveSafeRepoPath + project ownership
 * (containment alone must not promote .private / AgentDoctorOS / nested repos).
 * `.agentdoctor/**` is control-plane and must not become VERIFIED application source evidence.
 */
export async function retrieveProjectContext(
  options: RetrieveContextOptions,
): Promise<ContextBundle> {
  const root = resolveRepoRoot(options.root);
  const query = options.query.trim() || "project overview";
  const maxExcerpt = options.maxExcerptChars ?? 1_200;
  const maxSourceFiles = options.maxSourceFiles ?? 10;
  const citations: ContextCitation[] = [];
  const limitations: string[] = [];
  const chunks: string[] = [];
  const terms = extractQueryTerms(query);
  const progress = options.progress ?? noopAskProgress;

  progress.stage("search", "start");
  let brainPack;
  try {
    brainPack = await collectBrainEvidenceForQuery(root, query);
  } catch (error) {
    progress.stage("search", "fail", error instanceof Error ? error.message : String(error));
    throw error;
  }
  const brainDetail =
    brainPack.hits.length > 0
      ? `${brainPack.hits.length} relevant claim${brainPack.hits.length === 1 ? "" : "s"}`
      : "no matching claims";
  progress.stage("search", "ok", brainDetail);
  limitations.push(...brainPack.limitations);
  for (const c of brainPack.citations) {
    citations.push(c);
    if (c.excerpt) {
      chunks.push(`--- BRAIN (${c.confidence}) ---\n${c.excerpt}`);
    }
  }

  progress.stage("retrieve", "start");
  let graph = options.graph;
  try {
    if (!graph) {
      graph = await buildIntelligenceGraph({ root, mode: "auto" });
    }
  } catch (error) {
    progress.stage("retrieve", "fail", error instanceof Error ? error.message : String(error));
    limitations.push(
      `Graph unavailable: ${error instanceof Error ? error.message : String(error)}`,
    );
    if (citations.length === 0) {
      citations.push({
        source: "repository",
        evidenceType: "metadata",
        confidence: "UNKNOWN",
        note: "Repository graph could not be built and no brain evidence matched.",
      });
    }
    const rendered = [
      `Project root: ${root}`,
      `Query: ${query}`,
      `Brain hits: ${brainPack.hits.length}`,
      "",
      ...chunks,
    ].join("\n");
    return {
      root,
      query,
      citations,
      rendered,
      estimatedTokens: estimateTokens(rendered),
      limitations,
    };
  }

  // Prefer graph nodes that match query terms; deprioritize vendor/minified noise.
  const plan = await planContext({
    root,
    graph,
    query: terms.length ? terms.join(" ") : query,
    budgetTokens: Math.min(options.budgetTokens ?? 6_000, 4_000),
  });
  limitations.push(...plan.limitations);

  const orderedPaths: string[] = [];
  const seenPaths = new Set<string>();
  const pushPath = (p: string): void => {
    const norm = p.replace(/\\/g, "/");
    if (!norm || seenPaths.has(norm) || isControlPlaneRelativePath(norm)) return;
    seenPaths.add(norm);
    orderedPaths.push(norm);
  };

  // 1) Brain-derived source paths (highest priority for module questions)
  for (const p of brainPack.candidateSourcePaths) pushPath(p);
  // 2) Caller include paths
  for (const p of options.includePaths ?? []) pushPath(p);
  // 3) Graph plan — prefer term matches, skip minified/vendor-ish
  const planSorted = [...plan.selected].sort((a, b) => {
    const score = (p: string): number => {
      let s = 0;
      const lower = p.toLowerCase();
      if (terms.some((t) => lower.includes(t.toLowerCase()))) s += 5;
      if (/\.min\.js$/i.test(p) || /node_modules|vendor|assets\/.*\.umd/i.test(p)) s -= 4;
      if (/\.(ts|tsx|js|jsx|py|php|go|rs)$/i.test(p)) s += 1;
      return s;
    };
    return score(b.path) - score(a.path) || b.relevance - a.relevance;
  });
  for (const s of planSorted) pushPath(s.path);

  progress.stage(
    "retrieve",
    "ok",
    `${Math.min(orderedPaths.length, maxSourceFiles)} candidate source${orderedPaths.length === 1 ? "" : "s"}`,
  );

  progress.stage("verify", "start");
  let sourceExcerpts = 0;
  let ownedVerified = 0;
  try {
    for (const rel of orderedPaths) {
      if (sourceExcerpts >= maxSourceFiles) break;
      const citation = await tryReadOwnedExcerpt(root, rel, maxExcerpt);
      if (!citation) continue;
      citations.push(citation);
      if (citation.confidence === "VERIFIED" && citation.excerpt && citation.path) {
        chunks.push(`--- FILE ${citation.path} (VERIFIED excerpt) ---\n${citation.excerpt}`);
        sourceExcerpts += 1;
        ownedVerified += 1;
      }
    }
  } catch (error) {
    progress.stage("verify", "fail", error instanceof Error ? error.message : String(error));
    throw error;
  }
  progress.stage(
    "verify",
    "ok",
    ownedVerified > 0
      ? `${ownedVerified} owned source${ownedVerified === 1 ? "" : "s"}`
      : "no owned source excerpts",
  );

  const hasBrain = brainPack.citations.length > 0;
  const hasVerifiedSource = citations.some(
    (c) => c.confidence === "VERIFIED" && c.evidenceType === "source-code",
  );
  if (!hasBrain && !hasVerifiedSource) {
    citations.push({
      source: "repository",
      evidenceType: "metadata",
      confidence: "UNKNOWN",
      note: "No brain claims or owned source excerpts matched this query within the context budget.",
    });
    limitations.push(
      "No file excerpts retrieved — answer must use UNKNOWN where evidence is missing.",
    );
  } else if (hasBrain && !hasVerifiedSource) {
    limitations.push(
      "Brain structural evidence available; no owned source excerpts resolved for this query.",
    );
  }

  // Compact graph hint: only term-matching nodes (not raw first-N noise).
  const graphHints: string[] = [];
  if (terms.length > 0) {
    const termLower = terms.map((t) => t.toLowerCase());
    for (const n of graph.nodes) {
      if (!n.path || !n.label) continue;
      const blob = `${n.label} ${n.path}`.toLowerCase();
      if (!termLower.some((t) => blob.includes(t))) continue;
      if (/\.min\.js$/i.test(n.path) || /chart\.umd|node_modules/i.test(n.path)) continue;
      graphHints.push(`${n.kind}: ${n.label} @ ${n.path}`);
      if (graphHints.length >= 6) break;
    }
  }
  if (graphHints.length) {
    chunks.push(`--- GRAPH (INFERRED, query-filtered) ---\n${graphHints.join("\n")}`);
    citations.push({
      source: "graph",
      evidenceType: "graph",
      confidence: "INFERRED",
      excerpt: graphHints.join("\n"),
      note: "query-filtered graph nodes",
    });
  }

  const rendered = [
    `Project root: ${root}`,
    `Query: ${query}`,
    `Brain hits: ${brainPack.hits.length}`,
    `Selected source files: ${sourceExcerpts}`,
    `Budget tokens: ${plan.budgetTokens} (plan est. ${plan.estimatedTokens})`,
    "",
    ...chunks,
  ].join("\n");

  return {
    root,
    query,
    citations,
    rendered,
    estimatedTokens: estimateTokens(rendered),
    limitations,
  };
}
