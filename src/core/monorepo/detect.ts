import fs from "node:fs/promises";
import path from "node:path";

import { classifyRelativePathOwnership, isUnderNestedRepository } from "../../project/ownership.js";
import { resolveRepoRoot, toPosixRelative } from "../../utils/path.js";

export interface WorkspacePackage {
  name: string;
  relativePath: string;
  absolutePath: string;
}

export interface MonorepoDetection {
  root: string;
  isMonorepo: boolean;
  tool: "npm-workspaces" | "pnpm-workspaces" | "none";
  packages: WorkspacePackage[];
  limitations: string[];
}

async function readJson(file: string): Promise<Record<string, unknown> | null> {
  try {
    const raw = await fs.readFile(file, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function resolveGlobDirs(root: string, pattern: string): Promise<string[]> {
  // Support simple patterns: "packages/*", "apps/*", "."
  if (pattern === "." || pattern === "./") {
    return [root];
  }
  const normalized = pattern.replace(/^\.\//, "").replace(/\/$/, "");
  if (normalized.endsWith("/*")) {
    const parent = path.join(root, normalized.slice(0, -2));
    try {
      const entries = await fs.readdir(parent, { withFileTypes: true });
      return entries
        .filter((e) => e.isDirectory() && !e.name.startsWith("."))
        .map((e) => path.join(parent, e.name));
    } catch {
      return [];
    }
  }
  const candidate = path.join(root, normalized);
  try {
    const st = await fs.stat(candidate);
    return st.isDirectory() ? [candidate] : [];
  } catch {
    return [];
  }
}

async function packageFromDir(root: string, dir: string): Promise<WorkspacePackage | null> {
  const pkg = await readJson(path.join(dir, "package.json"));
  if (!pkg) return null;
  const name = typeof pkg.name === "string" ? pkg.name : path.basename(dir);
  return {
    name,
    relativePath: toPosixRelative(root, dir) || ".",
    absolutePath: dir,
  };
}

export async function detectMonorepo(rootInput: string): Promise<MonorepoDetection> {
  const root = resolveRepoRoot(rootInput);
  const limitations: string[] = [];
  const packages: WorkspacePackage[] = [];

  const rootPkg = await readJson(path.join(root, "package.json"));
  let tool: MonorepoDetection["tool"] = "none";
  const patterns: string[] = [];

  if (rootPkg) {
    const workspaces = rootPkg.workspaces;
    if (Array.isArray(workspaces)) {
      tool = "npm-workspaces";
      for (const p of workspaces) {
        if (typeof p === "string") patterns.push(p);
      }
    } else if (workspaces && typeof workspaces === "object" && !Array.isArray(workspaces)) {
      const pkgs = (workspaces as { packages?: unknown }).packages;
      if (Array.isArray(pkgs)) {
        tool = "npm-workspaces";
        for (const p of pkgs) {
          if (typeof p === "string") patterns.push(p);
        }
      }
    }
  }

  try {
    const pnpmRaw = await fs.readFile(path.join(root, "pnpm-workspace.yaml"), "utf8");
    tool = "pnpm-workspaces";
    for (const line of pnpmRaw.split(/\r?\n/)) {
      const m = line.match(/^\s*-\s+['"]?([^'"]+)['"]?\s*$/);
      if (m?.[1]) patterns.push(m[1]);
    }
  } catch {
    // optional
  }

  const seen = new Set<string>();
  for (const pattern of patterns) {
    const dirs = await resolveGlobDirs(root, pattern);
    for (const dir of dirs) {
      const pkg = await packageFromDir(root, dir);
      if (!pkg) continue;
      if (seen.has(pkg.absolutePath)) continue;
      const ownership = classifyRelativePathOwnership(pkg.relativePath);
      if (ownership !== "project_owned") {
        limitations.push(`Skipped non-owned workspace package: ${pkg.relativePath} (${ownership})`);
        continue;
      }
      if (await isUnderNestedRepository(root, pkg.absolutePath)) {
        limitations.push(`Skipped nested-repository workspace package: ${pkg.relativePath}`);
        continue;
      }
      seen.add(pkg.absolutePath);
      packages.push(pkg);
    }
  }

  if (packages.length === 0) {
    const self = await packageFromDir(root, root);
    if (self) {
      packages.push(self);
    }
    limitations.push("No workspace packages discovered; treating repository as a single package");
  }

  packages.sort((a, b) => a.relativePath.localeCompare(b.relativePath));

  return {
    root,
    isMonorepo: tool !== "none",
    tool,
    packages,
    limitations,
  };
}
