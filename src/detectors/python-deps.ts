/**
 * Lightweight Python dependency name extraction from manifests.
 * Filename/table semantics only — does not evaluate environments.
 */

const SKIP_KEYS = new Set([
  "python",
  "package-mode",
  "packages",
  "include",
  "exclude",
  "readme",
  "homepage",
  "repository",
  "documentation",
  "keywords",
  "classifiers",
  "license",
  "authors",
  "maintainers",
  "dependencies",
  "dev-dependencies",
  "group",
]);

export function pyprojectHasPoetryTool(text: string): boolean {
  return /\[tool\.poetry(?:\.|\])/m.test(text);
}

export function extractPythonDependencyNames(text: string): string[] {
  const names = new Set<string>();

  for (const match of text.matchAll(/^\s*([A-Za-z0-9][A-Za-z0-9._-]*)\s*=\s*["'{[]/gm)) {
    const name = (match[1] ?? "").toLowerCase().replace(/_/g, "-");
    if (name && !SKIP_KEYS.has(name) && !name.startsWith("tool.")) {
      names.add(name);
    }
  }

  for (const match of text.matchAll(
    /["']([A-Za-z0-9][A-Za-z0-9._-]*)(?:\[[^\]]*\])?(?:\s*[><=! ~^,;]|["'])/g,
  )) {
    const name = (match[1] ?? "").toLowerCase().replace(/_/g, "-");
    if (name && !SKIP_KEYS.has(name)) {
      names.add(name);
    }
  }

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || line.startsWith("-")) {
      continue;
    }
    const name = line
      .split(/[><=![;@\s]/)[0]
      ?.toLowerCase()
      .replace(/_/g, "-");
    if (name && /^[a-z0-9][a-z0-9._-]*$/.test(name) && !SKIP_KEYS.has(name)) {
      names.add(name);
    }
  }

  return [...names];
}
