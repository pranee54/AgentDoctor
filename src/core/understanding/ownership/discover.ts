import fs from "node:fs/promises";
import path from "node:path";

import { discoverFiles } from "../../../discovery/files.js";
import { readTextFile } from "../../../utils/fs.js";
import type {
  OwnershipDiscoveryOptions,
  OwnershipDiscoveryResult,
  OwnershipMatch,
} from "./types.js";

const MAX_BYTES = 512 * 1024;

const CODEOWNERS_CANDIDATES = [
  "CODEOWNERS",
  ".github/CODEOWNERS",
  "docs/CODEOWNERS",
  ".gitlab/CODEOWNERS",
] as const;

export function scoreOwnershipConfidence(source: OwnershipMatch["source"]): number {
  switch (source) {
    case "codeowners":
      return 0.95;
    case "maintainers-file":
      return 0.85;
    case "package-maintainers":
      return 0.75;
    default:
      return 0;
  }
}

/** Match a repo-relative path against a CODEOWNERS pattern (subset of GitHub rules). */
export function matchCodeownersPattern(filePath: string, pattern: string): boolean {
  const normalizedFile = filePath.replace(/\\/g, "/").replace(/^\/+/, "");
  let normalizedPattern = pattern.replace(/\\/g, "/").trim();
  if (normalizedPattern.length === 0) {
    return false;
  }

  const anchored = normalizedPattern.startsWith("/");
  if (anchored) {
    normalizedPattern = normalizedPattern.slice(1);
  }
  const dirOnly = normalizedPattern.endsWith("/");
  if (dirOnly) {
    normalizedPattern = normalizedPattern.slice(0, -1);
  }

  const escaped = normalizedPattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "{{GLOBSTAR}}")
    .replace(/\*/g, "[^/]*")
    .replace(/\?/g, "[^/]")
    .replace(/{{GLOBSTAR}}/g, ".*");

  const prefix = anchored ? "^" : "(^|/)";
  const suffix = dirOnly ? "(/.*)?$" : "$";
  const regex = new RegExp(`${prefix}${escaped}${suffix}`);
  return regex.test(normalizedFile);
}

function parseCodeowners(content: string, sourcePath: string): OwnershipMatch[] {
  const matches: OwnershipMatch[] = [];
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith("#")) {
      continue;
    }
    const parts = line.split(/\s+/).filter((part) => part.length > 0);
    if (parts.length < 2) {
      continue;
    }
    const pattern = parts[0];
    if (!pattern) {
      continue;
    }
    const owners = parts.slice(1).filter((part) => !part.startsWith("#"));
    if (owners.length === 0) {
      continue;
    }
    matches.push({
      path: pattern,
      owners,
      confidence: scoreOwnershipConfidence("codeowners"),
      evidence: [`${sourcePath}:${pattern}`],
      source: "codeowners",
    });
  }
  return matches;
}

function parseMaintainersFile(content: string, sourcePath: string): OwnershipMatch[] {
  const owners: string[] = [];
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith("#")) {
      continue;
    }
    // Common formats: "@handle", "Name <email>", plain email/name
    owners.push(line.replace(/,\s*$/, ""));
  }
  if (owners.length === 0) {
    return [];
  }
  return [
    {
      path: "*",
      owners,
      confidence: scoreOwnershipConfidence("maintainers-file"),
      evidence: [sourcePath],
      source: "maintainers-file",
    },
  ];
}

function ownersFromPackageJson(data: unknown, packageRelativePath: string): OwnershipMatch | null {
  if (!data || typeof data !== "object") {
    return null;
  }
  const record = data as Record<string, unknown>;
  const owners: string[] = [];

  const pushAuthor = (value: unknown): void => {
    if (typeof value === "string" && value.trim().length > 0) {
      owners.push(value.trim());
      return;
    }
    if (value && typeof value === "object") {
      const author = value as { name?: unknown; email?: unknown };
      const name = typeof author.name === "string" ? author.name.trim() : "";
      const email = typeof author.email === "string" ? author.email.trim() : "";
      if (name && email) {
        owners.push(`${name} <${email}>`);
      } else if (name) {
        owners.push(name);
      } else if (email) {
        owners.push(email);
      }
    }
  };

  pushAuthor(record.author);
  if (Array.isArray(record.maintainers)) {
    for (const item of record.maintainers) {
      pushAuthor(item);
    }
  }

  const unique = [...new Set(owners)];
  if (unique.length === 0) {
    return null;
  }

  const dir = path.posix.dirname(packageRelativePath.replace(/\\/g, "/"));
  const covered = dir === "." ? "*" : `${dir}/**`;
  return {
    path: covered,
    owners: unique,
    confidence: scoreOwnershipConfidence("package-maintainers"),
    evidence: [packageRelativePath],
    source: "package-maintainers",
  };
}

