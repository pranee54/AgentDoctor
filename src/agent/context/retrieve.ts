import fs from "node:fs/promises";
import path from "node:path";

import { planContext } from "../../platform/tokens/plan.js";
import { buildIntelligenceGraph } from "../../intelligence/graph/build.js";
import { assertProjectOwnedRepoPath, ProjectOwnershipError } from "../../project/ownership.js";
import { resolveRepoRoot } from "../../utils/path.js";
import { resolveSafeRepoPath, PathEscapeError } from "../../security/paths.js";
import type { ContextBundle, ContextCitation } from "./types.js";
import type { RepositoryGraph } from "../../platform/types.js";

export interface RetrieveContextOptions {
  root: string;
  query: string;
  budgetTokens?: number;
  /** Optional relative paths the caller already wants included */
  includePaths?: string[];
  maxExcerptChars?: number;
  /** Reuse a previously built graph (session cache) */
  graph?: RepositoryGraph & { builder?: string; astFilesParsed?: number };
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Retrieve a budgeted project context pack for the agent.
 * Reuses graph + planContext. Does not invent facts.
 * Hostile paths are rejected via resolveSafeRepoPath + project ownership
 * (containment alone must not promote .private / AgentDoctorOS / nested repos).
 */
export async function retrieveProjectContext(
  options: RetrieveContextOptions,
): Promise<ContextBundle> {
  const root = resolveRepoRoot(options.root);
  const query = options.query.trim() || "project overview";
  const maxExcerpt = options.maxExcerptChars ?? 1_200;
  const citations: ContextCitation[] = [];
  const limitations: string[] = [];
  const chunks: string[] = [];

  let graph = options.graph;
  try {
    if (!graph) {
      graph = await buildIntelligenceGraph({ root, mode: "auto" });
    }
  } catch (error) {
    limitations.push(
      `Graph unavailable: ${error instanceof Error ? error.message : String(error)}`,
    );
    return {
      root,
      query,
      citations: [
        {
          source: "repository",
          evidenceType: "metadata",
          confidence: "UNKNOWN",
          note: "Repository graph could not be built for this query.",
        },
      ],
      rendered: `Query: ${query}\n(No graph context available.)`,
      estimatedTokens: 32,
      limitations,
    };
  }

  const plan = await planContext({
    root,
    graph,
    query,
    budgetTokens: options.budgetTokens ?? 6_000,
  });
  limitations.push(...plan.limitations);

  const paths = new Set<string>(plan.selected.map((s) => s.path));
  for (const p of options.includePaths ?? []) {
    paths.add(p);
  }

  for (const rel of paths) {
    try {
      const abs = resolveSafeRepoPath(root, rel);
      await assertProjectOwnedRepoPath(root, abs, rel);
      const text = await fs.readFile(abs, "utf8");
      const excerpt = text.slice(0, maxExcerpt);
      const citation: ContextCitation = {
        source: "repository",
        path: rel.split(path.sep).join("/"),
        evidenceType: "source-code",
        confidence: "VERIFIED",
        excerpt,
      };
      citations.push(citation);
      chunks.push(`--- FILE ${citation.path} (VERIFIED excerpt) ---\n${excerpt}`);
    } catch (error) {
      if (error instanceof PathEscapeError) {
        citations.push({
          source: "repository",
          path: rel,
          evidenceType: "metadata",
          confidence: "UNKNOWN",
          note: "path_escape: rejected",
        });
        continue;
      }
      if (error instanceof ProjectOwnershipError) {
        citations.push({
          source: "repository",
          path: rel,
          evidenceType: "metadata",
          confidence: "UNKNOWN",
          note: `ownership_denied: ${error.ownership}`,
        });
        continue;
      }
      citations.push({
        source: "repository",
        path: rel,
        evidenceType: "metadata",
        confidence: "UNKNOWN",
        note: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (citations.length === 0) {
    citations.push({
      source: "repository",
      evidenceType: "metadata",
      confidence: "UNKNOWN",
      note: "No files selected for this query within the token budget.",
    });
    limitations.push(
      "No file excerpts retrieved — answer must use UNKNOWN where evidence is missing.",
    );
  }

  const rendered = [
    `Project root: ${root}`,
    `Query: ${query}`,
    `Selected files: ${plan.selected.length}`,
    `Budget tokens: ${plan.budgetTokens} (est. used ${plan.estimatedTokens})`,
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
