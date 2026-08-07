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
  "testing",
  "__tests__",
  "testdata",
  "test_data",
  "spec",
  "specs",
  "demo",
  "demos",
  "e2e",
  "bench",
  "benchmark",
  "benchmarks",
  "playground",
  "playgrounds",
  "sandbox",
  "sandboxes",
]);

/** Strong tokens that mark intentional non-production material when present in a segment. */
const STRONG_TEST_TOKENS = new Set([
  "test",
  "tests",
  "testing",
  "fixture",
  "fixtures",
  "mock",
  "mocks",
  "testdata",
  "spec",
  "specs",
  "e2e",
  "bench",
  "benchmark",
  "benchmarks",
  "playground",
  "playgrounds",
  "sandbox",
  "sandboxes",
  "example",
  "examples",
  "sample",
  "samples",
  "demo",
  "demos",
]);

/**
 * Artifact dir names that commonly collide with source packages
 * (scripts/build, packages/foo/src/core/build, src/.../vendor).
 * Intentionally excludes dist — paths like src/js/dist are often real build output.
 */
const ARTIFACT_NAMES_WITH_SOURCE_COLLISIONS = new Set(["build", "target", "vendor"]);

/**
 * Dir names that host source code packages/modules, not generated output trees.
 * packages/foo/dist is still treated as generated (no source-marker ancestor).
 */
const SOURCE_CODE_MARKER_DIRS = new Set([
  "bin",
  "cmd",
  "internal",
  "lib",
  "pkg",
  "script",
  "scripts",
  "src",
]);

function splitCamelCase(segment: string): string[] {
  return segment
    .replace(/([a-z0-9])([A-Z])/g, "$1\0$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1\0$2")
    .split("\0")
    .filter(Boolean);
}

/**
 * True when a single path segment denotes sample/test/fixture material.
 * Handles exact names, leading-underscore variants, hyphen/underscore compounds,
 * and camelCase forms (dockerTest, testFixtures) without matching production roots.
 */
export function isSampleOrTestSegment(segment: string): boolean {
  if (!segment) {
    return false;
  }

  const lower = segment.toLowerCase();
  if (SAMPLE_DIRECTORY_NAMES.has(lower)) {
    return true;
  }

  // _fixture, _fixtures, _testdata, __fixture
  const stripped = lower.replace(/^_+/, "");
  if (stripped !== lower && SAMPLE_DIRECTORY_NAMES.has(stripped)) {
    return true;
  }

  // integration-test, smoke-test, docker-test, integration_tests, test-certs
  const hyphenTokens = lower.split(/[-_]+/).filter(Boolean);
  if (hyphenTokens.length >= 2 && hyphenTokens.some((token) => STRONG_TEST_TOKENS.has(token))) {
    return true;
  }

  // dockerTest, testFixtures, httpTestServer, integrationTests
  if (/[A-Z]/.test(segment)) {
    const camelTokens = splitCamelCase(segment).map((part) => part.toLowerCase());
    if (camelTokens.some((token) => STRONG_TEST_TOKENS.has(token))) {
      return true;
    }
  }

  return false;
}

/**
 * True when any path segment marks fixture, test, example, or sample material.
 * Uses POSIX relative paths (discovery output).
 * Filenames never qualify alone (root `test-private-key.pem` must still flag).
 */
export function isSampleOrTestPath(relativePath: string): boolean {
  if (!relativePath) {
    return false;
  }
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\.\//, "");
  if (!normalized) {
    return false;
  }
  const parts = normalized.split("/").filter(Boolean);
  return parts.some((segment, index) => {
    const isLast = index === parts.length - 1;
    const looksLikeFile = isLast && /\.[A-Za-z0-9_+-]+$/.test(segment);
    if (looksLikeFile) {
      return false;
    }
    return isSampleOrTestSegment(segment);
  });
}

/**
 * True for paths like `scripts/build`, `internal/build`, or `packages/foo/src/core/build`
 * that are source trees named after a common artifact directory, not generated output.
 * Any source-marker ancestor qualifies (not only the immediate parent).
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
  return parts.slice(0, -1).some((segment) => SOURCE_CODE_MARKER_DIRS.has(segment.toLowerCase()));
}

/**
 * True for checked-in GitHub Action package output (`.github/actions/<name>/dist`).
 * These are intentional publish artifacts, not ambient generated junk.
 */
export function isCheckedInGithubActionDist(relativePath: string): boolean {
  if (!relativePath) {
    return false;
  }
  const normalized = relativePath
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .replace(/\/+$/, "");
  return /^\.github\/actions\/[^/]+\/dist$/i.test(normalized);
}