/**
 * Discover ownership from explicit repository evidence only.
 * Sources: CODEOWNERS, MAINTAINERS, package.json author/maintainers.
 * No git-blame guessing.
 */
export async function discoverOwnership(
  options: OwnershipDiscoveryOptions = {},
): Promise<OwnershipDiscoveryResult> {
  const started = performance.now();
  const cwd = options.cwd ?? process.cwd();
  const minConfidence = options.minConfidence ?? 0.5;
  const ownerships: OwnershipMatch[] = [];
  const unknowns: string[] = [];
  let filesConsidered = 0;

  for (const candidate of CODEOWNERS_CANDIDATES) {
    const absolute = path.join(cwd, candidate);
    const text = await readTextFile(absolute, MAX_BYTES);
    if (text === null) {
      continue;
    }
    filesConsidered += 1;
    ownerships.push(...parseCodeowners(text, candidate));
  }

  for (const candidate of ["MAINTAINERS", "OWNERS", "docs/MAINTAINERS"] as const) {
    const text = await readTextFile(path.join(cwd, candidate), MAX_BYTES);
    if (text === null) {
      continue;
    }
    filesConsidered += 1;
    ownerships.push(...parseMaintainersFile(text, candidate));
  }

  const relativePaths =
    options.relativePaths ??
    (await discoverFiles({ root: cwd })).files.map((file) => file.relativePath);

  const packageJsonPaths = relativePaths.filter((relative) => {
    const normalized = relative.replace(/\\/g, "/");
    return normalized === "package.json" || normalized.endsWith("/package.json");
  });

  for (const packageRelative of packageJsonPaths) {
    filesConsidered += 1;
    try {
      const raw = await fs.readFile(path.join(cwd, packageRelative), "utf8");
      if (Buffer.byteLength(raw, "utf8") > MAX_BYTES) {
        continue;
      }
      const parsed = JSON.parse(raw) as unknown;
      const match = ownersFromPackageJson(parsed, packageRelative.replace(/\\/g, "/"));
      if (match) {
        ownerships.push(match);
      }
    } catch {
      // Malformed package.json is not ownership evidence.
    }
  }

  const filtered = ownerships
    .filter((item) => item.confidence >= minConfidence && item.owners.length > 0)
    .sort(
      (a, b) =>
        b.confidence - a.confidence ||
        a.source.localeCompare(b.source) ||
        a.path.localeCompare(b.path),
    );

  if (filtered.length === 0) {
    unknowns.push("No explicit ownership evidence found (CODEOWNERS / MAINTAINERS / package.json)");
  }

  return {
    ownerships: filtered,
    timingMs: Math.max(0, Math.round(performance.now() - started)),
    filesConsidered,
    unknowns,
  };
}

/** Resolve owners for a path using last-matching CODEOWNERS rule semantics when possible. */
export function ownersForPath(
  filePath: string,
  ownerships: readonly OwnershipMatch[],
): OwnershipMatch | null {
  const normalized = filePath.replace(/\\/g, "/").replace(/^\/+/, "");
  let lastCodeowners: OwnershipMatch | null = null;
  let packageMatch: OwnershipMatch | null = null;
  let maintainersMatch: OwnershipMatch | null = null;

  for (const ownership of ownerships) {
    if (ownership.source === "codeowners") {
      if (matchCodeownersPattern(normalized, ownership.path)) {
        lastCodeowners = ownership;
      }
      continue;
    }
    if (ownership.source === "package-maintainers") {
      if (ownership.path === "*" || matchCodeownersPattern(normalized, ownership.path)) {
        // Prefer the most specific package path (longest prefix).
        if (!packageMatch || ownership.path.length > packageMatch.path.length) {
          packageMatch = ownership;
        }
      }
      continue;
    }
    if (ownership.source === "maintainers-file" && ownership.path === "*") {
      maintainersMatch = ownership;
    }
  }

  return lastCodeowners ?? packageMatch ?? maintainersMatch;
}
