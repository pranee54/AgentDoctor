import path from "node:path";

import { discoverFiles } from "../../../discovery/files.js";
import { readJsonFile, readTextFile } from "../../../utils/fs.js";
import { extractReferences, refineRelationType } from "./extract.js";
import {
  LABEL_STOP_SEGMENTS,
  MANIFEST_FILES,
  RELATION_CONFIDENCE,
  RESOLVE_EXTENSIONS,
  clampConfidence,
  isSourceFile,
  titleCaseSegment,
} from "./models.js";
import type {
  DependencyDiscoveryOptions,
  DependencyDiscoveryResult,
  DependencyMatch,
  DependencyRelationType,
  ExtractedReference,
} from "./types.js";

interface PathAlias {
  /** Exact match (no wildcard). */
  exact?: { pattern: string; target: string };
  /** Wildcard match: pattern "prefix*suffix" → target "prefix*suffix". */
  star?: {
    patternPrefix: string;
    patternSuffix: string;
    targetPrefix: string;
    targetSuffix: string;
  };
}

interface PackageInfo {
  name: string;
  root: string;
  dependencies: string[];
}

interface WorkspaceIndex {
  /** relative path → true */
  files: Set<string>;
  /** normalized lookup keys (no ext / index) → relative path */
  resolveMap: Map<string, string>;
  packagesByName: Map<string, PackageInfo>;
  /** package root relative paths sorted longest-first */
  packageRoots: string[];
  aliases: PathAlias[];
  goModule: string | null;
  goModuleRoot: string | null;
}

function dirnamePosix(relativePath: string): string {
  const idx = relativePath.lastIndexOf("/");
  if (idx < 0) {
    return "";
  }
  return relativePath.slice(0, idx);
}

function joinPosix(...parts: string[]): string {
  const joined = parts.filter((p, i) => (i === 0 ? p !== undefined : Boolean(p))).join("/");
  const stack: string[] = [];
  for (const part of joined.split("/")) {
    if (!part || part === ".") {
      continue;
    }
    if (part === "..") {
      stack.pop();
      continue;
    }
    stack.push(part);
  }
  return stack.join("/");
}

function stripExtension(relativePath: string): string {
  return relativePath.replace(/\.[a-z0-9]+$/i, "");
}

function buildResolveMap(files: Iterable<string>): Map<string, string> {
  const map = new Map<string, string>();
  for (const relativePath of files) {
    map.set(relativePath, relativePath);
    const noExt = stripExtension(relativePath);
    if (!map.has(noExt)) {
      map.set(noExt, relativePath);
    }
    if (relativePath.endsWith("/index.ts") || relativePath.endsWith("/index.js")) {
      const dir = dirnamePosix(relativePath);
      if (dir && !map.has(dir)) {
        map.set(dir, relativePath);
      }
    }
    if (relativePath.endsWith("/__init__.py")) {
      const dir = dirnamePosix(relativePath);
      if (dir && !map.has(dir)) {
        map.set(dir, relativePath);
      }
    }
    if (relativePath.endsWith("/mod.rs")) {
      const dir = dirnamePosix(relativePath);
      if (dir && !map.has(dir)) {
        map.set(dir, relativePath);
      }
    }
  }
  return map;
}

function lookupResolved(resolveMap: Map<string, string>, candidate: string): string | null {
  const normalized = candidate.replace(/\\/g, "/").replace(/\/+$/, "");
  if (!normalized) {
    return null;
  }
  const candidates = [normalized];
  // TypeScript ESM: import "./foo.js" often resolves to foo.ts
  if (/\.(js|jsx|mjs|cjs)$/i.test(normalized)) {
    candidates.push(normalized.replace(/\.js$/i, ".ts").replace(/\.jsx$/i, ".tsx"));
    candidates.push(stripExtension(normalized));
  }
  for (const entry of candidates) {
    const direct = resolveMap.get(entry);
    if (direct) {
      return direct;
    }
    for (const ext of RESOLVE_EXTENSIONS) {
      const hit = resolveMap.get(entry + ext);
      if (hit) {
        return hit;
      }
    }
  }
  return null;
}

