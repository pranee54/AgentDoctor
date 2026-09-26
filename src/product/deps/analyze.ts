import path from "node:path";

import { DEFAULT_MAX_FILE_SIZE_BYTES } from "../../constants.js";
import { detectProject } from "../../detectors/project.js";
import { detectMonorepo } from "../../detectors/monorepo.js";
import { readJsonFile } from "../../utils/fs.js";
import { resolveRepoRoot } from "../../utils/path.js";
import type { ProductEvidence, TruthLabel } from "../truth.js";
import { parseAllLockfiles, type LockfilePackageVersion } from "./lockfiles.js";

export interface DirectDependency {
  name: string;
  versionRange: string;
  packageJsonPath: string;
  truth: TruthLabel;
  evidence: ProductEvidence[];
}

export interface DuplicatePackageName {
  name: string;
  paths: string[];
  truth: TruthLabel;
}

export interface UpgradeImpactHint {
  dependency: string;
  importers: string[];
  truth: TruthLabel;
}

export interface DependencyAnalysisReport {
  root: string;
  monorepo: string;
  directDependencies: DirectDependency[];
  duplicateNames: DuplicatePackageName[];
  lockfilesPresent: string[];
  lockfilesParsed: string[];
  transitiveFromLockfile: LockfilePackageVersion[];
  upgradeImpact: UpgradeImpactHint[];
  limitations: string[];
}

interface PackageJsonShape {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  workspaces?: unknown;
}

function basename(rel: string): string {
  const parts = rel.split("/");
  return parts[parts.length - 1] ?? rel;
}

function lockfilesFromPaths(relativePaths: string[]): string[] {
  const names = new Set<string>();
  for (const p of relativePaths) {
    const base = basename(p).toLowerCase();
    if (
      base === "package-lock.json" ||
      base === "yarn.lock" ||
      base === "pnpm-lock.yaml" ||
      base === "bun.lockb"
    ) {
      names.add(p.replace(/\\/g, "/"));
    }
  }
  return [...names].sort();
}

function importersForPackage(
  depName: string,
  graph?: {
    nodes: Array<{ id: string; kind: string; label: string; path?: string }>;
    edges: Array<{ from: string; to: string; kind: string }>;
  },
): string[] {
  if (!graph) return [];
  const importers = new Set<string>();
  for (const edge of graph.edges) {
    if (edge.kind !== "imports" && edge.kind !== "depends-on") continue;
    const target = graph.nodes.find((n) => n.id === edge.to);
    const source = graph.nodes.find((n) => n.id === edge.from);
    if (!target || !source) continue;
    const label = target.label ?? target.id;
    if (label === depName || label.endsWith(`/${depName}`) || label.includes(depName)) {
      if (source.path) importers.add(source.path.replace(/\\/g, "/"));
      else if (source.label) importers.add(source.label);
    }
  }
  return [...importers].sort();
}

export async function analyzeDependencies(
  rootInput: string,
  options?: {
    graph?: {
      nodes: Array<{ id: string; kind: string; label: string; path?: string }>;
      edges: Array<{ from: string; to: string; kind: string }>;
    };
    maxFileSizeBytes?: number;
  },
): Promise<DependencyAnalysisReport> {
  const maxFileSizeBytes = options?.maxFileSizeBytes ?? DEFAULT_MAX_FILE_SIZE_BYTES;
  const root = resolveRepoRoot(rootInput);
  const detection = await detectProject(root, maxFileSizeBytes);
  const relativePaths = detection.discovery.files.map((f) => f.relativePath.replace(/\\/g, "/"));
  let rootWorkspaces: unknown;
  const rootPkg = await readJsonFile<PackageJsonShape>(
    path.join(root, "package.json"),
    maxFileSizeBytes,
  );
  if (rootPkg.ok) rootWorkspaces = rootPkg.data.workspaces;
  const monorepo = detectMonorepo({
    relativePaths,
    packageJsonWorkspaces: rootWorkspaces,
  }).monorepo;

  const lockfilesPresent = lockfilesFromPaths(relativePaths);
  const limitations = [
    "Direct dependencies are read from package.json files only.",
    "Transitive versions are VERIFIED only when a lockfile was parsed successfully.",
  ];
  if (!lockfilesPresent.length) {
    limitations.push("No lockfile detected; transitive upgrade impact is UNKNOWN.");
  }

  const lockParse = await parseAllLockfiles(root, lockfilesPresent, maxFileSizeBytes);
  limitations.push(...lockParse.limitations);

  const packageJsonPaths = relativePaths.filter(
    (p) => basename(p).toLowerCase() === "package.json",
  );
  const directDependencies: DirectDependency[] = [];
  const nameToPaths = new Map<string, string[]>();

  for (const rel of packageJsonPaths) {
    const parsed = await readJsonFile<PackageJsonShape>(path.join(root, rel), maxFileSizeBytes);
    if (!parsed.ok) continue;
    const pkgName = parsed.data.name?.trim();
    if (pkgName) {
      const list = nameToPaths.get(pkgName) ?? [];
      list.push(rel);
      nameToPaths.set(pkgName, list);
    }
    const sections: Array<[string, Record<string, string> | undefined]> = [
      ["dependencies", parsed.data.dependencies],
      ["devDependencies", parsed.data.devDependencies],
      ["peerDependencies", parsed.data.peerDependencies],
    ];
    for (const [section, deps] of sections) {
      if (!deps) continue;
      for (const [name, versionRange] of Object.entries(deps)) {
        directDependencies.push({
          name,
          versionRange,
          packageJsonPath: rel,
          truth: "VERIFIED",
          evidence: [{ path: rel, excerpt: `${section}.${name}` }],
        });
      }
    }
  }

  directDependencies.sort((a, b) =>
    a.name === b.name
      ? a.packageJsonPath.localeCompare(b.packageJsonPath)
      : a.name.localeCompare(b.name),
  );

  const duplicateNames: DuplicatePackageName[] = [];
  for (const [name, paths] of nameToPaths) {
    if (paths.length > 1) {
      duplicateNames.push({
        name,
        paths: [...paths].sort(),
        truth: "VERIFIED",
      });
    }
  }

  const upgradeImpact: UpgradeImpactHint[] = [];
  const uniqueDeps = [...new Set(directDependencies.map((d) => d.name))];
  for (const dep of uniqueDeps) {
    const importers = importersForPackage(dep, options?.graph);
    if (importers.length) {
      upgradeImpact.push({
        dependency: dep,
        importers,
        truth: options?.graph ? "INFERRED" : "UNKNOWN",
      });
    }
  }

  return {
    root,
    monorepo,
    directDependencies,
    duplicateNames,
    lockfilesPresent,
    lockfilesParsed: lockParse.parsedLockfiles,
    transitiveFromLockfile: lockParse.packages,
    upgradeImpact,
    limitations,
  };
}
