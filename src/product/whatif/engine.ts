import { deriveGraphChangeImpact } from "../../assurance/change.js";
import { buildIntelligenceGraph } from "../../intelligence/graph/build.js";
import {
  assertProjectOwnedRepoPath,
  classifyRelativePathOwnership,
  ProjectOwnershipError,
} from "../../project/ownership.js";
import { PathEscapeError, resolveSafeRepoPath } from "../../security/paths.js";
import { resolveRepoRoot } from "../../utils/path.js";
import type { TruthLabel } from "../truth.js";
import { minProductTruth } from "../truth.js";

export interface WhatIfAffectedItem {
  pathOrSymbol: string;
  role: "changed" | "caller" | "callee" | "reverse-dependency";
  truth: TruthLabel;
}

export interface WhatIfReport {
  root: string;
  target: string;
  affected: WhatIfAffectedItem[];
  limitations: string[];
}

function normalizeTarget(target: string): string {
  return target.replace(/\\/g, "/").replace(/^\.\//, "");
}

async function assertOwnedWhatIfTarget(root: string, target: string): Promise<string> {
  const normalized = normalizeTarget(target);
  const lexical = classifyRelativePathOwnership(normalized);
  if (lexical !== "project_owned") {
    throw new ProjectOwnershipError(
      lexical,
      `what-if target outside project ownership (${lexical})`,
    );
  }
  try {
    const abs = resolveSafeRepoPath(root, normalized);
    await assertProjectOwnedRepoPath(root, abs, normalized);
  } catch (error) {
    if (error instanceof PathEscapeError || error instanceof ProjectOwnershipError) {
      throw error;
    }
    // Non-existent owned path remains a valid hypothetical change target.
  }
  return normalized;
}

export async function analyzeWhatIf(
  rootInput: string,
  target: string,
  options?: {
    graph?: {
      nodes: Array<{ id: string; kind: string; label: string; path?: string }>;
      edges: Array<{ from: string; to: string; kind: string }>;
    };
    buildGraph?: boolean;
  },
): Promise<WhatIfReport> {
  const root = resolveRepoRoot(rootInput);
  const normalized = await assertOwnedWhatIfTarget(root, target);
  const limitations = [
    "Impact analysis uses intelligence graph import/call edges when available.",
    "Symbol-level precision depends on graph node coverage.",
    "What-if targets must be project-owned paths (containment alone is not ownership).",
  ];

  let graph = options?.graph;
  if (!graph && options?.buildGraph !== false) {
    try {
      graph = await buildIntelligenceGraph({ root, mode: "auto" });
    } catch {
      limitations.push("Graph build failed; impact may be empty.");
    }
  }
  if (!graph) {
    limitations.push("No graph provided or built; only the target file is listed.");
    return {
      root,
      target: normalized,
      affected: [
        {
          pathOrSymbol: normalized,
          role: "changed",
          truth: "VERIFIED",
        },
      ],
      limitations,
    };
  }

  const changedFiles = [{ path: normalized, kind: "modified" }];
  const impact = deriveGraphChangeImpact(graph, changedFiles, []);

  const affected: WhatIfAffectedItem[] = [
    {
      pathOrSymbol: normalized,
      role: "changed",
      truth: "VERIFIED",
    },
  ];

  for (const c of impact.callers) {
    affected.push({
      pathOrSymbol: c,
      role: "caller",
      truth: minProductTruth("INFERRED", "PARTIAL"),
    });
  }
  for (const c of impact.callees) {
    affected.push({
      pathOrSymbol: c,
      role: "callee",
      truth: minProductTruth("INFERRED", "PARTIAL"),
    });
  }
  for (const c of impact.reverseDependencies) {
    affected.push({
      pathOrSymbol: c,
      role: "reverse-dependency",
      truth: minProductTruth("INFERRED", "PARTIAL"),
    });
  }

  return { root, target: normalized, affected, limitations };
}
