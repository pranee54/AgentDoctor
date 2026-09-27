import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

import { decideDirectoryTraversal } from "../../project/ownership.js";
import { readTextFile } from "../../utils/fs.js";
import { resolveRepoRoot, toPosixRelative } from "../../utils/path.js";
import type { GraphEdge, GraphNode, RepositoryGraph } from "../types.js";

const SKIP = new Set([
  "node_modules",
  ".git",
  "dist",
  "coverage",
  ".agentdoctor",
  "vendor",
  ".next",
  "build",
]);

const CODE_EXT = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".py",
  ".go",
  ".rs",
  ".java",
  ".kt",
  ".php",
  ".rb",
]);

function nodeId(kind: string, key: string): string {
  return `${kind}:${createHash("sha1").update(key).digest("hex").slice(0, 12)}`;
}

async function walk(
  root: string,
  dir: string,
  files: string[],
  dirs: string[],
  limit: number,
): Promise<void> {
  if (files.length >= limit) return;
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (SKIP.has(entry.name)) continue;
    const absolute = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) {
      const relativeDir = toPosixRelative(root, absolute);
      const traversal = await decideDirectoryTraversal({
        projectRoot: root,
        absoluteDir: absolute,
        relativeDir,
      });
      if (!traversal.traverse) continue;
      dirs.push(absolute);
      await walk(root, absolute, files, dirs, limit);
      continue;
    }
    if (entry.isFile()) files.push(absolute);
  }
}

function extractSymbols(content: string, rel: string): GraphNode[] {
  const nodes: GraphNode[] = [];
  const fnRe =
    /(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_][A-Za-z0-9_]*)|([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(?:async\s*)?\(/g;
  const classRe = /(?:export\s+)?class\s+([A-Za-z_][A-Za-z0-9_]*)/g;
  let m: RegExpExecArray | null;
  while ((m = fnRe.exec(content))) {
    const name = m[1] ?? m[2];
    if (!name || name.length < 2) continue;
    nodes.push({
      id: nodeId("function", `${rel}:${name}`),
      kind: "function",
      label: name,
      path: rel,
    });
  }
  while ((m = classRe.exec(content))) {
    const name = m[1]!;
    nodes.push({
      id: nodeId("class", `${rel}:${name}`),
      kind: "class",
      label: name,
      path: rel,
    });
  }
  return nodes;
}

function extractImports(
  content: string,
  rel: string,
): { edges: GraphEdge[]; dependencyNodes: GraphNode[] } {
  const edges: GraphEdge[] = [];
  const dependencyNodes: GraphNode[] = [];
  const importRe = /(?:import\s+.*?from\s+|require\()\s*['"]([^'"]+)['"]|from\s+['"]([^'"]+)['"]/g;
  let m: RegExpExecArray | null;
  const fromId = nodeId("file", rel);
  const seen = new Set<string>();
  while ((m = importRe.exec(content))) {
    const spec = m[1] ?? m[2];
    if (!spec) continue;
    const toId = nodeId("dependency", `${rel}->${spec}`);
    edges.push({
      id: nodeId("edge", `${fromId}->${toId}`),
      from: fromId,
      to: toId,
      kind: "imports",
      evidence: spec.startsWith(".") ? "verified" : "inferred",
    });
    if (!seen.has(toId)) {
      seen.add(toId);
      dependencyNodes.push({
        id: toId,
        kind: "dependency",
        label: spec,
        path: rel,
        meta: { specifier: spec },
      });
    }
  }
  return { edges, dependencyNodes };
}

/**
 * Module A — Repository Intelligence (local graph MVP).
 * Symbol extraction is heuristic (regex), not a full language AST.
 */
export async function buildRepositoryGraph(rootInput: string): Promise<RepositoryGraph> {
  const root = resolveRepoRoot(rootInput);
  const files: string[] = [];
  const dirs: string[] = [];
  await walk(root, root, files, dirs, 2_000);

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const limitations: string[] = [
    "Symbol extraction is regex-heuristic for common languages; not a full AST",
    "Call-graph and multi-repo federation are extension points (not fully built)",
  ];

  for (const dir of dirs) {
    const rel = toPosixRelative(root, dir) || ".";
    nodes.push({
      id: nodeId("directory", rel),
      kind: "directory",
      label: path.basename(dir),
      path: rel,
    });
  }

  for (const absolute of files) {
    const rel = toPosixRelative(root, absolute);
    const ext = path.extname(rel).toLowerCase();
    const base = path.basename(rel).toLowerCase();
    let kind: GraphNode["kind"] = "file";
    if (/\.(test|spec)\./i.test(rel) || rel.includes("__tests__")) kind = "test";
    else if (/\.(md|rst|txt)$/i.test(ext)) kind = "doc";
    else if (
      /\.(yml|yaml|toml|json|env)$/i.test(ext) ||
      base.startsWith("dockerfile") ||
      base === "makefile"
    )
      kind = "config";

    const fileId = nodeId("file", rel);
    nodes.push({ id: fileId, kind, label: path.basename(rel), path: rel });

    if (CODE_EXT.has(ext)) {
      // open+fstat+read via readTextFile — avoids exists/stat→read TOCTOU
      const content = await readTextFile(absolute, 256 * 1024);
      if (content === null) continue;
      nodes.push(...extractSymbols(content, rel));
      const { edges: importEdges, dependencyNodes } = extractImports(content, rel);
      edges.push(...importEdges);
      for (const dep of dependencyNodes) {
        if (!nodes.some((n) => n.id === dep.id)) nodes.push(dep);
      }
      if (/router\.|app\.(get|post|put|delete)|@app\.(get|post)/i.test(content)) {
        nodes.push({
          id: nodeId("api", rel),
          kind: "api",
          label: `api:${path.basename(rel)}`,
          path: rel,
          meta: { evidence: "inferred" },
        });
      }
    }
  }

  nodes.sort((a, b) => a.id.localeCompare(b.id));
  edges.sort((a, b) => a.id.localeCompare(b.id));

  return {
    root,
    generatedAt: new Date().toISOString(),
    nodes,
    edges,
    limitations,
  };
}
