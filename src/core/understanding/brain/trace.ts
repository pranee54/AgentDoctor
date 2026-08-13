import type { ProjectBrain } from "./types.js";

export interface TraceNode {
  id: string;
  label: string;
  kind: "component" | "dependency-endpoint" | "entrypoint" | "domain";
  path?: string;
  confidence: number;
}

export interface TraceEdge {
  from: string;
  to: string;
  type: string;
  evidence: readonly string[];
  confidence: number;
}

export interface TraceResult {
  root: string;
  nodes: readonly TraceNode[];
  edges: readonly TraceEdge[];
  cycles: readonly string[];
  confidence: number;
}

function normalize(value: string): string {
  return value.replace(/\\/g, "/").toLowerCase();
}

/** Prefer exact path match; fall back to path-segment containment (not bare substring). */
function pathMatches(value: string, target: string): boolean {
  const v = normalize(value);
  const t = normalize(target);
  if (t.length === 0) {
    return false;
  }
  if (v === t) {
    return true;
  }
  // Segment-aware containment: "/foo/bar" matches target "foo/bar" or "bar" as a segment.
  if (t.length < 2) {
    return false;
  }
  return (
    v.endsWith(`/${t}`) ||
    v.includes(`/${t}/`) ||
    v.startsWith(`${t}/`) ||
    t.endsWith(`/${v}`) ||
    t.includes(`/${v}/`)
  );
}

export type TraceMode =
  "dependencies" | "dependents" | "entrypoint-downstream" | "blast-radius" | "domain-modules";

const MAX_DEPTH = 25;
const MAX_EDGES = 5_000;

export function traceBrain(
  brain: ProjectBrain,
  target: string,
  mode: TraceMode = "blast-radius",
): TraceResult {
  const nodes = new Map<string, TraceNode>();
  const edgeKeys = new Set<string>();
  const edges: TraceEdge[] = [];
  const visiting = new Set<string>();
  const expanded = new Set<string>();
  const cycles: string[] = [];

  const addNode = (node: TraceNode): void => {
    if (!nodes.has(node.id)) {
      nodes.set(node.id, node);
    }
  };

  const addEdge = (edge: TraceEdge): void => {
    if (edges.length >= MAX_EDGES) {
      return;
    }
    const key = `${edge.from}\0${edge.to}\0${edge.type}`;
    if (edgeKeys.has(key)) {
      return;
    }
    edgeKeys.add(key);
    edges.push(edge);
  };

  const rootId = `root:${target}`;
  addNode({
    id: rootId,
    label: target,
    kind: "component",
    path: target,
    confidence: 1,
  });

  if (mode === "domain-modules") {
    for (const domain of brain.model.domains) {
      if (!pathMatches(domain.name, target) && !domain.paths.some((p) => pathMatches(p, target))) {
        continue;
      }
      const domainNode = `domain:${domain.name}`;
      addNode({
        id: domainNode,
        label: domain.name,
        kind: "domain",
        confidence: domain.confidence,
      });
      addEdge({
        from: rootId,
        to: domainNode,
        type: "domain",
        evidence: [...domain.evidence],
        confidence: domain.confidence,
      });
      for (const comp of brain.components) {
        if (
          !comp.domainIds.includes(domain.id) &&
          !domain.paths.some((p) => pathMatches(comp.path, p))
        ) {
          continue;
        }
        addNode({
          id: comp.id,
          label: comp.name,
          kind: "component",
          path: comp.path,
          confidence: comp.confidence,
        });
        addEdge({
          from: domainNode,
          to: comp.id,
          type: "contains",
          evidence: [...comp.evidenceIds],
          confidence: comp.confidence,
        });
      }
    }
  } else {
    const walk = (current: string, depth: number): void => {
      if (depth > MAX_DEPTH || edges.length >= MAX_EDGES) {
        return;
      }
      if (visiting.has(current)) {
        cycles.push(current);
        return;
      }
      if (expanded.has(current)) {
        return;
      }
      visiting.add(current);

      for (const dep of brain.model.dependencies) {
        const fromMatch = pathMatches(dep.from, current);
        const toMatch = pathMatches(dep.to, current);

        if (mode === "dependencies" && !fromMatch) {
          continue;
        }
        if (mode === "dependents" && !toMatch) {
          continue;
        }
        if (mode === "entrypoint-downstream" && depth === 0) {
          if (!pathMatches(dep.from, target) && !pathMatches(dep.to, target)) {
            continue;
          }
        } else if (mode === "blast-radius" || mode === "entrypoint-downstream") {
          if (!fromMatch && !toMatch) {
            continue;
          }
        }

        const fromId = `node:${dep.from}`;
        const toId = `node:${dep.to}`;
        addNode({
          id: fromId,
          label: dep.from,
          kind: "dependency-endpoint",
          path: dep.from,
          confidence: dep.confidence,
        });
        addNode({
          id: toId,
          label: dep.to,
          kind: "dependency-endpoint",
          path: dep.to,
          confidence: dep.confidence,
        });
        addEdge({
          from: fromId,
          to: toId,
          type: dep.type,
          evidence: [...dep.evidence],
          confidence: dep.confidence,
        });

        if (
          mode === "dependencies" ||
          mode === "blast-radius" ||
          mode === "entrypoint-downstream"
        ) {
          if (fromMatch) {
            walk(dep.to, depth + 1);
          }
        }
        if (mode === "dependents" || mode === "blast-radius") {
          if (toMatch) {
            walk(dep.from, depth + 1);
          }
        }
      }

      if (mode === "entrypoint-downstream" || mode === "blast-radius") {
        for (const entry of brain.model.entrypoints) {
          if (!pathMatches(entry.file, current) && !pathMatches(entry.file, target)) {
            continue;
          }
          const entryId = `entry:${entry.file}`;
          addNode({
            id: entryId,
            label: entry.file,
            kind: "entrypoint",
            path: entry.file,
            confidence: entry.confidence,
          });
          addEdge({
            from: rootId,
            to: entryId,
            type: "entrypoint",
            evidence: [...entry.evidence],
            confidence: entry.confidence,
          });
        }
      }

      visiting.delete(current);
      expanded.add(current);
    };

    walk(target, 0);
  }

  const nodeList = [...nodes.values()].sort((a, b) => a.id.localeCompare(b.id));
  const edgeList = edges
    .map((e) => ({ ...e, evidence: [...e.evidence].sort() }))
    .sort(
      (a, b) =>
        a.from.localeCompare(b.from) || a.to.localeCompare(b.to) || a.type.localeCompare(b.type),
    );
  const confidence =
    edgeList.length === 0
      ? 0
      : Math.round((edgeList.reduce((s, e) => s + e.confidence, 0) / edgeList.length) * 100) / 100;

  return {
    root: target,
    nodes: nodeList,
    edges: edgeList,
    cycles: [...new Set(cycles)].sort(),
    confidence,
  };
}
