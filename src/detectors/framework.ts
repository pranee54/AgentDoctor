import type { FrameworkId } from "../types/index.js";

export interface FrameworkDetectionInput {
  relativePaths: string[];
  packageJsonDependencies?: Record<string, string>;
  composerJsonRequire?: Record<string, string>;
  pubspecName?: string;
}

export interface FrameworkDetectionResult {
  frameworks: FrameworkId[];
  primaryFramework: FrameworkId;
}

function hasDep(deps: Record<string, string> | undefined, name: string): boolean {
  return Boolean(deps && name in deps);
}

function hasFile(paths: Set<string>, ...names: string[]): boolean {
  return names.some((name) => paths.has(name.toLowerCase()));
}

/**
 * Detect frameworks from config markers and dependency names.
 * Does not fail when nothing matches — returns unknown.
 */
export function detectFrameworks(input: FrameworkDetectionInput): FrameworkDetectionResult {
  const pathSet = new Set(input.relativePaths.map((p) => p.toLowerCase()));
  const basenames = new Set(
    input.relativePaths.map((p) => {
      const parts = p.split("/");
      return (parts[parts.length - 1] ?? p).toLowerCase();
    }),
  );
  const deps = {
    ...(input.packageJsonDependencies ?? {}),
  };
  const composer = input.composerJsonRequire ?? {};

  const detected: FrameworkId[] = [];

  const isNext =
    hasFile(basenames, "next.config.js", "next.config.mjs", "next.config.ts", "next.config.cjs") ||
    hasDep(deps, "next");
  if (isNext) {
    detected.push("nextjs");
  }

  const isNuxt =
    hasFile(basenames, "nuxt.config.ts", "nuxt.config.js", "nuxt.config.mjs") ||
    hasDep(deps, "nuxt");
  if (isNuxt) {
    detected.push("nuxt");
  }

  const isNest =
    hasDep(deps, "@nestjs/core") ||
    hasFile(basenames, "nest-cli.json") ||
    pathSet.has("nest-cli.json");
  if (isNest) {
    detected.push("nestjs");
  }

  const isExpress = hasDep(deps, "express") && !isNest && !isNext;
  if (isExpress) {
    detected.push("express");
  }

  const isVue =
    hasDep(deps, "vue") ||
    ([...pathSet].some((p) => p.endsWith(".vue")) &&
      (hasFile(basenames, "vite.config.ts", "vite.config.js", "vue.config.js") ||
        hasDep(deps, "vite")));
  if (isVue && !isNuxt) {
    detected.push("vue");
  }

  const isSvelte =
    hasDep(deps, "svelte") ||
    hasDep(deps, "@sveltejs/kit") ||
    hasFile(basenames, "svelte.config.js", "svelte.config.ts");
  if (isSvelte) {
    detected.push("svelte");
  }

  const isReact =
    (hasDep(deps, "react") || hasDep(deps, "react-dom")) && !isNext && !detected.includes("react");
  if (isReact) {
    detected.push("react");
  }

  if (
    !isNext &&
    !isNuxt &&
    !isNest &&
    !isExpress &&
    !isVue &&
    !isSvelte &&
    !isReact &&
    (hasFile(basenames, "package.json") || hasDep(deps, "express") === false) &&
    hasFile(basenames, "package.json")
  ) {
    // Generic Node.js project with package.json but no web framework
    if (!detected.includes("nodejs")) {
      detected.push("nodejs");
    }
  }

  if (hasFile(basenames, "pubspec.yaml") || input.pubspecName !== undefined) {
    // Flutter: pubspec presence implies Flutter/Dart project context for detection
    if (hasFile(pathSet, "pubspec.yaml") || basenames.has("pubspec.yaml")) {
      detected.push("flutter");
    }
  }

  if (hasDep(composer, "laravel/framework") || hasFile(basenames, "artisan")) {
    detected.push("laravel");
  }

  if (
    hasFile(basenames, "manage.py") ||
    [...pathSet].some((p) => p.endsWith("/settings.py") || p === "settings.py")
  ) {
    detected.push("django");
  }

  // FastAPI: path heuristics only (requirements/pyproject often lack a stable marker)
  if (
    [...pathSet].some(
      (p) => p.includes("fastapi") || p.endsWith("requirements-fastapi.txt") || p === "app/main.py",
    )
  ) {
    detected.push("fastapi");
  }

  // Deduplicate while preserving order
  const unique = [...new Set(detected)];

  // Priority for primary framework
  const priority: FrameworkId[] = [
    "nextjs",
    "nuxt",
    "nestjs",
    "laravel",
    "django",
    "fastapi",
    "flutter",
    "svelte",
    "vue",
    "react",
    "express",
    "nodejs",
  ];

  let primaryFramework: FrameworkId = "unknown";
  for (const candidate of priority) {
    if (unique.includes(candidate)) {
      primaryFramework = candidate;
      break;
    }
  }

  if (unique.length === 0) {
    return { frameworks: ["unknown"], primaryFramework: "unknown" };
  }

  return { frameworks: unique, primaryFramework };
}

export function formatFramework(framework: FrameworkId): string {
  switch (framework) {
    case "nextjs":
      return "Next.js";
    case "react":
      return "React";
    case "vue":
      return "Vue";
    case "nuxt":
      return "Nuxt";
    case "svelte":
      return "Svelte";
    case "nodejs":
      return "Node.js";
    case "express":
      return "Express";
    case "nestjs":
      return "NestJS";
    case "flutter":
      return "Flutter";
    case "laravel":
      return "Laravel";
    case "django":
      return "Django";
    case "fastapi":
      return "FastAPI";
    default:
      return "Unknown";
  }
}
