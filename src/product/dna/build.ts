import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

import { detectProject } from "../../detectors/project.js";
import { detectMonorepo } from "../../core/monorepo/detect.js";
import { resolveRepoRoot } from "../../utils/path.js";
import { pathExists, readJsonFile } from "../../utils/fs.js";
import type { TruthLabel } from "../truth.js";

export interface ProjectDna {
  fingerprint: string;
  name: string;
  root: string;
  projectType: string;
  languages: string[];
  frameworks: string[];
  frontend: string[];
  backend: string[];
  database: string[];
  packageManagers: string[];
  buildSystems: string[];
  testFrameworks: string[];
  infrastructure: string[];
  cloudIndicators: string[];
  git: { present: boolean; truth: TruthLabel };
  monorepo: {
    isMonorepo: boolean;
    tool: string;
    packages: Array<{ name: string; path: string }>;
    truth: TruthLabel;
  };
  services: string[];
  packages: string[];
  applications: string[];
  externalIntegrations: string[];
  aiCodingTools: string[];
  counts: {
    files: number;
    sourceFiles: number;
    testFiles: number;
    configFiles: number;
  };
  configurationStructure: string[];
  truth: TruthLabel;
  limitations: string[];
  generatedAt: string;
}

const FRONTEND_FW = new Set(["react", "nextjs", "vue", "nuxt", "angular", "svelte", "solid"]);
const BACKEND_FW = new Set([
  "express",
  "nestjs",
  "fastapi",
  "django",
  "flask",
  "laravel",
  "rails",
  "spring",
]);

function classifyFramework(id: string): "frontend" | "backend" | "other" {
  const lower = id.toLowerCase();
  if (FRONTEND_FW.has(lower)) return "frontend";
  if (BACKEND_FW.has(lower)) return "backend";
  return "other";
}

function isSourcePath(p: string): boolean {
  return /\.(ts|tsx|js|jsx|mjs|cjs|py|php|go|rs|java|kt|kts|dart|rb|cs)$/i.test(p);
}

function isTestPath(p: string): boolean {
  const lower = p.toLowerCase();
  return (
    lower.includes(".test.") ||
    lower.includes(".spec.") ||
    lower.startsWith("tests/") ||
    lower.startsWith("test/") ||
    lower.includes("/__tests__/")
  );
}

function isConfigPath(p: string): boolean {
  const base = path.posix.basename(p).toLowerCase();
  return (
    base.endsWith(".json") ||
    base.endsWith(".yml") ||
    base.endsWith(".yaml") ||
    base.endsWith(".toml") ||
    base.endsWith(".ini") ||
    base.startsWith(".env") ||
    base.includes("config")
  );
}

/**
 * Deterministic Project DNA from repository detectors + file inventory.
 */
