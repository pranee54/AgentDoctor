import { buildC4Views } from "../../architecture/c4.js";
import { checkArchitectureAtRoot } from "../../architecture/contract.js";
import { analyzeChange, inspectEvidence } from "../../assurance/change.js";
import { inspectProof } from "../../assurance/proof.js";
import { buildIntelligenceGraph } from "../../intelligence/graph/build.js";
import { graphStatus } from "../../intelligence/graph/incremental.js";
import { analyzeGitIntelligence } from "../../intelligence/git/analyze.js";
import { listKnowledge, retrieveAuthoritative } from "../../knowledge/store.js";
import {
  analyzeRenameImpact,
  analyzeTestImpact,
  buildRepositoryGraph,
  evaluateAgentAction,
} from "../../platform/index.js";
import { redactSecrets } from "../../platform/security/redact.js";
import { resolveRepoRoot } from "../../utils/path.js";
import { CONTRACTS_VERSION } from "../../contracts/index.js";
import { assertSafeRepoTarget } from "./path-safety.js";
import { buildProjectDna } from "../../product/dna/build.js";
import { buildSoftwareMap } from "../../product/map/software-map.js";
import { analyzeWhatIf } from "../../product/whatif/engine.js";

function requireString(args: Record<string, unknown>, key: string): string | null {
  const value = args[key];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function redactDeep(value: unknown): unknown {
  if (typeof value === "string") {
    return redactSecrets(value).text;
  }
  if (Array.isArray(value)) {
    return value.map(redactDeep);
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = redactDeep(v);
    }
    return out;
  }
  return value;
}

function invalidArgument(message: string): { ok: false; error: { code: string; message: string } } {
  return { ok: false, error: { code: "invalid_argument", message } };
}

function pathEscape(): { ok: false; error: { code: string; message: string } } {
  return { ok: false, error: { code: "path_escape", message: "path escapes repository root" } };
}

export async function handleRepoOverview(rootInput: string): Promise<unknown> {
  const root = resolveRepoRoot(rootInput);
  const graph = await buildIntelligenceGraph({ root, mode: "auto" });
  return redactDeep({
    ok: true,
    contractsVersion: CONTRACTS_VERSION,
    root,
    builder: graph.builder,
    nodeCount: graph.nodes.length,
    edgeCount: graph.edges.length,
    limitations: graph.limitations,
  });
}

export async function handleCodebaseSearch(
  rootInput: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  const root = resolveRepoRoot(rootInput);
  const query = requireString(args, "query")?.toLowerCase() ?? "";
  if (!query) {
    return invalidArgument("query required");
  }
  const graph = await buildIntelligenceGraph({ root, mode: "auto" });
  const hits = graph.nodes
    .filter(
      (n) =>
        n.label.toLowerCase().includes(query) ||
        n.id.toLowerCase().includes(query) ||
        (n.path ?? "").toLowerCase().includes(query),
    )
    .slice(0, 50);
  return redactDeep({
    ok: true,
    query,
    hits,
    confidence: graph.builder === "typescript-ast" ? 0.85 : 0.55,
    evidenceKind: graph.builder === "typescript-ast" ? "observed" : "inferred",
    limitations: graph.limitations,
  });
}

export async function handleSymbolLookup(
  rootInput: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  const root = resolveRepoRoot(rootInput);
  const name = requireString(args, "name");
  if (!name) {
    return invalidArgument("name required");
  }
  const graph = await buildIntelligenceGraph({ root, mode: "auto" });
  const matches = graph.nodes.filter(
    (n) =>
      (n.kind === "function" || n.kind === "class" || n.kind === "module") &&
      (n.label === name || n.label.endsWith(`.${name}`)),
  );
  return redactDeep({
    ok: true,
    name,
    matches,
    confidence: matches.length > 0 ? 0.8 : 0.2,
    limitations: ["Import/call resolution is best-effort; unsupported languages omitted."],
  });
}

export async function handleDependencyLookup(
  rootInput: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  const root = resolveRepoRoot(rootInput);
  const target = requireString(args, "target");
  if (!target) {
    return invalidArgument("target required");
  }
  let safeRelative: string | null = null;
  try {
    safeRelative = assertSafeRepoTarget(root, target);
  } catch {
    return pathEscape();
  }
  const graph = await buildIntelligenceGraph({ root, mode: "auto" });
  const lookupKeys = [target, safeRelative].filter((v): v is string => Boolean(v));
  const node = graph.nodes.find(
    (n) =>
      lookupKeys.includes(n.id) ||
      (n.path !== undefined && lookupKeys.includes(n.path)) ||
      lookupKeys.includes(n.label),
  );
  if (!node) {
    return redactDeep({ ok: true, target, edges: [], limitations: ["Target not found in graph"] });
  }
  const edges = graph.edges.filter((e) => e.from === node.id || e.to === node.id);
  return redactDeep({ ok: true, target: node, edges, confidence: 0.75 });
}

