import path from "node:path";

import { discoverFiles } from "../../../discovery/files.js";
import { readTextFile } from "../../../utils/fs.js";
import { discoverDependencies } from "../dependencies/index.js";
import { extractReferences } from "../dependencies/extract.js";
import { isSourceFile } from "../dependencies/models.js";
import { discoverDomains } from "../domain/index.js";
import { discoverEntrypoints } from "../entrypoints/index.js";
import { domainForToken, tokenizeRelativePath } from "../shared/index.js";
import {
  classifyComponent,
  extractSemanticSignals,
  featureNameFromPath,
  pascalCaseName,
} from "./extract.js";
import { STRENGTH_BOOST, clampConfidence, findRolePairRule, maxStrength } from "./models.js";
import type {
  ClassifiedComponent,
  RelationshipDiscoveryOptions,
  RelationshipDiscoveryResult,
  RelationshipKind,
  RelationshipMatch,
  RelationshipStrength,
} from "./types.js";

function dirnamePosix(relativePath: string): string {
  const idx = relativePath.lastIndexOf("/");
  return idx < 0 ? "" : relativePath.slice(0, idx);
}

function joinPosix(...parts: string[]): string {
  const stack: string[] = [];
  for (const part of parts.join("/").split("/")) {
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
    if (
      relativePath.endsWith("/index.ts") ||
      relativePath.endsWith("/index.js") ||
      relativePath.endsWith("/mod.rs") ||
      relativePath.endsWith("/__init__.py")
    ) {
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
  if (/\.(js|jsx|mjs|cjs)$/i.test(normalized)) {
    candidates.push(normalized.replace(/\.jsx$/i, ".tsx").replace(/\.js$/i, ".ts"));
    candidates.push(stripExtension(normalized));
  }
  const extensions = [
    "",
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".dart",
    ".java",
    ".go",
    ".py",
    ".rs",
    ".php",
    "/index.ts",
    "/index.js",
    "/mod.rs",
  ];
  for (const entry of candidates) {
    for (const ext of extensions) {
      const hit = resolveMap.get(entry + ext);
      if (hit) {
        return hit;
      }
    }
  }
  return null;
}

function resolveSpecifier(
  fromFile: string,
  specifier: string,
  resolveMap: Map<string, string>,
  files: Set<string>,
): string | null {
  if (specifier.startsWith(".")) {
    return lookupResolved(resolveMap, joinPosix(dirnamePosix(fromFile), specifier));
  }
  // Dart package-relative and simple basename within same tree
  if (specifier.endsWith(".dart") && !specifier.includes(":")) {
    const base = joinPosix(dirnamePosix(fromFile), specifier);
    const hit = lookupResolved(resolveMap, base);
    if (hit) {
      return hit;
    }
  }
  // Python absolute package imports (only from .py sources)
  if (fromFile.endsWith(".py") && /^[a-zA-Z_][\w.]*$/.test(specifier)) {
    const asPath = specifier.replace(/\./g, "/");
    for (const file of files) {
      const stripped = stripExtension(file);
      if (stripped === asPath || stripped.endsWith(`/${asPath}`)) {
        return file;
      }
    }
  }
  // Java package → path
  if (fromFile.endsWith(".java") && /^[a-z]+(\.[a-zA-Z_][\w]*)+$/.test(specifier)) {
    const asPath = specifier.replace(/\./g, "/");
    for (const file of files) {
      if (stripExtension(file).endsWith(`/${asPath}`) || file.endsWith(`/${asPath}.java`)) {
        return file;
      }
    }
  }
  // Suffix match for PHP use statements
  if (specifier.includes("/") || specifier.includes("\\")) {
    const asPath = specifier.replace(/\\/g, "/").replace(/^App\//, "app/");
    for (const file of files) {
      if (
        stripExtension(file).endsWith(`/${asPath}`) ||
        stripExtension(file).endsWith(`/${asPath.split("/").pop()}`)
      ) {
        return file;
      }
    }
  }
  return null;
}

function addRelationship(bucket: Map<string, RelationshipMatch>, edge: RelationshipMatch): void {
  if (edge.source === edge.target) {
    return;
  }
  if (edge.evidence.length === 0) {
    return;
  }
  const key = `${edge.source}\0${edge.target}\0${edge.relationship}`;
  const existing = bucket.get(key);
  if (!existing) {
    bucket.set(key, {
      ...edge,
      evidence: [...edge.evidence].sort((a, b) => a.localeCompare(b)),
    });
    return;
  }
  existing.confidence = clampConfidence(Math.max(existing.confidence, edge.confidence));
  existing.strength = maxStrength(existing.strength, edge.strength);
  for (const item of edge.evidence) {
    if (!existing.evidence.includes(item)) {
      existing.evidence.push(item);
    }
  }
  existing.evidence.sort((a, b) => a.localeCompare(b));
  if (edge.bidirectional) {
    existing.bidirectional = true;
  }
}

function scoreRelationship(options: {
  base: number;
  strength: RelationshipStrength;
  evidenceCount: number;
  injectionBoost?: boolean;
}): number {
  const { base, strength, evidenceCount, injectionBoost } = options;
  let value = base + STRENGTH_BOOST[strength];
  if (injectionBoost) {
    value += 0.02;
  }
  value += Math.min(evidenceCount - 1, 3) * 0.005;
  return clampConfidence(value);
}

/**
 * Discover semantic component relationships using deterministic heuristics.
 * Reuses dependency, entrypoint, and domain discovery. Isolated from scan/CLI.
 */
export async function discoverRelationships(
  options: RelationshipDiscoveryOptions = {},
): Promise<RelationshipDiscoveryResult> {
  const started = performance.now();
  const cwd = options.cwd ?? process.cwd();
  const minConfidence = options.minConfidence ?? 0.75;
  const maxReadBytes = options.maxReadBytes ?? 256 * 1024;

  const discovery = await discoverFiles({ root: cwd });
  const fileSet = new Set(discovery.files.map((f) => f.relativePath));
  const resolveMap = buildResolveMap(fileSet);

  const [dependencies, entrypoints, domains] = await Promise.all([
    options.dependencies
      ? Promise.resolve(options.dependencies)
      : discoverDependencies({ cwd, maxReadBytes }),
    options.entrypoints
      ? Promise.resolve(options.entrypoints)
      : discoverEntrypoints({ cwd, maxReadBytes }),
    options.domains ? Promise.resolve(options.domains) : discoverDomains({ cwd }),
  ]);

  const components = new Map<string, ClassifiedComponent>();
  const contentByFile = new Map<string, string>();
  let filesInspected = 0;

  for (const file of discovery.files) {
    if (!isSourceFile(file.relativePath)) {
      continue;
    }
    const content = await readTextFile(file.absolutePath, maxReadBytes);
    if (content === null) {
      continue;
    }
    filesInspected += 1;
    contentByFile.set(file.relativePath, content);
    const component = classifyComponent(file.relativePath, content);
    if (component) {
      components.set(file.relativePath, component);
    }
  }

  const byName = new Map<string, ClassifiedComponent>();
  for (const component of components.values()) {
    if (!byName.has(component.name)) {
      byName.set(component.name, component);
    }
  }

  const bucket = new Map<string, RelationshipMatch>();

  // DEPENDS_ON from dependency graph (module/package level)
  for (const dep of dependencies.dependencies) {
    const strength: RelationshipStrength =
      dep.type === "dynamic-import" ? "weak" : dep.type === "package" ? "strong" : "medium";
    addRelationship(bucket, {
      source: dep.from,
      target: dep.to,
      relationship: "DEPENDS_ON",
      confidence: scoreRelationship({
        base: Math.min(dep.confidence, 0.95),
        strength,
        evidenceCount: dep.evidence.length,
      }),
      evidence: dep.evidence.map((e) => `dependency: ${e}`),
      strength,
    });
  }

  // File-level import → semantic role relationships
  for (const [relativePath, content] of contentByFile) {
    const sourceComponent = components.get(relativePath);
    const refs = extractReferences(relativePath, content);
    const signals = extractSemanticSignals(content);

    for (const ref of refs) {
      const targetPath = resolveSpecifier(relativePath, ref.specifier, resolveMap, fileSet);
      if (!targetPath) {
        continue;
      }
      const targetComponent = components.get(targetPath);
      if (!sourceComponent || !targetComponent) {
        continue;
      }
      const rule = findRolePairRule(sourceComponent.role, targetComponent.role);
      if (!rule) {
        continue;
      }

      const injection = signals.some(
        (s) =>
          s.kind === "constructor-injection" &&
          (s.relatedName === targetComponent.name ||
            targetPath.toLowerCase().includes((s.relatedName ?? "").toLowerCase())),
      );
      const callSignal = signals.some(
        (s) => s.kind === "call" && s.relatedName === targetComponent.name,
      );
      let relationship: RelationshipKind = rule.relationship;
      let strength = rule.strength;
      if (injection) {
        strength = "strong";
      }
      if (callSignal && relationship === "USES") {
        relationship = "CALLS";
        strength = maxStrength(strength, "medium");
      }

      const evidence = [`imports ${path.posix.basename(targetPath)}`];
      if (injection) {
        evidence.push("constructor injection");
      }
      if (callSignal) {
        evidence.push(`calls ${targetComponent.name}`);
      }
      evidence.push(`${sourceComponent.role} → ${targetComponent.role}`);

      addRelationship(bucket, {
        source: sourceComponent.name,
        target: targetComponent.name,
        relationship,
        confidence: scoreRelationship({
          base: rule.baseConfidence,
          strength,
          evidenceCount: evidence.length,
          injectionBoost: injection,
        }),
        evidence,
        strength,
      });

      const sourceFeature = featureNameFromPath(relativePath);
      const targetFeature = featureNameFromPath(targetPath);
      if (
        sourceFeature &&
        targetFeature &&
        sourceFeature !== targetFeature &&
        (relationship === "USES" || relationship === "CALLS")
      ) {
        addRelationship(bucket, {
          source: sourceFeature,
          target: targetFeature,
          relationship: "CONSUMES",
          confidence: scoreRelationship({
            base: 0.82,
            strength: "medium",
            evidenceCount: 1,
          }),
          evidence: [
            `${sourceComponent.name} ${relationship.toLowerCase()} ${targetComponent.name}`,
            `${relativePath} → ${targetPath}`,
          ],
          strength: "medium",
        });
      }
    }

    // IMPLEMENTS from explicit language signals
    for (const signal of signals) {
      if (signal.kind !== "implements" || !signal.relatedName || !sourceComponent) {
        continue;
      }
      addRelationship(bucket, {
        source: sourceComponent.name,
        target: signal.relatedName,
        relationship: "IMPLEMENTS",
        confidence: scoreRelationship({
          base: 0.97,
          strength: "strong",
          evidenceCount: 1,
        }),
        evidence: [signal.label, `in ${relativePath}`],
        strength: "strong",
      });
    }
  }

  // CONTAINS / OWNS: feature folder contains classified components
  for (const component of components.values()) {
    const feature = featureNameFromPath(component.file);
    if (!feature || feature === component.name) {
      continue;
    }
    addRelationship(bucket, {
      source: feature,
      target: component.name,
      relationship: "CONTAINS",
      confidence: scoreRelationship({
        base: 0.86,
        strength: "strong",
        evidenceCount: 1,
      }),
      evidence: [`${component.file} lives under feature ${feature}`],
      strength: "strong",
    });
  }

  // Package.json workspace roots OWNS/CONTAINS features
  for (const file of discovery.files) {
    if (!file.relativePath.endsWith("package.json")) {
      continue;
    }
    const pkgDir = dirnamePosix(file.relativePath);
    const pkgLabel = pkgDir
      ? pascalCaseName(pkgDir.split("/").filter(Boolean).pop() ?? "Package")
      : "RootPackage";
    for (const component of components.values()) {
      if (pkgDir && !component.file.startsWith(`${pkgDir}/`)) {
        continue;
      }
      if (!pkgDir && component.file.includes("/")) {
        // root package only owns top-level when no nested package claims it
        continue;
      }
      if (component.role === "Module") {
        addRelationship(bucket, {
          source: pkgLabel,
          target: component.name,
          relationship: "CONTAINS",
          confidence: 0.9,
          evidence: [`${file.relativePath} package contains ${component.file}`],
          strength: "strong",
        });
      } else {
        const feature = featureNameFromPath(component.file);
        if (feature) {
          addRelationship(bucket, {
            source: pkgLabel,
            target: feature,
            relationship: "OWNS",
            confidence: 0.88,
            evidence: [`${file.relativePath} owns path ${component.file}`],
            strength: "strong",
          });
        }
      }
    }
  }

  // ENTERS: entrypoint → feature
  for (const entry of entrypoints.entrypoints) {
    const feature = featureNameFromPath(entry.file);
    const entryName =
      components.get(entry.file)?.name ??
      pascalCaseName(stripExtension(entry.file.split("/").pop() ?? "Entrypoint"));
    if (feature) {
      addRelationship(bucket, {
        source: entryName,
        target: feature,
        relationship: "ENTERS",
        confidence: scoreRelationship({
          base: Math.min(entry.confidence, 0.92),
          strength: "medium",
          evidenceCount: entry.evidence.length,
        }),
        evidence: [
          `entrypoint ${entry.file}`,
          ...entry.evidence.slice(0, 2).map((e) => `entry evidence: ${e}`),
        ],
        strength: "medium",
      });
    }
  }

  // Feature PROVIDES Domain (path tokens ∩ domain lexicon)
  for (const component of components.values()) {
    const feature = featureNameFromPath(component.file);
    if (!feature) {
      continue;
    }
    const tokens = tokenizeRelativePath(component.file);
    for (const token of tokens) {
      const domain = domainForToken(token);
      if (!domain) {
        continue;
      }
      const domainHit = domains.domains.find((d) => d.name === domain);
      if (!domainHit) {
        continue;
      }
      addRelationship(bucket, {
        source: feature,
        target: domain,
        relationship: "PROVIDES",
        confidence: scoreRelationship({
          base: Math.min(domainHit.confidence, 0.9),
          strength: "medium",
          evidenceCount: 1,
        }),
        evidence: [
          `${component.file} token "${token}" maps to domain ${domain}`,
          `domain evidence: ${domainHit.evidence[0] ?? component.file}`,
        ],
        strength: "medium",
      });
    }
  }

  // CONFIGURES: module files importing configuration
  for (const [relativePath, content] of contentByFile) {
    const source = components.get(relativePath);
    if (!source || source.role !== "Module") {
      continue;
    }
    const refs = extractReferences(relativePath, content);
    for (const ref of refs) {
      const targetPath = resolveSpecifier(relativePath, ref.specifier, resolveMap, fileSet);
      if (!targetPath) {
        continue;
      }
      const target = components.get(targetPath);
      if (!target || target.role !== "Configuration") {
        continue;
      }
      addRelationship(bucket, {
        source: source.name,
        target: target.name,
        relationship: "CONFIGURES",
        confidence: 0.92,
        evidence: [`imports ${path.posix.basename(targetPath)}`, "module configuration wiring"],
        strength: "strong",
      });
    }
  }

  // Mark bidirectional pairs
  for (const edge of bucket.values()) {
    const reverseKey = `${edge.target}\0${edge.source}\0${edge.relationship}`;
    const reverseSame = bucket.get(reverseKey);
    if (reverseSame) {
      edge.bidirectional = true;
      reverseSame.bidirectional = true;
      continue;
    }
    // USES ↔ CALLS / DEPENDS_ON considered bidirectional semantic pair
    for (const kind of [
      "USES",
      "CALLS",
      "DEPENDS_ON",
      "PROVIDES",
      "CONSUMES",
    ] as RelationshipKind[]) {
      const alt = bucket.get(`${edge.target}\0${edge.source}\0${kind}`);
      if (alt) {
        edge.bidirectional = true;
        alt.bidirectional = true;
      }
    }
  }

  const relationships = [...bucket.values()]
    .filter((r) => r.confidence >= minConfidence && r.evidence.length > 0)
    .sort((a, b) => {
      if (b.confidence !== a.confidence) {
        return b.confidence - a.confidence;
      }
      const rel = a.relationship.localeCompare(b.relationship);
      if (rel !== 0) {
        return rel;
      }
      const src = a.source.localeCompare(b.source);
      if (src !== 0) {
        return src;
      }
      return a.target.localeCompare(b.target);
    });

  return {
    relationships,
    timingMs: Math.round(performance.now() - started),
    filesConsidered: discovery.files.length,
    filesInspected,
  };
}

export function scoreRelationshipConfidence(options: {
  base: number;
  strength: RelationshipStrength;
  evidenceCount: number;
}): number {
  return scoreRelationship(options);
}
