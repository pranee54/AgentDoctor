import path from "node:path";

import { DEFAULT_MAX_FILE_SIZE_BYTES } from "../constants.js";
import { discoverFiles } from "../discovery/files.js";
import { detectFrameworks } from "./framework.js";
import { detectLanguages } from "./language.js";
import { detectMonorepo } from "./monorepo.js";
import { detectPackageManagers } from "./package-manager.js";
import type { DiscoveryResult, RepositoryInfo } from "../types/index.js";
import { isDirectory, readJsonFile } from "../utils/fs.js";
import { resolveRepoRoot } from "../utils/path.js";

export interface ProjectDetectionResult {
  repository: RepositoryInfo;
  discovery: DiscoveryResult;
  diagnostics: string[];
}

interface PackageJsonShape {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  workspaces?: unknown;
}

/**
 * Discover files and detect repository characteristics.
 */
export async function detectProject(
  cwd: string,
  maxFileSizeBytes = DEFAULT_MAX_FILE_SIZE_BYTES,
): Promise<ProjectDetectionResult> {
  const root = resolveRepoRoot(cwd);
  const diagnostics: string[] = [];

  if (!(await isDirectory(root))) {
    throw new Error(`Not a directory: ${root}`);
  }

  const discovery = await discoverFiles({ root, maxFileSizeBytes });
  const relativePaths = discovery.files.map((f) => f.relativePath);

  for (const err of discovery.permissionErrors) {
    diagnostics.push(`Permission/read issue: ${err}`);
  }

  let packageJson: PackageJsonShape | undefined;
  const packageJsonPath = path.join(root, "package.json");
  const packageResult = await readJsonFile<PackageJsonShape>(packageJsonPath, maxFileSizeBytes);
  if (packageResult.ok) {
    packageJson = packageResult.data;
  } else if (relativePaths.some((p) => p === "package.json" || p.endsWith("/package.json"))) {
    diagnostics.push(`Malformed package.json: ${packageResult.error}`);
  }

  const deps = {
    ...(packageJson?.dependencies ?? {}),
    ...(packageJson?.devDependencies ?? {}),
    ...(packageJson?.peerDependencies ?? {}),
  };

  const languages = detectLanguages({ relativePaths });
  const frameworks = detectFrameworks({
    relativePaths,
    packageJsonDependencies: deps,
  });
  const packageManagers = detectPackageManagers({ relativePaths });
  const monorepo = detectMonorepo({
    relativePaths,
    packageJsonWorkspaces: packageJson?.workspaces,
  });

  const repository: RepositoryInfo = {
    root,
    languages: languages.languages,
    primaryLanguage: languages.primaryLanguage,
    frameworks: frameworks.frameworks,
    primaryFramework: frameworks.primaryFramework,
    packageManagers: packageManagers.packageManagers,
    primaryPackageManager: packageManagers.primaryPackageManager,
    monorepo: monorepo.monorepo,
    filesScanned: discovery.files.length,
  };

  return { repository, discovery, diagnostics };
}