async function loadPackages(
  root: string,
  relativePaths: string[],
  maxReadBytes: number,
): Promise<{
  packages: PackageInfo[];
  aliases: PathAlias[];
  goModule: string | null;
  goModuleRoot: string | null;
}> {
  const packages: PackageInfo[] = [];
  const aliases: PathAlias[] = [];
  let goModule: string | null = null;
  let goModuleRoot: string | null = null;

  for (const relativePath of relativePaths) {
    const base = relativePath.split("/").pop()?.toLowerCase() ?? "";
    if (!MANIFEST_FILES.has(base)) {
      continue;
    }
    const absolute = path.join(root, relativePath);

    if (base === "package.json") {
      const parsed = await readJsonFile<{
        name?: string;
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
        peerDependencies?: Record<string, string>;
        optionalDependencies?: Record<string, string>;
      }>(absolute, maxReadBytes);
      if (!parsed.ok) {
        continue;
      }
      const pkgRoot = dirnamePosix(relativePath);
      const depNames = new Set<string>();
      for (const bag of [
        parsed.data.dependencies,
        parsed.data.devDependencies,
        parsed.data.peerDependencies,
        parsed.data.optionalDependencies,
      ]) {
        if (!bag) {
          continue;
        }
        for (const name of Object.keys(bag)) {
          depNames.add(name);
        }
      }
      if (parsed.data.name) {
        packages.push({
          name: parsed.data.name,
          root: pkgRoot,
          dependencies: [...depNames].sort((a, b) => a.localeCompare(b)),
        });
      }
      continue;
    }

    if (base === "tsconfig.json" || base === "tsconfig.base.json" || base === "jsconfig.json") {
      const parsed = await readJsonFile<{
        compilerOptions?: { paths?: Record<string, string[]> };
      }>(absolute, maxReadBytes);
      if (!parsed.ok || !parsed.data.compilerOptions?.paths) {
        continue;
      }
      const configDir = dirnamePosix(relativePath);
      for (const [pattern, targets] of Object.entries(parsed.data.compilerOptions.paths)) {
        const target = targets[0];
        if (!target) {
          continue;
        }
        const mappedTarget = joinPosix(configDir, target);
        if (pattern.includes("*")) {
          const [patternPrefix = "", patternSuffix = ""] = pattern.split("*");
          const [targetPrefix = "", targetSuffix = ""] = mappedTarget.split("*");
          aliases.push({
            star: { patternPrefix, patternSuffix, targetPrefix, targetSuffix },
          });
        } else {
          aliases.push({ exact: { pattern, target: mappedTarget } });
        }
      }
      continue;
    }

    if (base === "go.mod") {
      const text = await readTextFile(absolute, maxReadBytes);
      if (!text) {
        continue;
      }
      const match = /^module\s+(\S+)/m.exec(text);
      if (match?.[1]) {
        goModule = match[1];
        goModuleRoot = dirnamePosix(relativePath);
      }
    }
  }

  aliases.sort((a, b) => {
    const aKey =
      a.exact?.pattern ?? `${a.star?.patternPrefix ?? ""}*${a.star?.patternSuffix ?? ""}`;
    const bKey =
      b.exact?.pattern ?? `${b.star?.patternPrefix ?? ""}*${b.star?.patternSuffix ?? ""}`;
    return bKey.length - aKey.length || aKey.localeCompare(bKey);
  });
  return { packages, aliases, goModule, goModuleRoot };
}

function packageLabel(name: string): string {
  const short = name.includes("/") ? (name.split("/").pop() ?? name) : name;
  return titleCaseSegment(short);
}

function moduleLabel(relativePath: string, index: WorkspaceIndex): string {
  for (const root of index.packageRoots) {
    if (root === "") {
      continue;
    }
    if (relativePath === root || relativePath.startsWith(`${root}/`)) {
      const pkg = [...index.packagesByName.values()].find((p) => p.root === root);
      if (pkg) {
        return packageLabel(pkg.name);
      }
      const segment = root
        .split("/")
        .filter((s) => !LABEL_STOP_SEGMENTS.has(s.toLowerCase()))
        .pop();
      if (segment) {
        return titleCaseSegment(segment);
      }
    }
  }

  const parts = relativePath.split("/");
  const file = parts[parts.length - 1] ?? relativePath;
  const dirs = parts.slice(0, -1);

  // Prefer the rightmost meaningful directory (domain/package folder).
  for (let i = dirs.length - 1; i >= 0; i -= 1) {
    const part = dirs[i] ?? "";
    const lower = part.toLowerCase();
    if (LABEL_STOP_SEGMENTS.has(lower)) {
      continue;
    }
    if (part.includes(".")) {
      continue;
    }
    if (/^[a-zA-Z][\w-]*$/.test(part)) {
      return titleCaseSegment(part);
    }
  }

  return titleCaseSegment(stripExtension(file));
}

