import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

import type { GraphEdge, GraphNode, RepositoryGraph } from "../../platform/types.js";
import { getAdapterForFile, parseSourceFile } from "../../languages/index.js";
import type { LanguageId } from "../../languages/types.js";
import { readTextFile } from "../../utils/fs.js";
import { resolveRepoRoot, toPosixRelative } from "../../utils/path.js";

function nodeId(kind: string, key: string): string {
  return `${kind}:${createHash("sha1").update(key).digest("hex").slice(0, 12)}`;
}

const LANG_FILE_RE = /\.(py|php|go|java|kt|kts|rs|dart)$/i;

export interface LanguageGraphEnrichmentStats {
  filesAttempted: number;
  filesParsed: number;
  filesSkippedUnsupported: number;
  nodesAdded: number;
  edgesAdded: number;
  byLanguage: Partial<Record<LanguageId, number>>;
  limitations: string[];
}

async function listLanguageSourceFiles(root: string, limit = 120): Promise<string[]> {
  const out: string[] = [];
  const skip = new Set(["node_modules", ".git", "dist", "coverage", ".agentdoctor", "vendor"]);
  async function walk(dir: string): Promise<void> {
    if (out.length >= limit) return;
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (out.length >= limit) return;
      if (skip.has(e.name)) continue;
      const abs = path.join(dir, e.name);
      if (e.isSymbolicLink()) continue;
      if (e.isDirectory()) {
        await walk(abs);
        continue;
      }
      if (LANG_FILE_RE.test(e.name)) {
        out.push(abs);
      }
    }
  }
  await walk(root);
  return out.sort();
}

function evidenceFromAdapter(kind: "ast" | "unsupported"): "verified" | "inferred" | "unknown" {
  if (kind === "ast") return "verified";
  return "unknown";
}

/**
 * Walk a bounded set of Python/PHP/Go sources and merge adapter symbols/imports/calls into the graph.
 */
export async function enrichGraphWithLanguageAdapters(
  graph: RepositoryGraph,
  rootInput: string,
  options?: { maxFiles?: number },
): Promise<{ graph: RepositoryGraph; stats: LanguageGraphEnrichmentStats }> {
  const root = resolveRepoRoot(rootInput);
  const maxFiles = options?.maxFiles ?? 120;
  const limitations: string[] = [
    "Language enrichment covers .py/.php/.go/.java/.kt/.kts/.rs/.dart, capped file budget, skips unsupported adapters.",
    "Symbol/call edges from language adapters may be partial — evidence follows adapter (ast→verified, else unknown).",
  ];

  const existingNodeIds = new Set(graph.nodes.map((n) => n.id));
  const existingEdgeIds = new Set(graph.edges.map((e) => e.id));
  const nodes: GraphNode[] = [...graph.nodes];
  const edges: GraphEdge[] = [...graph.edges];

  const pushNode = (n: GraphNode) => {
    if (existingNodeIds.has(n.id)) return;
    existingNodeIds.add(n.id);
    nodes.push(n);
  };
  const pushEdge = (e: GraphEdge) => {
    if (existingEdgeIds.has(e.id)) return;
    existingEdgeIds.add(e.id);
    edges.push(e);
  };

  const nodesBefore = nodes.length;
  const edgesBefore = edges.length;
  const byLanguage: Partial<Record<LanguageId, number>> = {};
  let filesAttempted = 0;
  let filesParsed = 0;
  let filesSkippedUnsupported = 0;

  const files = await listLanguageSourceFiles(root, maxFiles);
  if (files.length >= maxFiles) {
    limitations.push(`Language file walk capped at ${maxFiles} files`);
  }

  for (const absolute of files) {
    filesAttempted += 1;
    const rel = toPosixRelative(root, absolute);
    const adapter = getAdapterForFile(rel);
    if (!adapter) {
      filesSkippedUnsupported += 1;
      continue;
    }
    const caps = adapter.capabilities();
    if (caps.parse !== "supported") {
      filesSkippedUnsupported += 1;
      continue;
    }

    const source = await readTextFile(absolute, 512 * 1024);
    if (source === null) continue;

    const parsed = await parseSourceFile(rel, source);
    if (!parsed.ok) {
      limitations.push(`Parse failed for ${rel}: ${parsed.diagnostics[0] ?? "unknown"}`);
      continue;
    }

    filesParsed += 1;
    byLanguage[parsed.language] = (byLanguage[parsed.language] ?? 0) + 1;

    const fileId = nodeId("file", rel);
    pushNode({ id: fileId, kind: "file", label: path.basename(rel), path: rel });

    for (const sym of parsed.symbols) {
      if (sym.evidence === "unsupported") continue;
      const symId = nodeId("function", `${rel}:${sym.name}:${sym.kind}`);
      pushNode({
        id: symId,
        kind: sym.kind === "class" ? "class" : "function",
        label: sym.name,
        path: rel,
        meta: {
          parser: `language-${parsed.language}`,
          symbolKind: sym.kind,
        },
      });
      pushEdge({
        id: nodeId("edge", `${fileId}->${symId}`),
        from: fileId,
        to: symId,
        kind: "defines",
        evidence: evidenceFromAdapter(sym.evidence),
      });
    }

    for (const imp of parsed.imports) {
      if (imp.evidence === "unsupported") continue;
      const depId = nodeId("dependency", `${rel}->${imp.specifier}`);
      pushNode({
        id: depId,
        kind: "dependency",
        label: imp.specifier,
        path: rel,
        meta: { parser: `language-${parsed.language}`, specifier: imp.specifier },
      });
      pushEdge({
        id: nodeId("edge", `${fileId}->${depId}`),
        from: fileId,
        to: depId,
        kind: "imports",
        evidence: evidenceFromAdapter(imp.evidence),
      });
    }

    for (const call of parsed.calls) {
      if (call.evidence === "unsupported") continue;
      const callId = nodeId("function", `call:${rel}:${call.callee}`);
      pushNode({
        id: callId,
        kind: "function",
        label: call.callee,
        path: rel,
        meta: { callSite: true, parser: `language-${parsed.language}` },
      });
      pushEdge({
        id: nodeId("edge", `${fileId}->call:${call.callee}:${call.callee}`),
        from: fileId,
        to: callId,
        kind: "calls",
        evidence: "inferred",
      });
    }
  }

  nodes.sort((a, b) => a.id.localeCompare(b.id));
  edges.sort((a, b) => a.id.localeCompare(b.id));

  if (filesParsed === 0 && filesAttempted > 0 && filesSkippedUnsupported === filesAttempted) {
    limitations.push(
      "No supported language adapters available for discovered multi-language source files.",
    );
  }

  return {
    graph: {
      ...graph,
      nodes,
      edges,
      limitations: [...graph.limitations, ...limitations],
    },
    stats: {
      filesAttempted,
      filesParsed,
      filesSkippedUnsupported,
      nodesAdded: nodes.length - nodesBefore,
      edgesAdded: edges.length - edgesBefore,
      byLanguage,
      limitations,
    },
  };
}
