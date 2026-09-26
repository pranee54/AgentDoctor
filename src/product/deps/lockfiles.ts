import fs from "node:fs/promises";
import path from "node:path";

import { readTextFile } from "../../utils/fs.js";
import type { ProductEvidence, TruthLabel } from "../truth.js";

export interface LockfilePackageVersion {
  name: string;
  version: string;
  lockfile: string;
  truth: TruthLabel;
  evidence: ProductEvidence[];
}

export interface ParsedLockfile {
  lockfilePath: string;
  format: "npm" | "yarn" | "pnpm" | "unknown";
  packages: LockfilePackageVersion[];
  limitations: string[];
}

function npmPackageNameFromKey(key: string): string | null {
  if (!key || key === "") return null;
  const idx = key.lastIndexOf("node_modules/");
  const tail = idx >= 0 ? key.slice(idx + "node_modules/".length) : key;
  if (!tail || (tail.startsWith("@") === false && tail.includes("@"))) {
    const at = tail.indexOf("@");
    if (at > 0) return tail.slice(0, at);
  }
  return tail.split("/").filter(Boolean).pop() ?? null;
}

export function parsePackageLockJson(content: string, lockfilePath: string): ParsedLockfile {
  const limitations: string[] = [];
  let data: unknown;
  try {
    data = JSON.parse(content) as unknown;
  } catch {
    return {
      lockfilePath,
      format: "npm",
      packages: [],
      limitations: ["package-lock.json is not valid JSON"],
    };
  }
  const obj = data as {
    lockfileVersion?: number;
    packages?: Record<string, { version?: string; name?: string }>;
    dependencies?: Record<string, { version?: string }>;
  };

  const packages: LockfilePackageVersion[] = [];
  const seen = new Set<string>();

  if (obj.packages && typeof obj.packages === "object") {
    for (const [key, entry] of Object.entries(obj.packages)) {
      const version = entry?.version?.trim();
      if (!version) continue;
      const name =
        entry.name?.trim() ||
        npmPackageNameFromKey(key) ||
        (key === "" ? null : key.replace(/^node_modules\//, ""));
      if (!name) continue;
      const dedupe = `${name}@${version}`;
      if (seen.has(dedupe)) continue;
      seen.add(dedupe);
      packages.push({
        name,
        version,
        lockfile: lockfilePath,
        truth: "VERIFIED",
        evidence: [{ path: lockfilePath, excerpt: `packages["${key}"].version=${version}` }],
      });
    }
  } else if (obj.dependencies && typeof obj.dependencies === "object") {
    limitations.push("npm lockfile v1 dependencies tree — shallow direct entries only");
    for (const [name, entry] of Object.entries(obj.dependencies)) {
      const version = entry?.version?.trim();
      if (!version) continue;
      packages.push({
        name,
        version,
        lockfile: lockfilePath,
        truth: "VERIFIED",
        evidence: [{ path: lockfilePath, excerpt: `dependencies.${name}=${version}` }],
      });
    }
  } else {
    limitations.push("Unrecognized package-lock.json shape");
  }

  packages.sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version));
  return { lockfilePath, format: "npm", packages, limitations };
}

export function parseYarnLock(content: string, lockfilePath: string): ParsedLockfile {
  const packages: LockfilePackageVersion[] = [];
  const seen = new Set<string>();
  const lines = content.split(/\r?\n/);
  let currentKey: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const header = /^([^\s].+):$/.exec(line);
    if (header) {
      currentKey = header[1]!.trim();
      continue;
    }
    if (currentKey && /^\s+version\s+/.test(line)) {
      const verMatch = /version\s+"([^"]+)"/.exec(line);
      if (!verMatch) continue;
      const version = verMatch[1]!;
      const resolvedName = (() => {
        const first = currentKey.split(",")[0]!.trim();
        const at = first.lastIndexOf("@");
        if (at <= 0) return first;
        return first.slice(0, at);
      })();
      const dedupe = `${resolvedName}@${version}`;
      if (seen.has(dedupe)) continue;
      seen.add(dedupe);
      packages.push({
        name: resolvedName,
        version,
        lockfile: lockfilePath,
        truth: "VERIFIED",
        evidence: [{ path: lockfilePath, line: i + 1, excerpt: line.trim().slice(0, 120) }],
      });
    }
    if (line.trim() === "" && currentKey) {
      currentKey = null;
    }
  }

  packages.sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version));
  return {
    lockfilePath,
    format: "yarn",
    packages,
    limitations: ["yarn.lock parsing uses version blocks — workspace aliases may be incomplete"],
  };
}

export function parsePnpmLockYaml(content: string, lockfilePath: string): ParsedLockfile {
  const packages: LockfilePackageVersion[] = [];
  const seen = new Set<string>();
  const limitations = [
    "pnpm-lock.yaml parsing is heuristic (packages: keys) — not a full YAML AST",
  ];

  const pkgSection = /(?:^|\n)packages:\s*\n([\s\S]*?)(?:\n\S|\n*$)/.exec(content);
  const body = pkgSection?.[1] ?? content;

  for (const line of body.split(/\r?\n/)) {
    const keyMatch = /^\s{2}(['"]?)(\/[^'":]+@[^'":]+)\1:\s*$/.exec(line);
    if (!keyMatch) continue;
    const key = keyMatch[2]!;
    const at = key.lastIndexOf("@");
    if (at <= 1) continue;
    const name = key.slice(1, at);
    const version = key.slice(at + 1);
    const dedupe = `${name}@${version}`;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    packages.push({
      name,
      version,
      lockfile: lockfilePath,
      truth: "VERIFIED",
      evidence: [{ path: lockfilePath, excerpt: key.slice(0, 120) }],
    });
  }

  packages.sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version));
  return { lockfilePath, format: "pnpm", packages, limitations };
}

export async function parseLockfileAtPath(
  root: string,
  relativePath: string,
  maxBytes: number,
): Promise<ParsedLockfile | null> {
  const abs = path.join(root, relativePath);
  const base = path.basename(relativePath).toLowerCase();
  const text = await readTextFile(abs, maxBytes);
  if (text === null) return null;

  if (base === "package-lock.json" || base === "npm-shrinkwrap.json") {
    return parsePackageLockJson(text, relativePath);
  }
  if (base === "yarn.lock") {
    return parseYarnLock(text, relativePath);
  }
  if (base === "pnpm-lock.yaml") {
    return parsePnpmLockYaml(text, relativePath);
  }
  return null;
}

export async function parseAllLockfiles(
  root: string,
  lockfilePaths: string[],
  maxBytes: number,
): Promise<{
  packages: LockfilePackageVersion[];
  parsedLockfiles: string[];
  limitations: string[];
}> {
  const all: LockfilePackageVersion[] = [];
  const parsedLockfiles: string[] = [];
  const limitations: string[] = [];
  const seen = new Set<string>();

  for (const rel of lockfilePaths) {
    const parsed = await parseLockfileAtPath(root, rel, maxBytes);
    if (!parsed || parsed.packages.length === 0) continue;
    parsedLockfiles.push(rel);
    limitations.push(...parsed.limitations);
    for (const p of parsed.packages) {
      const key = `${p.name}@${p.version}::${p.lockfile}`;
      if (seen.has(key)) continue;
      seen.add(key);
      all.push(p);
    }
  }

  all.sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version));
  return { packages: all, parsedLockfiles, limitations };
}

/** Test helper: read lockfile from disk */
export async function readLockfileFile(filePath: string): Promise<string> {
  return fs.readFile(filePath, "utf8");
}
