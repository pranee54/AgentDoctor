/** Path / name segments ignored when mining domain tokens. */
export const DOMAIN_STOP_SEGMENTS = new Set([
  "",
  "src",
  "lib",
  "libs",
  "app",
  "apps",
  "packages",
  "package",
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
  "styles",
  "css",
  "js",
  "ts",
  "tsx",
  "jsx",
  "mjs",
  "cjs",
  "py",
  "go",
  "rs",
  "java",
  "kt",
  "php",
  "rb",
  "dart",
  "test",
  "tests",
  "spec",
  "specs",
  "__tests__",
  "fixtures",
  "mocks",
  "mock",
  "stub",
  "stubs",
  "types",
  "type",
  "typings",
  "interfaces",
  "interface",
  "utils",
  "util",
  "helpers",
  "helper",
  "common",
  "shared",
  "core",
  "index",
  "main",
  "init",
  "config",
  "configs",
  "constants",
  "constant",
  "models",
  "model",
  "dto",
  "entity",
  "entities",
  "repository",
  "repositories",
  "service",
  "services",
  "controller",
  "controllers",
  "handler",
  "handlers",
  "middleware",
  "route",
  "routes",
  "router",
  "api",
  "v1",
  "v2",
  "v3",
  "http",
  "grpc",
  "graphql",
  "component",
  "components",
  "hook",
  "hooks",
  "page",
  "pages",
  "view",
  "views",
  "provider",
  "providers",
  "store",
  "stores",
  "context",
  "contexts",
  "domain",
  "domains",
  "feature",
  "features",
  "node_modules",
  "vendor",
]);

/**
 * Split a relative path into lowercase semantic tokens.
 * Deterministic: camelCase, snake_case, kebab-case, path segments.
 */
export function tokenizeRelativePath(relativePath: string): string[] {
  const normalized = relativePath.replace(/\\/g, "/");
  const withoutExt = normalized.replace(/\.[a-z0-9]+$/i, "");
  const rawParts = withoutExt.split(/[/_.-]+/);

  const tokens: string[] = [];
  for (const part of rawParts) {
    if (!part) {
      continue;
    }
    const camelParts = part.split(/(?<=[a-z0-9])(?=[A-Z])/);
    for (const piece of camelParts) {
      const token = piece.toLowerCase();
      if (token.length < 2) {
        continue;
      }
      if (DOMAIN_STOP_SEGMENTS.has(token)) {
        continue;
      }
      if (/^\d+$/.test(token)) {
        continue;
      }
      tokens.push(token);
    }
  }
  return tokens;
}