export async function buildProjectDna(rootInput: string): Promise<ProjectDna> {
  const root = resolveRepoRoot(rootInput);
  const limitations: string[] = [
    "DNA is derived from file markers and dependency manifests — not runtime introspection.",
    "Database/cloud signals are heuristic (PARTIAL) unless schema/infra files are present.",
  ];

  const detection = await detectProject(root);
  const mono = await detectMonorepo(root);
  const repo = detection.repository;
  const relativePaths = detection.discovery.files.map((f) => f.relativePath.replace(/\\/g, "/"));

  const languages = (repo.languages ?? []).filter((l) => l !== "unknown");
  const frameworks = (repo.frameworks ?? []).filter((f) => f !== "unknown");
  const packageManagers = (repo.packageManagers ?? []).filter((p) => p !== "unknown");

  const frontend: string[] = [];
  const backend: string[] = [];
  for (const fw of frameworks) {
    const kind = classifyFramework(fw);
    if (kind === "frontend") frontend.push(fw);
    else if (kind === "backend") backend.push(fw);
  }

  const database: string[] = [];
  const dbMarkers: Array<[string, RegExp]> = [
    ["prisma", /(^|\/)prisma\/schema\.prisma$/i],
    ["sql-migrations", /(^|\/)migrations\/.+\.sql$/i],
    ["laravel-migrations", /database\/migrations\/.+\.php$/i],
    ["sequelize", /sequelize/i],
    ["typeorm", /typeorm/i],
    ["mongoose", /mongoose/i],
  ];
  for (const [label, re] of dbMarkers) {
    if (relativePaths.some((p) => re.test(p))) database.push(label);
  }

  const infrastructure: string[] = [];
  const infraFiles: Array<[string, string]> = [
    ["docker", "Dockerfile"],
    ["compose", "docker-compose.yml"],
    ["compose", "docker-compose.yaml"],
    ["kubernetes", "k8s"],
    ["terraform", ".tf"],
    ["github-actions", ".github/workflows"],
  ];
  for (const [label, marker] of infraFiles) {
    if (
      relativePaths.some(
        (p) =>
          p === marker ||
          p.endsWith(`/${marker}`) ||
          p.startsWith(`${marker}/`) ||
          p.endsWith(marker),
      )
    ) {
      if (!infrastructure.includes(label)) infrastructure.push(label);
    }
  }

  const cloudIndicators: string[] = [];
  for (const p of relativePaths) {
    const lower = p.toLowerCase();
    if (lower.includes("serverless") || lower.includes("sam.template"))
      cloudIndicators.push("serverless");
    if (lower.includes("vercel.json")) cloudIndicators.push("vercel");
    if (lower.includes("netlify.toml")) cloudIndicators.push("netlify");
    if (lower.includes("fly.toml")) cloudIndicators.push("fly");
  }

  const buildSystems: string[] = [];
  for (const [label, file] of [
    ["tsc", "tsconfig.json"],
    ["vite", "vite.config.ts"],
    ["webpack", "webpack.config.js"],
    ["gradle", "build.gradle"],
    ["maven", "pom.xml"],
    ["cargo", "Cargo.toml"],
  ] as const) {
    if (relativePaths.some((p) => p === file || p.endsWith(`/${file}`))) buildSystems.push(label);
  }

  const testFrameworks: string[] = [];
  const pkg = await readJsonFile<{
    devDependencies?: Record<string, string>;
    dependencies?: Record<string, string>;
    name?: string;
  }>(path.join(root, "package.json"), 512 * 1024);
  const deps = {
    ...(pkg.ok ? (pkg.data.dependencies ?? {}) : {}),
    ...(pkg.ok ? (pkg.data.devDependencies ?? {}) : {}),
  };
  for (const name of ["vitest", "jest", "mocha", "pytest", "phpunit", "go test"] as const) {
    if (name === "go test") {
      if (await pathExists(path.join(root, "go.mod"))) testFrameworks.push("go-test");
      continue;
    }
    if (name in deps || relativePaths.some((p) => p.includes(name))) {
      if (!testFrameworks.includes(name)) testFrameworks.push(name);
    }
  }

  // Marker scan for common AI coding tool configuration directories/files
  const aiCodingTools: string[] = [];
  for (const [id, marker] of [
    ["cursor", ".cursor"],
    ["claude-code", ".claude"],
    ["codex", ".codex"],
    ["copilot", ".github/copilot-instructions.md"],
    ["windsurf", ".windsurfrules"],
    ["gemini-cli", ".gemini"],
    ["aider", ".aider"],
  ] as const) {
    if (
      relativePaths.some(
        (p) => p === marker || p.startsWith(`${marker}/`) || p.endsWith(`/${marker}`),
      ) ||
      (await pathExists(path.join(root, marker)))
    ) {
      aiCodingTools.push(id);
    }
  }

  const hasGit = await pathExists(path.join(root, ".git"));
  const name =
    (pkg.ok && typeof pkg.data.name === "string" && pkg.data.name) || path.basename(root);

  let projectType = "library-or-app";
  if (mono.isMonorepo) projectType = "monorepo";
  else if (frontend.length && backend.length) projectType = "fullstack-app";
  else if (frontend.length) projectType = "frontend-app";
  else if (backend.length) projectType = "backend-app";
  else if (languages.includes("python")) projectType = "python-project";
  else if (languages.includes("php")) projectType = "php-project";

  const sourceFiles = relativePaths.filter(isSourcePath).length;
  const testFiles = relativePaths.filter(isTestPath).length;
  const configFiles = relativePaths.filter(isConfigPath).length;

  const configurationStructure = [
    ...new Set(
      relativePaths
        .filter(isConfigPath)
        .map((p) => p.split("/").slice(0, 2).join("/"))
        .slice(0, 40),
    ),
  ].sort();

  const packages = mono.packages.map((p) => p.name);
  const applications = mono.packages
    .filter((p) => /app|web|api|service/i.test(p.relativePath) || /app|web|api/i.test(p.name))
    .map((p) => p.name);
  const services = applications.slice();

  const externalIntegrations: string[] = [];
  for (const key of Object.keys(deps)) {
    if (/stripe|twilio|sendgrid|aws-sdk|@aws-sdk|firebase|supabase|openai|anthropic/i.test(key)) {
      externalIntegrations.push(key);
    }
  }

  const fingerprintPayload = JSON.stringify({
    name,
    languages: [...languages].sort(),
    frameworks: [...frameworks].sort(),
    packageManagers: [...packageManagers].sort(),
    monorepo: mono.isMonorepo,
    packages: [...packages].sort(),
    fileCount: relativePaths.length,
  });
  const fingerprint = createHash("sha256").update(fingerprintPayload).digest("hex").slice(0, 16);

  return {
    fingerprint,
    name,
    root,
    projectType,
    languages,
    frameworks,
    frontend,
    backend,
    database: [...new Set(database)],
    packageManagers,
    buildSystems: [...new Set(buildSystems)],
    testFrameworks: [...new Set(testFrameworks)],
    infrastructure: [...new Set(infrastructure)],
    cloudIndicators: [...new Set(cloudIndicators)],
    git: { present: hasGit, truth: hasGit ? "VERIFIED" : "UNKNOWN" },
    monorepo: {
      isMonorepo: mono.isMonorepo,
      tool: mono.tool,
      packages: mono.packages.map((p) => ({ name: p.name, path: p.relativePath })),
      truth: mono.isMonorepo ? "VERIFIED" : "VERIFIED",
    },
    services,
    packages,
    applications,
    externalIntegrations: [...new Set(externalIntegrations)].sort(),
    aiCodingTools: [...new Set(aiCodingTools)].sort(),
    counts: {
      files: relativePaths.length,
      sourceFiles,
      testFiles,
      configFiles,
    },
    configurationStructure,
    truth: "VERIFIED",
    limitations: [...limitations, ...mono.limitations],
    generatedAt: new Date().toISOString(),
  };
}

export async function persistProjectDna(rootInput: string, dna?: ProjectDna): Promise<ProjectDna> {
  const root = resolveRepoRoot(rootInput);
  const built = dna ?? (await buildProjectDna(root));
  const dir = path.join(root, ".agentdoctor", "dna");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, "project-dna.json"), `${JSON.stringify(built, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  return built;
}
