import type { PackageManagerId } from "../types/index.js";

export interface PackageManagerDetectionInput {
  relativePaths: string[];
}

export interface PackageManagerDetectionResult {
  packageManagers: PackageManagerId[];
  primaryPackageManager: PackageManagerId;
}

const MARKERS: Array<{ id: PackageManagerId; files: string[] }> = [
  { id: "pnpm", files: ["pnpm-lock.yaml", "pnpm-workspace.yaml"] },
  { id: "yarn", files: ["yarn.lock", ".yarnrc.yml"] },
  { id: "bun", files: ["bun.lockb", "bun.lock"] },
  { id: "npm", files: ["package-lock.json", "npm-shrinkwrap.json"] },
  { id: "composer", files: ["composer.lock", "composer.json"] },
  { id: "poetry", files: ["poetry.lock", "pyproject.toml"] },
  { id: "pip", files: ["requirements.txt", "Pipfile", "Pipfile.lock"] },
  { id: "cargo", files: ["Cargo.lock", "Cargo.toml"] },
  { id: "gradle", files: ["gradlew", "build.gradle", "build.gradle.kts", "settings.gradle"] },
];

/**
 * Detect package managers from lockfiles and manifests.
 * Lockfiles take precedence over generic manifests for primary selection.
 */
export function detectPackageManagers(
  input: PackageManagerDetectionInput,
): PackageManagerDetectionResult {
  const basenames = new Set(
    input.relativePaths.map((p) => {
      const parts = p.split("/");
      return (parts[parts.length - 1] ?? p).toLowerCase();
    }),
  );

  const found: PackageManagerId[] = [];

  for (const marker of MARKERS) {
    if (marker.files.some((f) => basenames.has(f.toLowerCase()))) {
      found.push(marker.id);
    }
  }

  if (
    basenames.has("package.json") &&
    !found.some((id) => ["npm", "pnpm", "yarn", "bun"].includes(id))
  ) {
    found.push("npm");
  }

  const unique = [...new Set(found)];

  const lockPriority: PackageManagerId[] = [
    "pnpm",
    "yarn",
    "bun",
    "npm",
    "poetry",
    "composer",
    "cargo",
    "gradle",
    "pip",
  ];

  let primary: PackageManagerId = "unknown";
  for (const id of lockPriority) {
    if (unique.includes(id)) {
      primary = id;
      break;
    }
  }

  return {
    packageManagers: unique.length > 0 ? unique : ["unknown"],
    primaryPackageManager: primary,
  };
}

export function formatPackageManager(id: PackageManagerId): string {
  switch (id) {
    case "npm":
      return "npm";
    case "pnpm":
      return "pnpm";
    case "yarn":
      return "Yarn";
    case "bun":
      return "Bun";
    case "composer":
      return "Composer";
    case "pip":
      return "pip";
    case "poetry":
      return "Poetry";
    case "cargo":
      return "Cargo";
    case "gradle":
      return "Gradle";
    default:
      return "Unknown";
  }
}