function resolveJsSpecifier(
  fromFile: string,
  specifier: string,
  index: WorkspaceIndex,
): { targetFile: string | null; packageName: string | null } {
  if (specifier.startsWith(".")) {
    const base = joinPosix(dirnamePosix(fromFile), specifier);
    return { targetFile: lookupResolved(index.resolveMap, base), packageName: null };
  }

  for (const alias of index.aliases) {
    if (alias.exact && specifier === alias.exact.pattern) {
      const hit = lookupResolved(index.resolveMap, alias.exact.target);
      if (hit) {
        return { targetFile: hit, packageName: null };
      }
    }
    if (alias.star) {
      const { patternPrefix, patternSuffix, targetPrefix, targetSuffix } = alias.star;
      if (
        specifier.startsWith(patternPrefix) &&
        specifier.endsWith(patternSuffix) &&
        specifier.length >= patternPrefix.length + patternSuffix.length
      ) {
        const mid = specifier.slice(patternPrefix.length, specifier.length - patternSuffix.length);
        const mapped = `${targetPrefix}${mid}${targetSuffix}`;
        const hit = lookupResolved(index.resolveMap, mapped);
        if (hit) {
          return { targetFile: hit, packageName: null };
        }
      }
    }
  }

  const pkg = index.packagesByName.get(specifier);
  if (pkg) {
    return { targetFile: null, packageName: pkg.name };
  }

  // @scope/name/subpath → package name @scope/name
  if (specifier.startsWith("@")) {
    const parts = specifier.split("/");
    if (parts.length >= 2) {
      const name = `${parts[0]}/${parts[1]}`;
      const named = index.packagesByName.get(name);
      if (named) {
        const rest = parts.slice(2).join("/");
        if (rest) {
          const candidate = joinPosix(named.root, "src", rest);
          const hit =
            lookupResolved(index.resolveMap, candidate) ??
            lookupResolved(index.resolveMap, joinPosix(named.root, rest));
          if (hit) {
            return { targetFile: hit, packageName: null };
          }
        }
        return { targetFile: null, packageName: named.name };
      }
    }
  }

  return { targetFile: null, packageName: null };
}

function resolveDartSpecifier(
  fromFile: string,
  specifier: string,
  index: WorkspaceIndex,
): { targetFile: string | null; packageName: string | null } {
  if (specifier.startsWith("package:")) {
    const body = specifier.slice("package:".length);
    const slash = body.indexOf("/");
    const pkgName = slash >= 0 ? body.slice(0, slash) : body;
    const rest = slash >= 0 ? body.slice(slash + 1) : "";
    // Map package:foo/bar.dart → lib/bar.dart under a matching folder named foo, or pub name
    for (const file of index.files) {
      if (!file.endsWith(`/${rest}`) && file !== rest) {
        continue;
      }
      if (file.includes(`/${pkgName}/`) || file.startsWith(`${pkgName}/`)) {
        return { targetFile: file, packageName: null };
      }
    }
    return { targetFile: null, packageName: null };
  }
  if (specifier.startsWith("dart:")) {
    return { targetFile: null, packageName: null };
  }
  const base = joinPosix(dirnamePosix(fromFile), specifier);
  return { targetFile: lookupResolved(index.resolveMap, base), packageName: null };
}

function resolveJavaSpecifier(specifier: string, index: WorkspaceIndex): string | null {
  const asPath = specifier.replace(/\./g, "/");
  const direct =
    lookupResolved(index.resolveMap, asPath) ??
    lookupResolved(index.resolveMap, `src/main/java/${asPath}`);
  if (direct) {
    return direct;
  }
  for (const file of index.files) {
    if (file.endsWith(`/${asPath}.java`) || stripExtension(file).endsWith(`/${asPath}`)) {
      return file;
    }
  }
  return null;
}

function resolveGoSpecifier(specifier: string, index: WorkspaceIndex): string | null {
  if (index.goModule && specifier.startsWith(`${index.goModule}/`)) {
    const rest = specifier.slice(index.goModule.length + 1);
    const base = index.goModuleRoot ? joinPosix(index.goModuleRoot, rest) : rest;
    const direct =
      lookupResolved(index.resolveMap, base) ?? lookupResolved(index.resolveMap, `${base}.go`);
    if (direct) {
      return direct;
    }
    for (const file of index.files) {
      if (file.startsWith(`${base}/`) && file.endsWith(".go")) {
        return file;
      }
    }
  }
  return lookupResolved(index.resolveMap, specifier);
}

