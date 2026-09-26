import path from "node:path";

import { buildRepositoryGraph } from "../../platform/graph/build.js";
import {
  analyzeTestImpact,
  type AnalyzeTestImpactOptions,
  type TestImpactReport,
} from "../../platform/test-impact/analyze.js";
import type { RepositoryGraph } from "../../platform/types.js";
import { writeJsonArtifact } from "../../platform/store.js";
import { resolveRepoRoot } from "../../utils/path.js";

export type FileTestMappingEvidence = "graph-import" | "naming-heuristic" | "impact-recommendation";

export interface FileTestMapping {
  sourceFile: string;
  testFiles: string[];
  evidence: FileTestMappingEvidence[];
  confidence: number;
}

export interface TestBrainGraphStats {
  testFileNodes: number;
  sourceToTestLinks: number;
  importEdgesFromTests: number;
}

export interface TestBrainReport {
  root: string;
  staticAnalysisLabel: "TECHNICAL_STATIC_ANALYSIS_SUPPORTED";
  testImpact: TestImpactReport;
  fileTestMappings: FileTestMapping[];
  graphStats: TestBrainGraphStats;
  limitations: string[];
}

function isTestPath(file: string): boolean {
  return /\.(test|spec)\./i.test(file) || file.includes("__tests__");
}

function resolveRelativeImport(fromFile: string, specifier: string): string | null {
  if (!specifier.startsWith(".")) return null;
  const dir = path.posix.dirname(fromFile.replace(/\\/g, "/"));
  let resolved = path.posix.normalize(path.posix.join(dir, specifier));
  if (!resolved.startsWith(".")) resolved = resolved.replace(/^\.\//, "");
  return resolved;
}

function sourceCandidatesFromSpecifier(specifier: string, fromTest: string): string[] {
  const base = resolveRelativeImport(fromTest, specifier);
  if (!base) return [];
  const exts = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".py", ".go", ".java", ".kt", ".rs", ".dart"];
  const out = [base];
  if (!path.posix.extname(base)) {
    for (const ext of exts) out.push(`${base}${ext}`);
    out.push(`${base}/index.ts`, `${base}/index.js`);
  }
  return [...new Set(out)];
}

export function mapTestsFromGraph(graph: RepositoryGraph): Map<string, Set<string>> {
  const sourceToTests = new Map<string, Set<string>>();
  const nodesById = new Map(graph.nodes.map((n) => [n.id, n]));
  for (const edge of graph.edges) {
    if (edge.kind !== "imports") continue;
    const fromNode = nodesById.get(edge.from);
    const toNode = nodesById.get(edge.to);
    if (!fromNode?.path || !isTestPath(fromNode.path)) continue;
    const spec = (toNode?.meta?.specifier as string | undefined) ?? toNode?.label ?? "";
    if (!spec || !spec.startsWith(".")) continue;
    for (const candidate of sourceCandidatesFromSpecifier(spec, fromNode.path)) {
      if (!sourceToTests.has(candidate)) sourceToTests.set(candidate, new Set());
      sourceToTests.get(candidate)!.add(fromNode.path);
    }
  }

  return sourceToTests;
}

function mergeMapping(
  map: Map<string, FileTestMapping>,
  sourceFile: string,
  testFile: string,
  evidence: FileTestMappingEvidence,
  confidence: number,
): void {
  const key = sourceFile.replace(/\\/g, "/");
  const existing = map.get(key);
  if (!existing) {
    map.set(key, {
      sourceFile: key,
      testFiles: [testFile],
      evidence: [evidence],
      confidence,
    });
    return;
  }
  if (!existing.testFiles.includes(testFile)) existing.testFiles.push(testFile);
  if (!existing.evidence.includes(evidence)) existing.evidence.push(evidence);
  existing.confidence = Math.max(existing.confidence, confidence);
  existing.testFiles.sort();
}

/**
 * Test Brain — combines git test-impact with repository graph test↔source import links.
 * Does not execute tests.
 */
export async function analyzeTestBrain(
  rootInput: string | AnalyzeTestImpactOptions,
  maybeOptions?: AnalyzeTestImpactOptions,
): Promise<TestBrainReport> {
  const options: AnalyzeTestImpactOptions =
    typeof rootInput === "string" ? { ...(maybeOptions ?? {}), root: rootInput } : rootInput;
  const root = resolveRepoRoot(options.root ?? process.cwd());

  const limitations = [
    "Test Brain wraps test-impact plus graph import heuristics — not mutation testing or coverage oracle.",
    "Graph file↔test links are import-based for test files only; missing imports are not proven absence of tests.",
  ];

  const testImpact = await analyzeTestImpact(options);
  const graph = await buildRepositoryGraph(root);
  const graphMap = mapTestsFromGraph(graph);

  const mappingBySource = new Map<string, FileTestMapping>();

  for (const [source, tests] of graphMap) {
    for (const testFile of tests) {
      mergeMapping(mappingBySource, source, testFile, "graph-import", 0.85);
    }
  }

  for (const changed of testImpact.changedFiles) {
    if (isTestPath(changed)) continue;
    const normalized = changed.replace(/\\/g, "/");
    for (const rec of testImpact.recommendedTests) {
      if (!rec.reason.includes(normalized)) continue;
      const evidence: FileTestMappingEvidence =
        rec.evidence === "verified" ? "impact-recommendation" : "naming-heuristic";
      mergeMapping(mappingBySource, normalized, rec.testPath, evidence, rec.confidence);
    }
  }

  const fileTestMappings = [...mappingBySource.values()].sort((a, b) =>
    a.sourceFile.localeCompare(b.sourceFile),
  );

  const testFileNodes = graph.nodes.filter((n) => n.kind === "test").length;
  let importEdgesFromTests = 0;
  const nodesById = new Map(graph.nodes.map((n) => [n.id, n]));
  for (const edge of graph.edges) {
    if (edge.kind !== "imports") continue;
    const fromNode = nodesById.get(edge.from);
    if (fromNode?.path && isTestPath(fromNode.path)) importEdgesFromTests += 1;
  }

  return {
    root,
    staticAnalysisLabel: "TECHNICAL_STATIC_ANALYSIS_SUPPORTED",
    testImpact,
    fileTestMappings,
    graphStats: {
      testFileNodes,
      sourceToTestLinks: fileTestMappings.reduce((n, m) => n + m.testFiles.length, 0),
      importEdgesFromTests,
    },
    limitations: [...limitations, ...testImpact.limitations, ...graph.limitations.slice(0, 2)],
  };
}

export async function persistTestBrainReport(
  rootInput: string,
  report: TestBrainReport,
): Promise<string> {
  const root = resolveRepoRoot(rootInput);
  return writeJsonArtifact(root, "reports/test-brain.json", report);
}
