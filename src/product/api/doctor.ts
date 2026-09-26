import type { ProductEvidence, TruthLabel } from "../truth.js";
import { lineNumberAt, loadProjectSourceFiles } from "../evidence-scan.js";
import { discoverOpenApiEndpoints } from "./openapi.js";

export interface ApiEndpointFinding {
  method: string;
  pathPattern: string;
  framework: string;
  truth: TruthLabel;
  evidence: ProductEvidence[];
}

export interface ApiDoctorReport {
  root: string;
  endpoints: ApiEndpointFinding[];
  limitations: string[];
}

interface RoutePattern {
  framework: string;
  regex: RegExp;
  methodGroup?: number;
  pathGroup: number;
  defaultMethod?: string;
}

const ROUTE_PATTERNS: RoutePattern[] = [
  {
    framework: "express",
    regex: /\.(?:get|post|put|patch|delete|all)\(\s*['"`]([^'"`]+)['"`]/gi,
    pathGroup: 1,
  },
  {
    framework: "express-router",
    regex: /router\.(?:get|post|put|patch|delete|all)\(\s*['"`]([^'"`]+)['"`]/gi,
    pathGroup: 1,
  },
  {
    framework: "fastify",
    regex: /fastify\.(?:get|post|put|patch|delete)\(\s*['"`]([^'"`]+)['"`]/gi,
    pathGroup: 1,
  },
  {
    framework: "nestjs",
    regex: /@(Get|Post|Put|Patch|Delete|All)\(\s*['"`]([^'"`]+)['"`]?\s*\)/g,
    methodGroup: 1,
    pathGroup: 2,
  },
  {
    framework: "nestjs",
    regex: /@(Get|Post|Put|Patch|Delete|All)\(\)/g,
    methodGroup: 1,
    pathGroup: 0,
  },
  {
    framework: "laravel",
    regex: /Route::(get|post|put|patch|delete|any)\(\s*['"]([^'"]+)['"]/gi,
    methodGroup: 1,
    pathGroup: 2,
  },
  {
    framework: "flask",
    regex: /@(?:app|bp|blueprint)\.(?:route|get|post|put|patch|delete)\(\s*['"]([^'"]+)['"]/gi,
    pathGroup: 1,
  },
  {
    framework: "flask",
    regex: /@(?:app|bp)\.(get|post|put|patch|delete)\(\s*['"]([^'"]+)['"]/gi,
    methodGroup: 1,
    pathGroup: 2,
  },
];

function inferMethodFromMatch(
  full: string,
  pattern: RoutePattern,
  groups: RegExpExecArray,
): string {
  const methodRaw = pattern.methodGroup !== undefined ? groups[pattern.methodGroup] : undefined;
  if (methodRaw) {
    return methodRaw.toUpperCase();
  }
  const lower = full.toLowerCase();
  for (const m of ["get", "post", "put", "patch", "delete", "all"] as const) {
    if (lower.includes(`.${m}(`) || lower.includes(`@${m}`) || lower.includes(`::${m}(`)) {
      return m === "all" ? "ALL" : m.toUpperCase();
    }
  }
  return pattern.defaultMethod ?? "UNKNOWN";
}

function scanFile(relativePath: string, content: string): ApiEndpointFinding[] {
  const findings: ApiEndpointFinding[] = [];
  for (const pattern of ROUTE_PATTERNS) {
    pattern.regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.regex.exec(content)) !== null) {
      const pathGroup = pattern.pathGroup;
      let pathPattern = pathGroup > 0 ? (match[pathGroup] ?? "") : "/";
      if (!pathPattern && pattern.framework === "nestjs") pathPattern = "/";
      if (!pathPattern) continue;
      const method = inferMethodFromMatch(match[0], pattern, match);
      const line = lineNumberAt(content, match.index);
      findings.push({
        method,
        pathPattern,
        framework: pattern.framework,
        truth: "INFERRED",
        evidence: [
          {
            path: relativePath,
            line,
            excerpt: match[0].trim().slice(0, 160),
          },
        ],
      });
    }
  }
  return findings;
}

function scanGraphqlSurface(relativePath: string, content: string): ApiEndpointFinding[] {
  const findings: ApiEndpointFinding[] = [];
  const typeQueryRe = /type\s+Query\s*\{/g;
  let match: RegExpExecArray | null;
  while ((match = typeQueryRe.exec(content)) !== null) {
    findings.push({
      method: "GRAPHQL",
      pathPattern: "Query",
      framework: "graphql-sdl",
      truth: "INFERRED",
      evidence: [
        {
          path: relativePath,
          line: lineNumberAt(content, match.index),
          excerpt: match[0].trim(),
        },
      ],
    });
  }
  const gqlRe = /gql`\s*([\s\S]*?)`/g;
  while ((match = gqlRe.exec(content)) !== null) {
    const inner = match[1] ?? "";
    const opMatch = /(?:query|mutation|subscription)\s+(\w+)/i.exec(inner);
    const opName = opMatch?.[1] ?? "anonymous";
    findings.push({
      method: "GRAPHQL",
      pathPattern: opName,
      framework: "graphql-tag",
      truth: "INFERRED",
      evidence: [
        {
          path: relativePath,
          line: lineNumberAt(content, match.index),
          excerpt: match[0].trim().slice(0, 160),
        },
      ],
    });
  }
  return findings;
}

const SOURCE_FILTER = (rel: string): boolean => {
  const lower = rel.toLowerCase();
  if (lower.endsWith(".graphql") || lower.endsWith(".gql")) return true;
  if (lower.endsWith(".php") && (lower.includes("routes/") || lower.includes("route"))) return true;
  if (
    lower.endsWith(".py") &&
    (lower.includes("routes") || lower.includes("views") || lower.includes("app"))
  ) {
    return true;
  }
  if (
    lower.endsWith(".ts") ||
    lower.endsWith(".tsx") ||
    lower.endsWith(".js") ||
    lower.endsWith(".jsx")
  ) {
    return (
      lower.includes("route") ||
      lower.includes("controller") ||
      lower.includes("api/") ||
      lower.includes("server") ||
      lower.includes("app.module") ||
      lower.includes("graphql") ||
      lower.includes("schema")
    );
  }
  return false;
};

export async function analyzeApiSurface(rootInput: string): Promise<ApiDoctorReport> {
  const {
    root,
    files,
    limitations: scanLimits,
  } = await loadProjectSourceFiles(rootInput, SOURCE_FILTER);
  const limitations = [
    "Endpoint discovery uses regex on route declarations; middleware, prefixes, and global mounts are not resolved.",
    "Dynamic route paths and framework-specific route files may be missed.",
    "GraphQL schema extraction (PARTIAL): static SDL `type Query` and gql` template literals only — not live gateway introspection.",
    ...scanLimits,
  ];

  const endpoints: ApiEndpointFinding[] = [];
  for (const file of files) {
    endpoints.push(...scanFile(file.relativePath, file.content));
    endpoints.push(...scanGraphqlSurface(file.relativePath, file.content));
  }

  const openApi = await discoverOpenApiEndpoints(root);
  limitations.push(...openApi.limitations);
  endpoints.push(...openApi.endpoints);

  const seen = new Set<string>();
  const deduped = endpoints.filter((e) => {
    const key = `${e.method}:${e.pathPattern}:${e.framework}:${e.evidence[0]?.path}:${e.evidence[0]?.line}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  deduped.sort((a, b) =>
    a.pathPattern === b.pathPattern
      ? a.method.localeCompare(b.method)
      : a.pathPattern.localeCompare(b.pathPattern),
  );

  return { root, endpoints: deduped, limitations };
}
