import { deriveGraphChangeImpact } from "../../assurance/change.js";
import { buildIntelligenceGraph } from "../../intelligence/graph/build.js";
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
  const normalized = normalizeTarget(target);
  const limitations = [
    "Impact analysis uses intelligence graph import/call edges when available.",
    "Symbol-level precision depends on graph node coverage.",
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
