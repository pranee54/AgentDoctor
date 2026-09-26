import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import ts from "typescript";

import { resolveRepoRoot, toPosixRelative } from "../../utils/path.js";
import type { GraphEdge, GraphNode, RepositoryGraph } from "../../platform/types.js";
import { buildRepositoryGraph } from "../../platform/graph/build.js";
import { CONTRACTS_VERSION } from "../../contracts/index.js";
import {
  loadTsconfigPaths,
  resolveImportSpecifier,
  type ImportConfidence,
} from "../resolve/imports.js";
import { enrichGraphWithLanguageAdapters } from "../../product/graph/enrich-languages.js";

function evidenceForConfidence(confidence: ImportConfidence): "verified" | "inferred" | "unknown" {
  if (confidence === "EXACT") return "verified";
  if (confidence === "RESOLVED" || confidence === "INFERRED") return "inferred";
  return "unknown";
}

export type GraphBuilderMode = "regex" | "typescript-ast" | "auto";

export function nodeId(kind: string, key: string): string {
  return `${kind}:${createHash("sha1").update(key).digest("hex").slice(0, 12)}`;
}

async function applyLanguageEnrichment<
  T extends RepositoryGraph & { builder: GraphBuilderMode; astFilesParsed: number },
>(graph: T, root: string): Promise<T> {
  try {
    const { graph: enriched, stats } = await enrichGraphWithLanguageAdapters(graph, root);
    const extra =
      stats.filesParsed > 0
        ? [
            `Language adapters enriched graph (+${stats.nodesAdded} nodes, +${stats.edgesAdded} edges, ${stats.filesParsed} files parsed)`,
          ]
        : stats.filesAttempted > 0
          ? ["Language adapter enrichment: no supported parses in sampled .py/.php/.go files"]
          : [];
    return {
      ...enriched,
      builder: graph.builder,
      astFilesParsed: graph.astFilesParsed,
      limitations: [...enriched.limitations, ...extra],
    } as T;
  } catch (error) {
    return {
      ...graph,
      limitations: [
        ...graph.limitations,
        `Language adapter enrichment failed (${error instanceof Error ? error.message : String(error)})`,
      ],
    } as T;
  }
}

export async function listTsFiles(root: string, limit = 400): Promise<string[]> {
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
      if (skip.has(e.name)) continue;
      const abs = path.join(dir, e.name);
      if (e.isSymbolicLink()) continue;
      if (e.isDirectory()) {
        await walk(abs);
        continue;
      }
      if (/\.(ts|tsx|mts|cts)$/i.test(e.name) && !e.name.endsWith(".d.ts")) {
        out.push(abs);
      }
    }
  }
  await walk(root);
  return out.sort();
}

/**
 * TypeScript compiler API based graph enrichment.
 * Falls back to regex graph when mode=regex or on failure.
 */
