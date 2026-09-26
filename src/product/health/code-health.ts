import path from "node:path";

import { DEFAULT_MAX_FILE_SIZE_BYTES } from "../../constants.js";
import { detectProject } from "../../detectors/project.js";
import { readTextFile } from "../../utils/fs.js";
import { resolveRepoRoot } from "../../utils/path.js";
import type { GitIntelligenceReport } from "../../intelligence/git/analyze.js";
import type { ArchitectureCheckResult } from "../../architecture/contract.js";
import type { ProductEvidence, TruthLabel } from "../truth.js";

export interface CodeHealthIndicator {
  id: string;
  label: string;
  value: number | string;
  truth: TruthLabel;
  evidence: ProductEvidence[];
}

export interface CodeHealthReport {
  root: string;
  indicators: CodeHealthIndicator[];
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
  return (
    p.endsWith(".ts") ||
    p.endsWith(".tsx") ||
    p.endsWith(".js") ||
    p.endsWith(".jsx") ||
    p.endsWith(".py") ||
    p.endsWith(".php") ||
    p.endsWith(".go") ||
    p.endsWith(".rs")
  );
}

async function countTodoFixme(
  root: string,
  files: Array<{ relativePath: string }>,
  maxBytes: number,
): Promise<{ todo: number; fixme: number; evidence: ProductEvidence[] }> {
  let todo = 0;
  let fixme = 0;
  const evidence: ProductEvidence[] = [];
  const re = /\b(TODO|FIXME)\b/g;
  for (const f of files) {
    const text = await readTextFile(path.join(root, f.relativePath), maxBytes);
    if (!text) continue;
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      if (m[1] === "TODO") todo++;
      else fixme++;
      if (evidence.length < 8) {
        const line = text.slice(0, m.index).split("\n").length;
        const excerpt = text.split(/\r?\n/)[line - 1]?.trim().slice(0, 100);
        evidence.push({
          path: f.relativePath.replace(/\\/g, "/"),
          line,
          ...(excerpt !== undefined ? { excerpt } : {}),
        });
      }
    }
  }
  return { todo, fixme, evidence };
}

export async function analyzeCodeHealth(
  rootInput: string,
  options?: {
    gitReport?: GitIntelligenceReport;
    architectureCheck?: ArchitectureCheckResult;
    maxFileSizeBytes?: number;
  },
): Promise<CodeHealthReport> {
  const maxFileSizeBytes = options?.maxFileSizeBytes ?? DEFAULT_MAX_FILE_SIZE_BYTES;
  const root = resolveRepoRoot(rootInput);
  const detection = await detectProject(root, maxFileSizeBytes);
  const paths = detection.discovery.files.map((f) => f.relativePath.replace(/\\/g, "/"));

  const limitations = [
    "Scores are descriptive indicators with evidence; not a single authoritative debt score.",
    "Hotspot overlap requires git intelligence input.",
  ];

  const sourceFiles = paths.filter(isSourcePath);
  const testFiles = paths.filter(isTestPath);
  const {
    todo,
    fixme,
    evidence: todoEvidence,
  } = await countTodoFixme(root, detection.discovery.files, maxFileSizeBytes);

  const indicators: CodeHealthIndicator[] = [
    {
      id: "file-count",
      label: "Discovered files",
      value: paths.length,
      truth: "VERIFIED",
      evidence: [{ path: ".", excerpt: `discovery.files.length=${paths.length}` }],
    },
    {
      id: "source-file-count",
      label: "Source-like files",
      value: sourceFiles.length,
      truth: "INFERRED",
      evidence: [{ path: ".", excerpt: `extension/heuristic count=${sourceFiles.length}` }],
    },
    {
      id: "test-file-count",
      label: "Test-like files",
      value: testFiles.length,
      truth: "INFERRED",
      evidence: [{ path: ".", excerpt: `test path heuristic count=${testFiles.length}` }],
    },
    {
      id: "test-ratio",
      label: "Test file ratio (test / (test+source))",
      value:
        sourceFiles.length + testFiles.length === 0
          ? "n/a"
          : (testFiles.length / (sourceFiles.length + testFiles.length)).toFixed(3),
      truth: "INFERRED",
      evidence: [
        {
          path: ".",
          excerpt: `tests=${testFiles.length}, sources=${sourceFiles.length}`,
        },
      ],
    },
    {
      id: "todo-count",
      label: "TODO markers",
      value: todo,
      truth: "VERIFIED",
      evidence: todoEvidence.filter((e) => e.excerpt?.includes("TODO")),
    },
    {
      id: "fixme-count",
      label: "FIXME markers",
      value: fixme,
      truth: "VERIFIED",
      evidence: todoEvidence.filter((e) => e.excerpt?.includes("FIXME")),
    },
  ];

  if (options?.architectureCheck) {
    indicators.push({
      id: "architecture-violations",
      label: "Architecture contract violations",
      value: options.architectureCheck.violations.length,
      truth: "VERIFIED",
      evidence: options.architectureCheck.violations.slice(0, 5).map((v) => ({
        path: v.fromPath || v.toPath || ".",
        excerpt: `${v.ruleId}: ${v.description}`.slice(0, 120),
      })),
    });
  }

  if (options?.gitReport?.gitAvailable) {
    const hotspotPaths = new Set(options.gitReport.hotspots.map((h) => h.path.replace(/\\/g, "/")));
    const overlap = sourceFiles.filter((p) => hotspotPaths.has(p)).length;
    indicators.push({
      id: "hotspot-source-overlap",
      label: "Source files overlapping git hotspots",
      value: overlap,
      truth: "INFERRED",
      evidence: options.gitReport.hotspots.slice(0, 5).map((h) => ({
        path: h.path,
        excerpt: `commits=${h.commits}`,
      })),
    });
  } else {
    limitations.push("Git hotspot overlap skipped (git unavailable or not provided).");
  }

  return { root, indicators, limitations };
}
