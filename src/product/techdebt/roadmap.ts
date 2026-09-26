import path from "node:path";

import { checkArchitectureAtRoot } from "../../architecture/contract.js";
import { detectProject } from "../../detectors/project.js";
import { buildRepositoryGraph } from "../../platform/graph/build.js";
import { readTextFile } from "../../utils/fs.js";
import { resolveRepoRoot } from "../../utils/path.js";
import type { ProductEvidence, TruthLabel } from "../truth.js";

export interface TechnicalDebtItem {
  id: string;
  category: "todo" | "fixme" | "architecture" | "testing";
  summary: string;
  truth: TruthLabel;
  evidence: ProductEvidence[];
}

export interface TechnicalDebtRoadmap {
  root: string;
  items: TechnicalDebtItem[];
  metrics: {
    todoCount: number;
    fixmeCount: number;
    testRatio: number | null;
    architectureViolations: number;
  };
  limitations: string[];
}

function isTestPath(relativePath: string): boolean {
  const p = relativePath.toLowerCase();
  return (
    p.includes(".test.") ||
    p.includes(".spec.") ||
    p.startsWith("tests/") ||
    p.startsWith("test/") ||
    p.includes("__tests__/")
  );
}

function isSourcePath(relativePath: string): boolean {
  const p = relativePath.toLowerCase();
  if (isTestPath(p)) return false;
  return /\.(ts|tsx|js|jsx|py|php|go|rs)$/i.test(p);
}

export async function buildTechnicalDebtRoadmap(rootInput: string): Promise<TechnicalDebtRoadmap> {
  const root = resolveRepoRoot(rootInput);
  const limitations = [
    "Roadmap aggregates TODO/FIXME markers, architecture contract violations, and test-ratio heuristics.",
    "Not a substitute for issue trackers or formal debt scoring.",
  ];

  const detection = await detectProject(root);
  const paths = detection.discovery.files.map((f) => f.relativePath.replace(/\\/g, "/"));
  const sourceFiles = paths.filter(isSourcePath);
  const testFiles = paths.filter(isTestPath);

  let todoCount = 0;
  let fixmeCount = 0;
  const items: TechnicalDebtItem[] = [];
  const re = /\b(TODO|FIXME)\b(:[^\n]*)?/g;

  for (const rel of paths) {
    const text = await readTextFile(path.join(root, rel), 256 * 1024);
    if (text === null) continue;
    re.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      const kind = match[1] === "FIXME" ? "fixme" : "todo";
      if (kind === "todo") todoCount++;
      else fixmeCount++;
      if (items.filter((i) => i.category === kind).length < 15) {
        const line = text.slice(0, match.index).split("\n").length;
        items.push({
          id: `${kind}-${rel}-${line}`,
          category: kind,
          summary: (match[0] ?? kind).trim().slice(0, 100),
          truth: "VERIFIED",
          evidence: [
            {
              path: rel,
              line,
              ...((): { excerpt?: string } => {
                const excerpt = text.split(/\r?\n/)[line - 1]?.trim().slice(0, 120);
                return excerpt !== undefined && excerpt.length > 0 ? { excerpt } : {};
              })(),
            },
          ],
        });
      }
    }
  }

  let architectureViolations = 0;
  try {
    const graph = await buildRepositoryGraph(root);
    const arch = await checkArchitectureAtRoot(root, graph);
    architectureViolations = arch.violations.length;
    for (const v of arch.violations.slice(0, 10)) {
      items.push({
        id: `arch-${v.ruleId}-${v.fromPath ?? v.toPath ?? "root"}`,
        category: "architecture",
        summary: v.description.slice(0, 120),
        truth: "VERIFIED",
        evidence: [
          {
            path: v.fromPath || v.toPath || ".",
            excerpt: `${v.ruleId}: ${v.description}`.slice(0, 120),
          },
        ],
      });
    }
  } catch {
    limitations.push("Architecture contract check unavailable or failed.");
  }

  const denom = sourceFiles.length + testFiles.length;
  const testRatio = denom === 0 ? null : testFiles.length / denom;

  if (testRatio !== null && testRatio < 0.15) {
    items.push({
      id: "testing-low-ratio",
      category: "testing",
      summary: `Low test-file ratio (${testRatio.toFixed(3)}) — consider adding tests`,
      truth: "INFERRED",
      evidence: [
        {
          path: ".",
          excerpt: `tests=${testFiles.length}, sources=${sourceFiles.length}`,
        },
      ],
    });
  }

  return {
    root,
    items,
    metrics: {
      todoCount,
      fixmeCount,
      testRatio,
      architectureViolations,
    },
    limitations,
  };
}
