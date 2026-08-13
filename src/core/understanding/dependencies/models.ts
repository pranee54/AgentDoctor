import type { DependencyRelationType } from "./types.js";

/** Base confidence by relation type. Dynamic imports are intentionally lower. */
export const RELATION_CONFIDENCE: Readonly<Record<DependencyRelationType, number>> = {
  import: 0.97,
  export: 0.96,
  require: 0.95,
  "dynamic-import": 0.75,
  package: 0.9,
  module: 0.85,
  route: 0.8,
  service: 0.88,
  repository: 0.88,
};

export const SOURCE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".dart",
  ".java",
  ".go",
  ".py",
  ".rs",
  ".php",
]);

export const RESOLVE_EXTENSIONS = [
  "",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".dart",
  ".java",
  ".go",
  ".py",
  ".rs",
  ".php",
  "/index.ts",
  "/index.tsx",
  "/index.js",
  "/index.jsx",
  "/index.mjs",
  "/index.dart",
  "/__init__.py",
  "/mod.rs",
] as const;

export const MANIFEST_FILES = new Set([
  "package.json",
  "tsconfig.json",
  "tsconfig.base.json",
  "jsconfig.json",
  "pubspec.yaml",
  "go.mod",
  "cargo.toml",
  "pyproject.toml",
]);

/** Path segments skipped when deriving module labels. */
export const LABEL_STOP_SEGMENTS = new Set([
  "src",
  "lib",
  "libs",
  "app",
  "apps",
  "packages",
  "package",
  "services",
  "service",
  "modules",
  "module",
  "internal",
  "cmd",
  "bin",
  "dist",
  "build",
  "out",
  "public",
  "static",
  "assets",
  "test",
  "tests",
  "spec",
  "specs",
  "__tests__",
  "fixtures",
  "node_modules",
  "vendor",
  "main",
  "java",
  "kotlin",
  "resources",
]);

export function extensionOf(relativePath: string): string {
  const base = relativePath.split("/").pop() ?? relativePath;
  const dot = base.lastIndexOf(".");
  if (dot <= 0) {
    return "";
  }
  return base.slice(dot).toLowerCase();
}

export function isSourceFile(relativePath: string): boolean {
  return SOURCE_EXTENSIONS.has(extensionOf(relativePath));
}

export function titleCaseSegment(segment: string): string {
  if (!segment) {
    return segment;
  }
  const cleaned = segment.replace(/^@/, "").replace(/[^a-zA-Z0-9_-]/g, "");
  const parts = cleaned.split(/[-_]+/).filter(Boolean);
  if (parts.length === 0) {
    return segment;
  }
  return parts.map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()).join("");
}

export function clampConfidence(value: number): number {
  if (value < 0) {
    return 0;
  }
  if (value > 1) {
    return 1;
  }
  return Math.round(value * 100) / 100;
}
