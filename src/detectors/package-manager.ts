import type { PackageManagerId } from "../types/index.js";

export interface PackageManagerDetectionInput {
  relativePaths: string[];
  /** True when a pyproject.toml contains a [tool.poetry] table. */
  poetryToolDetected?: boolean;
  /** True when a non-Poetry pyproject.toml (or similar) indicates a Python project. */
  genericPyprojectDetected?: boolean;
}

export interface PackageManagerDetectionResult {
  packageManagers: PackageManagerId[];
  primaryPackageManager: PackageManagerId;
}

const MARKERS: Array<{ id: PackageManagerId; files: string[]; lockfiles: string[] }> = [
  { id: "pnpm", files: ["pnpm-lock.yaml", "pnpm-workspace.yaml"], lockfiles: ["pnpm-lock.yaml"] },
  { id: "yarn", files: ["yarn.lock", ".yarnrc.yml"], lockfiles: ["yarn.lock"] },
  { id: "bun", files: ["bun.lockb", "bun.lock"], lockfiles: ["bun.lockb", "bun.lock"] },
  {
    id: "npm",
    files: ["package-lock.json", "npm-shrinkwrap.json", "package.json"],
    lockfiles: ["package-lock.json", "npm-shrinkwrap.json"],
  },
  { id: "composer", files: ["composer.lock", "composer.json"], lockfiles: ["composer.lock"] },
  { id: "pub", files: ["pubspec.yaml", "pubspec.lock"], lockfiles: ["pubspec.lock"] },
  { id: "poetry", files: ["poetry.lock"], lockfiles: ["poetry.lock"] },
  {
    id: "pip",
    files: ["requirements.txt", "Pipfile", "Pipfile.lock"],
    lockfiles: ["Pipfile.lock"],
  },
  { id: "cargo", files: ["Cargo.lock", "Cargo.toml"], lockfiles: ["Cargo.lock"] },
  {
    id: "gradle",
    files: ["gradlew", "build.gradle", "build.gradle.kts", "settings.gradle"],
    lockfiles: [],
  },
];

const NODE_IDS = new Set<PackageManagerId>(["npm", "pnpm", "yarn", "bun"]);

function basename(relativePath: string): string {
  const parts = relativePath.split("/");
  return (parts[parts.length - 1] ?? relativePath).toLowerCase();
}

function isRootPath(relativePath: string): boolean {
  return !relativePath.includes("/");
}

/**
 * Detect package managers from lockfiles and manifests.
 * Primary selection prefers root-level evidence and avoids inventing certainty for mixed ecosystems.
 * Poetry requires poetry.lock and/or [tool.poetry] — not bare pyproject.toml.
 */
export function detectPackageManagers(
  input: PackageManagerDetectionInput,
): PackageManagerDetectionResult {
  const paths = input.relativePaths;
  const basenames = new Set(paths.map(basename));
  const rootBasenames = new Set(paths.filter(isRootPath).map(basename));

  const found: PackageManagerId[] = [];
  const rootFound: PackageManagerId[] = [];
  const lockFound: PackageManagerId[] = [];
  const rootLockFound: PackageManagerId[] = [];

  for (const marker of MARKERS) {
    if (marker.id === "npm") {
      const hasNpmLock = marker.lockfiles.some((f) => basenames.has(f.toLowerCase()));
      const hasRootPackage = rootBasenames.has("package.json");
      const hasAnyPackage = paths.some((p) => basename(p) === "package.json");
      if (!hasNpmLock && !hasAnyPackage) {
        continue;
      }
      found.push("npm");
      if (hasRootPackage || hasNpmLock) {
        if (hasRootPackage) {
          rootFound.push("npm");
        }
        if (hasNpmLock) {
          lockFound.push("npm");
        }
        if (marker.lockfiles.some((f) => rootBasenames.has(f.toLowerCase()))) {
          rootLockFound.push("npm");
        }
      }
      continue;
    }

    if (marker.id === "poetry") {
      const hasLock = basenames.has("poetry.lock");
      const hasTool = input.poetryToolDetected === true;
      if (!hasLock && !hasTool) {
        continue;
      }
      found.push("poetry");
      if (hasLock || (hasTool && rootBasenames.has("pyproject.toml"))) {
        rootFound.push("poetry");
      }
      if (hasLock) {
        lockFound.push("poetry");
        if (rootBasenames.has("poetry.lock")) {
          rootLockFound.push("poetry");
        }
      }
      continue;
    }

    if (marker.id === "pip") {
      const hasMarker = marker.files.some((f) => basenames.has(f.toLowerCase()));
      const hasGenericPyproject = input.genericPyprojectDetected === true;
      if (!hasMarker && !hasGenericPyproject) {
        continue;
      }
      found.push("pip");
      if (
        marker.files.some((f) => rootBasenames.has(f.toLowerCase())) ||
        (hasGenericPyproject && rootBasenames.has("pyproject.toml"))
      ) {
        rootFound.push("pip");
      }
      if (marker.lockfiles.some((f) => basenames.has(f.toLowerCase()))) {
        lockFound.push("pip");
      }
      if (marker.lockfiles.some((f) => rootBasenames.has(f.toLowerCase()))) {
        rootLockFound.push("pip");
      }
      continue;
    }

    const hasAny = marker.files.some((f) => basenames.has(f.toLowerCase()));
    if (!hasAny) {
      continue;
    }

    found.push(marker.id);
    if (marker.files.some((f) => rootBasenames.has(f.toLowerCase()))) {
      rootFound.push(marker.id);
    }
    if (marker.lockfiles.some((f) => basenames.has(f.toLowerCase()))) {
      lockFound.push(marker.id);
    }
    if (marker.lockfiles.some((f) => rootBasenames.has(f.toLowerCase()))) {
      rootLockFound.push(marker.id);
    }
  }

  const unique = [...new Set(found)];

  const lockPriority: PackageManagerId[] = [
    "pnpm",
    "yarn",
    "bun",
    "npm",
    "composer",
    "pub",
    "poetry",
    "cargo",
    "gradle",
    "pip",
  ];

  let primary: PackageManagerId = "unknown";

  for (const id of lockPriority) {
    if (rootLockFound.includes(id)) {
      primary = id;
      break;
    }
  }

  if (primary === "unknown") {
    for (const id of lockPriority) {
      if (rootFound.includes(id)) {
        primary = id;
        break;
      }
    }
  }

  if (primary === "unknown") {
    const ecosystems = new Set(
      unique.map((id) => (NODE_IDS.has(id) ? "node" : id === "unknown" ? "unknown" : id)),
    );
    ecosystems.delete("unknown");
    if (ecosystems.size > 1) {
      primary = "unknown";
    } else {
      for (const id of lockPriority) {
        if (lockFound.includes(id) || unique.includes(id)) {
          primary = id;
          break;
        }
      }
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
    case "pub":
      return "Pub";
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

export function formatPackageManagers(ids: PackageManagerId[]): string {
  const unique = [...new Set(ids)];
  if (unique.length === 0 || (unique.length === 1 && unique[0] === "unknown")) {
    return "Unknown";
  }
  return unique
    .filter((id) => id !== "unknown")
    .map((id) => formatPackageManager(id))
    .join(", ");
}