export async function handleCallGraphLookup(
  rootInput: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  const root = resolveRepoRoot(rootInput);
  const symbol = requireString(args, "symbol");
  if (!symbol) {
    return invalidArgument("symbol required");
  }
  const graph = await buildIntelligenceGraph({ root, mode: "auto" });
  const calls = graph.edges.filter(
    (e) => e.kind === "calls" && (e.from.includes(symbol) || e.to.includes(symbol)),
  );
  return redactDeep({
    ok: true,
    symbol,
    calls,
    confidence: graph.builder === "typescript-ast" ? 0.7 : 0.4,
    limitations: ["Call edges may be incomplete for dynamic/dispatch patterns."],
  });
}

export async function handleTestImpactTool(rootInput: string): Promise<unknown> {
  const root = resolveRepoRoot(rootInput);
  const impact = await analyzeTestImpact(root);
  return redactDeep({
    ok: true,
    impact,
    resultKind: impact.gitAvailable ? "graph-inferred" : "unknown",
    limitations: ["Coverage-backed mapping requires external coverage data (not bundled)."],
  });
}

export async function handleRefactorImpactTool(
  rootInput: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  const root = resolveRepoRoot(rootInput);
  const symbol = requireString(args, "symbol");
  if (!symbol) {
    return invalidArgument("symbol required");
  }
  const graph = await buildRepositoryGraph(root);
  const impact = await analyzeRenameImpact({ root, symbol, graph });
  return redactDeep({ ok: true, impact });
}

export async function handleCodeHealthTool(rootInput: string): Promise<unknown> {
  const root = resolveRepoRoot(rootInput);
  const report = await analyzeGitIntelligence(root);
  return redactDeep({
    ok: true,
    report,
    methodDisclosure: report.hotspots[0]?.method ?? "see per-metric method fields",
    limitations: report.limitations,
  });
}

export async function handleArchitectureTool(rootInput: string): Promise<unknown> {
  const root = resolveRepoRoot(rootInput);
  const graph = await buildIntelligenceGraph({ root, mode: "auto" });
  const views = buildC4Views(graph);
  return redactDeep({
    ok: true,
    views,
    label: "Inferred/proposed from graph evidence — not approved architecture facts",
  });
}

export async function handleKnowledgeTool(
  rootInput: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  const root = resolveRepoRoot(rootInput);
  const list = await listKnowledge(root);
  const query = typeof args.query === "string" ? args.query.trim() : "";
  if (!query) {
    return redactDeep({
      ok: true,
      records: list.filter((r) => r.status === "approved").slice(0, 50),
    });
  }
  const result = retrieveAuthoritative(list, query);
  return redactDeep({ ok: true, ...result });
}

export async function handlePolicyEvalTool(
  rootInput: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  const root = resolveRepoRoot(rootInput);
  const command = requireString(args, "command");
  if (!command) {
    return invalidArgument("command required");
  }
  const verdict = await evaluateAgentAction(root, {
    actionId: `mcp_${Date.now()}`,
    agentId: "agentdoctor-mcp",
    timestamp: new Date().toISOString(),
    type: "shell",
    params: { command },
    repositoryRoot: root,
  });
  return redactDeep({
    ok: true,
    verdict,
    executionResult: "not-executed",
    notice: "Evaluate-only: AgentDoctor MCP does not execute shell commands.",
  });
}

export async function handleChangeAnalyzeTool(
  rootInput: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  const root = resolveRepoRoot(rootInput);
  const since = typeof args.since === "string" && args.since.trim() ? args.since.trim() : undefined;
  const changeId =
    typeof args.changeId === "string" && args.changeId.trim() ? args.changeId.trim() : undefined;
  if (args.coveragePath !== undefined) {
    if (typeof args.coveragePath !== "string" || !args.coveragePath.trim()) {
      return invalidArgument("coveragePath must be a non-empty string when provided");
    }
    try {
      assertSafeRepoTarget(root, args.coveragePath);
    } catch {
      return pathEscape();
    }
  }
  const assessment = await analyzeChange({
    root,
    ...(since ? { since } : {}),
    ...(changeId ? { changeId } : {}),
    ...(typeof args.coveragePath === "string" ? { coveragePath: args.coveragePath } : {}),
  });
  return redactDeep({
    ok: true,
    assessment,
    limitations: assessment.limitations,
  });
}

export async function handleArchitectureCheckTool(rootInput: string): Promise<unknown> {
  const root = resolveRepoRoot(rootInput);
  const graph = await buildRepositoryGraph(root);
  const result = await checkArchitectureAtRoot(root, graph);
  return redactDeep({
    ok: true,
    result,
    violationCount: result.violations.length,
  });
}