function resolvePythonSpecifier(
  fromFile: string,
  specifier: string,
  index: WorkspaceIndex,
): string | null {
  if (specifier.startsWith(".")) {
    let dots = 0;
    while (specifier[dots] === ".") {
      dots += 1;
    }
    const rest = specifier.slice(dots).replace(/\./g, "/");
    let dir = dirnamePosix(fromFile);
    for (let i = 1; i < dots; i += 1) {
      dir = dirnamePosix(dir);
    }
    const base = rest ? joinPosix(dir, rest) : dir;
    return lookupResolved(index.resolveMap, base);
  }
  const asPath = specifier.replace(/\./g, "/");
  const direct =
    lookupResolved(index.resolveMap, asPath) ??
    lookupResolved(index.resolveMap, joinPosix(dirnamePosix(fromFile), asPath));
  if (direct) {
    return direct;
  }
  for (const file of index.files) {
    const stripped = stripExtension(file);
    if (stripped === asPath || stripped.endsWith(`/${asPath}`)) {
      return file;
    }
  }
  return null;
}

function resolveRustSpecifier(
  fromFile: string,
  specifier: string,
  index: WorkspaceIndex,
): string | null {
  if (specifier.startsWith("crate::")) {
    const rest = specifier.slice("crate::".length).split("::")[0] ?? "";
    const crateRoot = fromFile.includes("/src/")
      ? fromFile.slice(0, fromFile.indexOf("/src/") + "/src".length)
      : dirnamePosix(fromFile);
    return (
      lookupResolved(index.resolveMap, joinPosix(crateRoot, rest)) ??
      lookupResolved(index.resolveMap, joinPosix(crateRoot, `${rest}.rs`))
    );
  }
  if (specifier.startsWith("super::")) {
    const rest = specifier.slice("super::".length).split("::")[0] ?? "";
    const base = joinPosix(dirnamePosix(dirnamePosix(fromFile)), rest);
    return lookupResolved(index.resolveMap, base);
  }
  // bare mod name
  if (/^[a-zA-Z_][\w]*$/.test(specifier)) {
    return lookupResolved(index.resolveMap, joinPosix(dirnamePosix(fromFile), specifier));
  }
  const first = specifier.split("::")[0] ?? specifier;
  return lookupResolved(index.resolveMap, joinPosix(dirnamePosix(fromFile), first));
}

