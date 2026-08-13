import { ROLE_PATH_PATTERNS } from "./models.js";
import type { ClassifiedComponent, ComponentRole, SemanticSignal } from "./types.js";

function basename(relativePath: string): string {
  const parts = relativePath.replace(/\\/g, "/").split("/");
  return parts[parts.length - 1] ?? relativePath;
}

function stripExtension(name: string): string {
  return name.replace(/\.[a-z0-9]+$/i, "");
}

/**
 * Convert file stem to PascalCase component name.
 * checkout.controller → CheckoutController; payment_service → PaymentService
 */
export function pascalCaseName(stem: string): string {
  const parts = stem.split(/[._\-/]+/).filter(Boolean);
  return parts.map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()).join("");
}

export function classifyRoleFromPath(relativePath: string): ComponentRole | null {
  const path = relativePath.replace(/\\/g, "/");
  for (const entry of ROLE_PATH_PATTERNS) {
    if (entry.pattern.test(path)) {
      return entry.role;
    }
  }
  return null;
}

export function extractPrimaryClassName(content: string): string | null {
  const patterns = [
    /\bexport\s+(?:default\s+)?class\s+([A-Z][A-Za-z0-9_]*)/,
    /\bclass\s+([A-Z][A-Za-z0-9_]*)\b/,
    /\bexport\s+(?:default\s+)?(?:function|const)\s+([A-Z][A-Za-z0-9_]*)/,
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(content);
    if (match?.[1]) {
      return match[1];
    }
  }
  return null;
}

export function classifyComponent(
  relativePath: string,
  content: string,
): ClassifiedComponent | null {
  const role = classifyRoleFromPath(relativePath);
  if (!role) {
    return null;
  }
  const className = extractPrimaryClassName(content);
  const stem = stripExtension(basename(relativePath));
  const name = className ?? pascalCaseName(stem);
  return { name, role, file: relativePath.replace(/\\/g, "/") };
}

/**
 * Extract semantic relationship signals from source text (deterministic regex).
 */
export function extractSemanticSignals(content: string): SemanticSignal[] {
  const signals: SemanticSignal[] = [];

  const ctorInject =
    /constructor\s*\(\s*(?:private|public|protected|readonly|\s)*\s*(?:readonly\s+)?([A-Za-z_][\w]*)\s*:\s*([A-Z][A-Za-z0-9_]*)/g;
  for (const match of content.matchAll(ctorInject)) {
    const relatedName = match[2];
    if (!relatedName) {
      continue;
    }
    signals.push({
      kind: "constructor-injection",
      label: "constructor injection",
      relatedName,
    });
  }

  const nestInject = /@Inject(?:Repository)?\s*\(\s*([A-Z][A-Za-z0-9_]*)/g;
  for (const match of content.matchAll(nestInject)) {
    const relatedName = match[1];
    if (!relatedName) {
      continue;
    }
    signals.push({
      kind: "constructor-injection",
      label: "constructor injection",
      relatedName,
    });
  }

  const paramInject =
    /constructor\s*\([^)]*\b([A-Z][A-Za-z0-9_]*(?:Service|Repository|Bloc|Controller))\b/g;
  for (const match of content.matchAll(paramInject)) {
    const relatedName = match[1];
    if (!relatedName) {
      continue;
    }
    signals.push({
      kind: "constructor-injection",
      label: "constructor injection",
      relatedName,
    });
  }

  const implementsRe = /\bimplements\s+([A-Z][A-Za-z0-9_]*(?:\s*,\s*[A-Z][A-Za-z0-9_]*)*)/g;
  for (const match of content.matchAll(implementsRe)) {
    for (const name of (match[1] ?? "").split(",")) {
      const trimmed = name.trim();
      if (trimmed) {
        signals.push({ kind: "implements", label: `implements ${trimmed}`, relatedName: trimmed });
      }
    }
  }

  const extendsRe = /\bextends\s+([A-Z][A-Za-z0-9_]*)/g;
  for (const match of content.matchAll(extendsRe)) {
    const relatedName = match[1];
    if (!relatedName) {
      continue;
    }
    signals.push({
      kind: "extends",
      label: `extends ${relatedName}`,
      relatedName,
    });
  }

  if (/\bBlocProvider\b|\bCubit\b|\bBlocBuilder\b/.test(content)) {
    signals.push({ kind: "bloc-provider", label: "BlocProvider/Cubit usage" });
  }

  if (/@Entity\b|\bSchema\.(?:Table|create)|CREATE TABLE/i.test(content)) {
    signals.push({ kind: "entity", label: "database entity/schema" });
  }

  const callRe = /\b([A-Z][A-Za-z0-9_]*(?:Service|Repository|Controller|Bloc))\s*\.\s*[a-zA-Z_]/g;
  for (const match of content.matchAll(callRe)) {
    const relatedName = match[1];
    if (!relatedName) {
      continue;
    }
    signals.push({
      kind: "call",
      label: `calls ${relatedName}`,
      relatedName,
    });
  }

  return signals;
}

export function featureNameFromPath(relativePath: string): string | null {
  const path = relativePath.replace(/\\/g, "/");
  const parts = path.split("/");
  const stop = new Set([
    "src",
    "lib",
    "app",
    "apps",
    "packages",
    "services",
    "modules",
    "controllers",
    "controller",
    "services",
    "service",
    "repositories",
    "repository",
    "routes",
    "config",
    "main",
    "java",
    "kotlin",
  ]);
  for (const part of parts.slice(0, -1)) {
    const lower = part.toLowerCase();
    if (stop.has(lower) || part.includes(".")) {
      continue;
    }
    if (/^[a-zA-Z][\w-]*$/.test(part) && part.length > 1) {
      return pascalCaseName(part);
    }
  }
  return null;
}