export async function buildIntelligenceGraph(options: {
  root: string;
  mode?: GraphBuilderMode;
}): Promise<RepositoryGraph & { builder: GraphBuilderMode; astFilesParsed: number }> {
  const root = resolveRepoRoot(options.root);
  const mode = options.mode ?? "auto";
  if (mode === "regex") {
    const g = await buildRepositoryGraph(root);
    return applyLanguageEnrichment({ ...g, builder: "regex", astFilesParsed: 0 }, root);
  }

  try {
    const files = await listTsFiles(root);
    if (files.length === 0) {
      const g = await buildRepositoryGraph(root);
      return applyLanguageEnrichment(
        {
          ...g,
          builder: "regex",
          astFilesParsed: 0,
          limitations: [
            ...g.limitations,
            "No TypeScript sources found for AST builder; used regex fallback",
          ],
        },
        root,
      );
    }

    const program = ts.createProgram({
      rootNames: files,
      options: {
        allowJs: false,
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        skipLibCheck: true,
        noEmit: true,
      },
    });

    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const seen = new Set<string>();
    // TypeScript uses `/` on Windows; path.join uses `\`. Normalize before matching.
    const normalizeFsPath = (p: string): string => path.normalize(p).toLowerCase();
    const fileSet = new Set(files.map(normalizeFsPath));
    const tsconfigPaths = loadTsconfigPaths(root);

    const pushNode = (n: GraphNode) => {
      if (seen.has(n.id)) return;
      seen.add(n.id);
      nodes.push(n);
    };

    for (const sf of program.getSourceFiles()) {
      if (sf.isDeclarationFile) continue;
      if (!fileSet.has(normalizeFsPath(sf.fileName))) continue;
      const rel = toPosixRelative(root, sf.fileName);
      const fileId = nodeId("file", rel);
      pushNode({ id: fileId, kind: "file", label: path.basename(rel), path: rel });

      const visit = (node: ts.Node) => {
        if (ts.isFunctionDeclaration(node) && node.name) {
          const name = node.name.text;
          pushNode({
            id: nodeId("function", `${rel}:${name}`),
            kind: "function",
            label: name,
            path: rel,
            meta: { parser: "typescript-ast", analysisVersion: CONTRACTS_VERSION },
          });
        }
        if (ts.isClassDeclaration(node) && node.name) {
          const name = node.name.text;
          const classId = nodeId("class", `${rel}:${name}`);
          pushNode({
            id: classId,
            kind: "class",
            label: name,
            path: rel,
            meta: { parser: "typescript-ast" },
          });
          if (node.heritageClauses) {
            for (const h of node.heritageClauses) {
              for (const t of h.types) {
                const label = t.expression.getText(sf);
                const toId = nodeId("dependency", `${rel}->${label}`);
                pushNode({ id: toId, kind: "dependency", label, path: rel });
                edges.push({
                  id: nodeId("edge", `${classId}->${toId}:${h.token}`),
                  from: classId,
                  to: toId,
                  kind: h.token === ts.SyntaxKind.ExtendsKeyword ? "extends" : "implements",
                  evidence: "verified",
                });
              }
            }
          }
        }
        if (ts.isInterfaceDeclaration(node) && node.name) {
          pushNode({
            id: nodeId("interface", `${rel}:${node.name.text}`),
            kind: "module",
            label: node.name.text,
            path: rel,
            meta: { symbolKind: "interface", parser: "typescript-ast" },
          });
        }
        if (
          ts.isImportDeclaration(node) &&
          node.moduleSpecifier &&
          ts.isStringLiteral(node.moduleSpecifier)
        ) {
          const spec = node.moduleSpecifier.text;
          const resolution = resolveImportSpecifier({
            root,
            fromFile: rel,
            specifier: spec,
            tsconfig: tsconfigPaths,
          });

          // Specifier dependency node (always — records the literal import).
          const toId = nodeId("dependency", `${rel}->${spec}`);
          pushNode({
            id: toId,
            kind: "dependency",
            label: spec,
            path: rel,
            meta: {
              specifier: spec,
              parser: "typescript-ast",
              confidence: resolution.confidence,
              ...(resolution.resolvedPath ? { resolvedPath: resolution.resolvedPath } : {}),
              ...(resolution.via ? { via: resolution.via } : {}),
            },
          });
          edges.push({
            id: nodeId("edge", `${fileId}->${toId}`),
            from: fileId,
            to: toId,
            kind: "imports",
            evidence: evidenceForConfidence(resolution.confidence),
          });

          // Concrete file→file edge only when resolved — never invent UNRESOLVED targets.
          if (resolution.resolvedPath && resolution.confidence !== "UNRESOLVED") {
            const targetFileId = nodeId("file", resolution.resolvedPath);
            pushNode({
              id: targetFileId,
              kind: "file",
              label: path.basename(resolution.resolvedPath),
              path: resolution.resolvedPath,
              meta: { importConfidence: resolution.confidence },
            });
            edges.push({
              id: nodeId("edge", `${fileId}->file:${resolution.resolvedPath}`),
              from: fileId,
              to: targetFileId,
              kind: "imports",
              evidence: evidenceForConfidence(resolution.confidence),
            });
          }
        }
        if (
          ts.isCallExpression(node) &&
          ts.isIdentifier(node.expression) &&
          node.expression.text.length > 1
        ) {
          const callee = node.expression.text;
          const toId = nodeId("function", `call:${rel}:${callee}`);
          pushNode({
            id: toId,
            kind: "function",
            label: callee,
            path: rel,
            meta: { callSite: true, parser: "typescript-ast" },
          });
          edges.push({
            id: nodeId("edge", `${fileId}->call:${callee}:${node.getStart(sf)}`),
            from: fileId,
            to: toId,
            kind: "calls",
            evidence: "inferred",
          });
        }
        ts.forEachChild(node, visit);
      };
      visit(sf);
    }

    nodes.sort((a, b) => a.id.localeCompare(b.id));
    edges.sort((a, b) => a.id.localeCompare(b.id));

    return applyLanguageEnrichment(
      {
        root,
        generatedAt: new Date().toISOString(),
        nodes,
        edges,
        builder: "typescript-ast",
        astFilesParsed: files.length,
        limitations: [
          "TypeScript AST builder uses the TypeScript compiler API for .ts/.tsx only",
          "Cross-file call resolution is identifier-based (not full type-checker binding)",
          "Import edges use EXACT|RESOLVED|INFERRED confidence; UNRESOLVED never invents file targets",
          "Additional .py/.php/.go nodes may be merged via language adapters when supported",
          `analysisVersion=${CONTRACTS_VERSION}`,
        ],
      },
      root,
    );
  } catch (error) {
    const g = await buildRepositoryGraph(root);
    return applyLanguageEnrichment(
      {
        ...g,
        builder: "regex",
        astFilesParsed: 0,
        limitations: [
          ...g.limitations,
          `TypeScript AST builder failed; regex fallback used (${error instanceof Error ? error.message : String(error)})`,
        ],
      },
      root,
    );
  }
}
