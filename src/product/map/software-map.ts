import fs from "node:fs/promises";
import path from "node:path";

import { DEFAULT_MAX_FILE_SIZE_BYTES } from "../../constants.js";
import { detectProject } from "../../detectors/project.js";
import { detectMonorepo } from "../../detectors/monorepo.js";
import { resolveRepoRoot } from "../../utils/path.js";
import type { ProductEvidence, TruthLabel } from "../truth.js";

export type SoftwareMapNodeKind =
  "root" | "package" | "directory" | "workspace" | "docs" | "tests" | "unknown";

export interface SoftwareMapNode {
  id: string;
  kind: SoftwareMapNodeKind;
  label: string;
  path?: string;
  truth: TruthLabel;
  evidence: ProductEvidence[];
  children?: SoftwareMapNode[];
}

export interface SoftwareMap {
  root: string;
  tree: SoftwareMapNode;
  limitations: string[];
}

function nodeId(prefix: string, p: string): string {
  return `${prefix}:${p.replace(/[^\w./-]/g, "_")}`;
}

async function topLevelEntries(root: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(root, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory() && !e.name.startsWith("."))
      .map((e) => e.name)
      .sort();
  } catch {
    return [];
  }
}

export async function buildSoftwareMap(
  rootInput: string,
  maxFileSizeBytes = DEFAULT_MAX_FILE_SIZE_BYTES,
): Promise<SoftwareMap> {
  const root = resolveRepoRoot(rootInput);
  const detection = await detectProject(root, maxFileSizeBytes);
  const relativePaths = detection.discovery.files.map((f) => f.relativePath.replace(/\\/g, "/"));
  let rootWorkspaces: unknown;
  const rootPkgPath = path.join(root, "package.json");
  try {
    const raw = await fs.readFile(rootPkgPath, "utf8");
    rootWorkspaces = (JSON.parse(raw) as { workspaces?: unknown }).workspaces;
  } catch {
    rootWorkspaces = undefined;
  }
  const monorepo = detectMonorepo({
    relativePaths,
    packageJsonWorkspaces: rootWorkspaces,
  }).monorepo;

  const limitations = [
    "Map is structural (directories/packages), not a full module dependency graph.",
    `Monorepo signal: ${monorepo}`,
  ];

  const packageJsonPaths = relativePaths.filter((p) => p.endsWith("package.json"));
  const packageNodes: SoftwareMapNode[] = packageJsonPaths.map((p) => ({
    id: nodeId("pkg", p),
    kind: p === "package.json" ? "root" : "package",
    label: path.dirname(p) === "." ? "root package" : path.dirname(p),
    path: p,
    truth: "VERIFIED",
    evidence: [{ path: p }],
  }));

  const dirs = await topLevelEntries(root);
  const dirNodes: SoftwareMapNode[] = dirs.map((name) => {
    let kind: SoftwareMapNodeKind = "directory";
    if (name === "docs") kind = "docs";
    if (name === "tests" || name === "test") kind = "tests";
    return {
      id: nodeId("dir", name),
      kind,
      label: name,
      path: name,
      truth: "VERIFIED",
      evidence: [{ path: name, excerpt: "top-level directory listing" }],
    };
  });

  const tree: SoftwareMapNode = {
    id: nodeId("root", root),
    kind: "root",
    label: path.basename(root) || root,
    path: ".",
    truth: "VERIFIED",
    evidence: [{ path: ".", excerpt: "detectProject root" }],
    children: [
      {
        id: "packages-section",
        kind: "workspace",
        label: "packages",
        truth: packageNodes.length ? "VERIFIED" : "UNKNOWN",
        evidence: packageNodes.slice(0, 3).map((n) => ({ path: n.path ?? "." })),
        children: packageNodes,
      },
      {
        id: "directories-section",
        kind: "directory",
        label: "top-level directories",
        truth: dirNodes.length ? "VERIFIED" : "PARTIAL",
        evidence: dirNodes.slice(0, 5).map((n) => ({ path: n.path ?? n.label })),
        children: dirNodes,
      },
    ],
  };

  return { root, tree, limitations };
}