export async function handleProofInspectTool(
  rootInput: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  const root = resolveRepoRoot(rootInput);
  const id = requireString(args, "id");
  if (!id) {
    return invalidArgument("id required");
  }
  if (id.includes("/") || id.includes("\\") || id.includes("..")) {
    try {
      assertSafeRepoTarget(root, id);
    } catch {
      return pathEscape();
    }
  }
  const inspected = await inspectProof(root, id);
  if (!inspected.ok) {
    return {
      ok: false,
      error: { code: "not_found", message: inspected.error ?? "proof not found" },
    };
  }
  return redactDeep({
    ok: true,
    proof: inspected.proof,
    path: inspected.path,
    notice: "Integrity/inspect only — engineering correctness is not claimed",
  });
}

export async function handleEvidenceInspectTool(
  rootInput: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  const root = resolveRepoRoot(rootInput);
  const changeId = requireString(args, "changeId");
  if (!changeId) {
    return invalidArgument("changeId required");
  }
  if (changeId.includes("/") || changeId.includes("\\") || changeId.includes("..")) {
    try {
      assertSafeRepoTarget(root, changeId);
    } catch {
      return pathEscape();
    }
  }
  const inspected = await inspectEvidence({ root, changeId });
  if (!inspected.ok) {
    return {
      ok: false,
      error: { code: "not_found", message: inspected.error ?? "evidence not found" },
    };
  }
  return redactDeep({
    ok: true,
    directory: inspected.directory,
    manifest: inspected.manifest,
    presentFiles: inspected.presentFiles,
  });
}

export async function handleGraphQueryTool(
  rootInput: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  const root = resolveRepoRoot(rootInput);
  const query = requireString(args, "query");
  if (!query) {
    return invalidArgument("query required");
  }
  const kindFilter =
    typeof args.kind === "string" && args.kind.trim() ? args.kind.trim().toLowerCase() : null;
  const limitRaw = args.limit;
  const limit =
    typeof limitRaw === "number" && Number.isFinite(limitRaw)
      ? Math.max(1, Math.min(100, Math.floor(limitRaw)))
      : 25;

  if (args.path !== undefined) {
    if (typeof args.path !== "string" || !args.path.trim()) {
      return invalidArgument("path must be a non-empty string when provided");
    }
    try {
      assertSafeRepoTarget(root, args.path);
    } catch {
      return pathEscape();
    }
  }

  const graph = await buildIntelligenceGraph({ root, mode: "auto" });
  const status = await graphStatus({ root });
  const q = query.toLowerCase();
  const pathFilter =
    typeof args.path === "string" ? args.path.trim().toLowerCase().replace(/\\/g, "/") : null;

  const nodes = graph.nodes
    .filter((n) => {
      if (kindFilter && n.kind.toLowerCase() !== kindFilter) return false;
      if (pathFilter && !(n.path ?? "").toLowerCase().includes(pathFilter)) return false;
      return (
        n.id.toLowerCase().includes(q) ||
        n.label.toLowerCase().includes(q) ||
        (n.path ?? "").toLowerCase().includes(q)
      );
    })
    .slice(0, limit);

  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges = graph.edges
    .filter(
      (e) =>
        nodeIds.has(e.from) ||
        nodeIds.has(e.to) ||
        e.from.toLowerCase().includes(q) ||
        e.to.toLowerCase().includes(q) ||
        e.kind.toLowerCase().includes(q),
    )
    .slice(0, limit);

  return redactDeep({
    ok: true,
    query,
    kind: kindFilter,
    path: pathFilter,
    nodes,
    edges,
    index: {
      present: status.present,
      nodeCount: status.nodeCount,
      edgeCount: status.edgeCount,
      corrupt: status.corrupt ?? false,
    },
    limitations: [
      "Query is substring match over in-memory / rebuilt graph — not a production graph DB",
      ...graph.limitations,
    ],
  });
}

export async function handleProjectDnaTool(rootInput: string): Promise<unknown> {
  const root = resolveRepoRoot(rootInput);
  const dna = await buildProjectDna(root);
  return redactDeep({ ok: true, dna, limitations: dna.limitations });
}

export async function handleSoftwareMapTool(rootInput: string): Promise<unknown> {
  const root = resolveRepoRoot(rootInput);
  const map = await buildSoftwareMap(root);
  return redactDeep({ ok: true, map, limitations: map.limitations });
}

export async function handleWhatIfTool(
  rootInput: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  const root = resolveRepoRoot(rootInput);
  const target = requireString(args, "target");
  if (!target) {
    return invalidArgument("target required (repo-relative path or symbol)");
  }
  try {
    assertSafeRepoTarget(root, target);
  } catch {
    return pathEscape();
  }
  const report = await analyzeWhatIf(root, target);
  return redactDeep({ ok: true, report, limitations: report.limitations });
}