function resolvePhpSpecifier(specifier: string, index: WorkspaceIndex): string | null {
  const asPath = specifier.replace(/^App\//, "app/").replace(/\\/g, "/");
  return (
    lookupResolved(index.resolveMap, asPath) ??
    lookupResolved(index.resolveMap, `${asPath}.php`) ??
    [...index.files].find((f) => stripExtension(f).endsWith(`/${asPath.split("/").pop()}`)) ??
    null
  );
}

function resolveReference(
  fromFile: string,
  ref: ExtractedReference,
  index: WorkspaceIndex,
): { targetFile: string | null; packageName: string | null } {
  const { specifier } = ref;
  const ext = fromFile.split(".").pop()?.toLowerCase() ?? "";

  if (ext === "dart") {
    return resolveDartSpecifier(fromFile, specifier, index);
  }
  if (ext === "java") {
    return { targetFile: resolveJavaSpecifier(specifier, index), packageName: null };
  }
  if (ext === "go") {
    return { targetFile: resolveGoSpecifier(specifier, index), packageName: null };
  }
  if (ext === "py") {
    return { targetFile: resolvePythonSpecifier(fromFile, specifier, index), packageName: null };
  }
  if (ext === "rs") {
    return { targetFile: resolveRustSpecifier(fromFile, specifier, index), packageName: null };
  }
  if (ext === "php") {
    return { targetFile: resolvePhpSpecifier(specifier, index), packageName: null };
  }
  return resolveJsSpecifier(fromFile, specifier, index);
}

function evidencePhrase(
  fromFile: string,
  targetFile: string | null,
  packageName: string | null,
  type: DependencyRelationType,
  specifier: string,
): string {
  if (targetFile) {
    const verb =
      type === "require"
        ? "requires"
        : type === "dynamic-import"
          ? "dynamically imports"
          : type === "export"
            ? "re-exports"
            : type === "route"
              ? "routes to"
              : type === "module"
                ? "modules"
                : "imports";
    return `${fromFile} ${verb} ${targetFile}`;
  }
  if (packageName) {
    return `${fromFile} references package ${packageName} via ${specifier}`;
  }
  return `${fromFile} references ${specifier}`;
}

function addEdge(
  bucket: Map<string, DependencyMatch>,
  edge: Omit<DependencyMatch, "evidence"> & { evidence: string },
): void {
  if (
    edge.from === edge.to &&
    edge.type !== "service" &&
    edge.type !== "repository" &&
    edge.type !== "module"
  ) {
    return;
  }
  const key = `${edge.from}\0${edge.to}\0${edge.type}`;
  const existing = bucket.get(key);
  if (!existing) {
    bucket.set(key, {
      from: edge.from,
      to: edge.to,
      type: edge.type,
      confidence: edge.confidence,
      evidence: [edge.evidence],
    });
    return;
  }
  existing.confidence = clampConfidence(Math.max(existing.confidence, edge.confidence));
  if (!existing.evidence.includes(edge.evidence)) {
    existing.evidence.push(edge.evidence);
    existing.evidence.sort((a, b) => a.localeCompare(b));
  }
}

/**
 * Discover structural repository dependencies via deterministic import/reference heuristics.
 * Isolated from scan — internal understanding API only.
 */
export async function discoverDependencies(
  options: DependencyDiscoveryOptions = {},
): Promise<DependencyDiscoveryResult> {
  const started = performance.now();
  const cwd = options.cwd ?? process.cwd();
  const minConfidence = options.minConfidence ?? 0.7;
  const maxReadBytes = options.maxReadBytes ?? 256 * 1024;

  const discovery = await discoverFiles({ root: cwd });
  const relativePaths = discovery.files.map((f) => f.relativePath);
  const fileSet = new Set(relativePaths);

  const { packages, aliases, goModule, goModuleRoot } = await loadPackages(
    cwd,
    relativePaths,
    maxReadBytes,
  );
  const packagesByName = new Map(packages.map((p) => [p.name, p]));
  const packageRoots = [...new Set(packages.map((p) => p.root))].sort(
    (a, b) => b.length - a.length || a.localeCompare(b),
  );

  const index: WorkspaceIndex = {
    files: fileSet,
    resolveMap: buildResolveMap(fileSet),
    packagesByName,
    packageRoots,
    aliases,
    goModule,
    goModuleRoot,
  };

  const edges = new Map<string, DependencyMatch>();
  let filesInspected = 0;

  // Manifest package → package edges (workspace / monorepo only)
  for (const pkg of packages) {
    for (const depName of pkg.dependencies) {
      const target = packagesByName.get(depName);
      if (!target) {
        continue;
      }
      const fromLabel = packageLabel(pkg.name);
      const toLabel = packageLabel(target.name);
      const manifestPath = pkg.root ? `${pkg.root}/package.json` : "package.json";
      addEdge(edges, {
        from: fromLabel,
        to: toLabel,
        type: "package",
        confidence: RELATION_CONFIDENCE.package,
        evidence: `${manifestPath} declares dependency on ${target.name}`,
      });
    }
  }

  for (const file of discovery.files) {
    if (!isSourceFile(file.relativePath)) {
      continue;
    }
    const content = await readTextFile(file.absolutePath, maxReadBytes);
    if (content === null) {
      continue;
    }
    filesInspected += 1;
    const refs = extractReferences(file.relativePath, content);
    const fromLabel = moduleLabel(file.relativePath, index);

    for (const ref of refs) {
      // Never invent edges: only emit when the specifier resolves inside the repo.
      const resolved = resolveReference(file.relativePath, ref, index);
      if (!resolved.targetFile && !resolved.packageName) {
        continue;
      }

      let type = ref.type;
      let toLabel: string;
      if (resolved.targetFile) {
        type = refineRelationType({
          base: type,
          sourcePath: file.relativePath,
          targetPath: resolved.targetFile,
        });
        toLabel = moduleLabel(resolved.targetFile, index);
      } else {
        toLabel = packageLabel(resolved.packageName!);
      }

      const confidence =
        type === ref.type ? ref.confidence : clampConfidence(RELATION_CONFIDENCE[type]);

      addEdge(edges, {
        from: fromLabel,
        to: toLabel,
        type,
        confidence,
        evidence: evidencePhrase(
          file.relativePath,
          resolved.targetFile,
          resolved.packageName,
          type,
          ref.specifier,
        ),
      });
    }
  }

  const dependencies = [...edges.values()]
    .filter((d) => d.confidence >= minConfidence && d.evidence.length > 0)
    .sort((a, b) => {
      if (b.confidence !== a.confidence) {
        return b.confidence - a.confidence;
      }
      const fromCmp = a.from.localeCompare(b.from);
      if (fromCmp !== 0) {
        return fromCmp;
      }
      const toCmp = a.to.localeCompare(b.to);
      if (toCmp !== 0) {
        return toCmp;
      }
      return a.type.localeCompare(b.type);
    });

  return {
    dependencies,
    timingMs: Math.round(performance.now() - started),
    filesConsidered: discovery.files.length,
    filesInspected,
  };
}

export function scoreDependencyConfidence(type: DependencyRelationType): number {
  return RELATION_CONFIDENCE[type];
}
