import path from "node:path";

import { DEFAULT_IGNORE_DIRECTORIES, DEFAULT_MAX_FILE_SIZE_BYTES } from "../constants.js";
import { discoverFiles } from "../discovery/files.js";
import { detectFrameworks } from "./framework.js";
import { detectLanguages } from "./language.js";
import { detectMonorepo } from "./monorepo.js";
import { detectPackageManagers } from "./package-manager.js";
import { extractPythonDependencyNames, pyprojectHasPoetryTool } from "./python-deps.js";
import type { DiscoveryResult, RepositoryInfo } from "../types/index.js";
import { isDirectory, readJsonFile, readTextFile } from "../utils/fs.js";
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

interface ComposerJsonShape {
  require?: Record<string, string>;
  "require-dev"?: Record<string, string>;
}

function basename(relativePath: string): string {
  const parts = relativePath.split("/");
  return parts[parts.length - 1] ?? relativePath;
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
    const relative = err.split(":")[0] ?? err;
    const underIgnored = relative
      .split("/")
      .some((segment) => segment.length > 0 && DEFAULT_IGNORE_DIRECTORIES.has(segment));
    if (underIgnored) {
      continue;
    }
    diagnostics.push(`Permission/read issue: ${err}`);
  }

  const mergedPackageDeps: Record<string, string> = {};
  let rootWorkspaces: unknown;
  const packageJsonPaths = relativePaths.filter(
    (p) => basename(p).toLowerCase() === "package.json",
  );

  for (const relative of packageJsonPaths) {
    const absolute = path.join(root, relative);
    const packageResult = await readJsonFile<PackageJsonShape>(absolute, maxFileSizeBytes);
    if (!packageResult.ok) {
      if (relative === "package.json") {
        diagnostics.push(`Malformed package.json: ${packageResult.error}`);
      }
      continue;
    }
    Object.assign(
      mergedPackageDeps,
      packageResult.data.dependencies ?? {},
      packageResult.data.devDependencies ?? {},
      packageResult.data.peerDependencies ?? {},
    );
    if (relative === "package.json") {
      rootWorkspaces = packageResult.data.workspaces;
    }
  }

  const composerRequire: Record<string, string> = {};
  const composerPaths = relativePaths.filter((p) => basename(p).toLowerCase() === "composer.json");
  for (const relative of composerPaths) {
    const absolute = path.join(root, relative);
    const result = await readJsonFile<ComposerJsonShape>(absolute, maxFileSizeBytes);
    if (!result.ok) {
      continue;
    }
    Object.assign(composerRequire, result.data.require ?? {}, result.data["require-dev"] ?? {});
  }

  const pythonDependencyNames = new Set<string>();
  let poetryToolDetected = false;
  let genericPyprojectDetected = false;

  for (const relative of relativePaths) {
    const base = basename(relative).toLowerCase();
    if (
      base !== "pyproject.toml" &&
      base !== "requirements.txt" &&
      !/^requirements(-[a-z0-9_-]+)?\.txt$/i.test(base)
    ) {
      continue;
    }
    const text = await readTextFile(path.join(root, relative), maxFileSizeBytes);
    if (!text) {
      continue;
    }
    for (const name of extractPythonDependencyNames(text)) {
      pythonDependencyNames.add(name);
    }
    if (base === "pyproject.toml") {
      if (pyprojectHasPoetryTool(text)) {
        poetryToolDetected = true;
      } else {
        genericPyprojectDetected = true;
      }
    }
  }

  if (relativePaths.some((p) => basename(p).toLowerCase() === "pipfile")) {
    genericPyprojectDetected = true;
  }

  const languages = detectLanguages({ relativePaths });
  const frameworks = detectFrameworks({
    relativePaths,
    packageJsonDependencies: mergedPackageDeps,
    composerJsonRequire: composerRequire,
    pythonDependencyNames: [...pythonDependencyNames],
  });
  const packageManagers = detectPackageManagers({
    relativePaths,
    poetryToolDetected,
    genericPyprojectDetected,
  });
  const monorepo = detectMonorepo({
    relativePaths,
    packageJsonWorkspaces: rootWorkspaces,
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
