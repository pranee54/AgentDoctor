/**
 * Shared path classification for rule precision.
 * Paths under intentional sample/test/demo trees are not production secrets for agent readiness.
 */

const SAMPLE_DIRECTORY_NAMES = new Set([
  "example",
  "examples",
  "fixture",
  "fixtures",
  "__fixtures__",
  "integration",
  "integrations",
  "mock",
  "mocks",
  "__mocks__",
  "sample",
  "samples",
  "test",
  "tests",
  "__tests__",
  "testdata",
  "test_data",
]);

/** Artifact dir names that commonly collide with source packages (`scripts/build`, `internal/build`). */
const ARTIFACT_NAMES_WITH_SOURCE_COLLISIONS = new Set(["build", "target"]);

/**
 * Parent dirs that host source code packages/modules, not generated output trees.
 * `packages/foo/dist` is still treated as generated (parent is the package name).
 */
const SOURCE_CODE_PARENT_DIRS = new Set([
  "bin",
  "cmd",
  "internal",
  "lib",
  "pkg",
  "script",
  "scripts",
  "src",
]);

/**
 * True when any path segment marks fixture, test, example, or sample material.
 * Uses POSIX relative paths (discovery output).
 */
export function isSampleOrTestPath(relativePath: string): boolean {
  if (!relativePath) {
    return false;
  }
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\.\//, "");
  if (!normalized) {
    return false;
  }
  return normalized.split("/").some((segment) => SAMPLE_DIRECTORY_NAMES.has(segment.toLowerCase()));
}

/**
 * True for paths like `scripts/build` or `internal/build` that are source trees
 * named after a common artifact directory, not generated output.
 */
export function isSourceNamedArtifactCollision(relativePath: string): boolean {
  if (!relativePath) {
    return false;
  }
  const parts = relativePath
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .replace(/\/+$/, "")
    .split("/")
    .filter(Boolean);
  if (parts.length < 2) {
    return false;
  }
  const leaf = parts[parts.length - 1]!.toLowerCase();
  if (!ARTIFACT_NAMES_WITH_SOURCE_COLLISIONS.has(leaf)) {
    return false;
  }
  const parent = parts[parts.length - 2]!.toLowerCase();
  return SOURCE_CODE_PARENT_DIRS.has(parent);
}
