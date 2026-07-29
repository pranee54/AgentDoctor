import type { MonorepoToolId } from "../types/index.js";

export interface MonorepoDetectionInput {
  relativePaths: string[];
  packageJsonWorkspaces?: unknown;
}

export interface MonorepoDetectionResult {
  monorepo: MonorepoToolId;
}

/**
 * Detect common monorepo tooling from config markers.
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
    default:
      return "None";
  }
}
