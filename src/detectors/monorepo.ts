import type { MonorepoToolId } from "../types/index.js";

export interface MonorepoDetectionInput {
  relativePaths: string[];
  packageJsonWorkspaces?: unknown;
}

export interface MonorepoDetectionResult {
  monorepo: MonorepoToolId;
}

const PROJECT_MANIFESTS = new Set([
  "package.json",
  "pubspec.yaml",
  "composer.json",
  "cargo.toml",
  "go.mod",
  "pyproject.toml",
  "gemfile",
]);

/**
 * Detect common monorepo tooling from config markers, or multi-project layouts
 * with multiple independently buildable manifests.
 */
export function detectMonorepo(input: MonorepoDetectionInput): MonorepoDetectionResult {
  const basenames = new Set(
    input.relativePaths.map((p) => {
      const parts = p.split("/");
      return (parts[parts.length - 1] ?? p).toLowerCase();
    }),
  );

  if (basenames.has("turbo.json") || basenames.has("turbo.jsonc")) {
    return { monorepo: "turborepo" };
  }

  if (basenames.has("nx.json")) {
    return { monorepo: "nx" };
  }

  if (basenames.has("pnpm-workspace.yaml")) {
    return { monorepo: "pnpm-workspaces" };
  }

  if (input.packageJsonWorkspaces !== undefined && input.packageJsonWorkspaces !== null) {
    const ws = input.packageJsonWorkspaces;
    const hasWorkspaces =
      Array.isArray(ws) ||
      (typeof ws === "object" &&
        ws !== null &&
        "packages" in ws &&
        Array.isArray((ws as { packages: unknown }).packages));
    if (hasWorkspaces) {
      return { monorepo: "npm-workspaces" };
    }
  }

  const projectRoots = new Set<string>();
  for (const relativePath of input.relativePaths) {
    const parts = relativePath.split("/");
    const base = (parts[parts.length - 1] ?? relativePath).toLowerCase();
    if (!PROJECT_MANIFESTS.has(base)) {
      continue;
    }
    if (parts.length === 1) {
      projectRoots.add(".");
      continue;
    }
    // Count only first-level project directories (e.g. mobile-apps/pubspec.yaml)
    if (parts.length === 2) {
      projectRoots.add(parts[0] ?? relativePath);
    }
  }

  if (projectRoots.size >= 2) {
    return { monorepo: "multi-project" };
  }

  return { monorepo: "none" };
}

export function formatMonorepo(id: MonorepoToolId): string {
  switch (id) {
    case "npm-workspaces":
      return "npm workspaces";
    case "pnpm-workspaces":
      return "pnpm workspaces";
    case "turborepo":
      return "Turborepo";
    case "nx":
      return "Nx";
    case "multi-project":
      return "Multi-project";
    default:
      return "None";
  }
}
