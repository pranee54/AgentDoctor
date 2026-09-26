import path from "node:path";

import { detectProject } from "../../detectors/project.js";
import { readTextFile } from "../../utils/fs.js";
import { resolveRepoRoot } from "../../utils/path.js";
import type { ProductEvidence, TruthLabel } from "../truth.js";
import type { ApiEndpointFinding } from "./doctor.js";

const OPENAPI_NAMES = new Set([
  "openapi.json",
  "openapi.yaml",
  "openapi.yml",
  "swagger.json",
  "swagger.yaml",
  "swagger.yml",
]);

function basenameLower(rel: string): string {
  return path.basename(rel).toLowerCase();
}

function extractJsonOpenApiPaths(content: string, relativePath: string): ApiEndpointFinding[] {
  let doc: unknown;
  try {
    doc = JSON.parse(content);
  } catch {
    return [];
  }
  const paths = (doc as { paths?: Record<string, Record<string, unknown>> }).paths;
  if (!paths || typeof paths !== "object") return [];

  const out: ApiEndpointFinding[] = [];
  for (const [pathPattern, methods] of Object.entries(paths)) {
    if (!methods || typeof methods !== "object") continue;
    for (const method of Object.keys(methods)) {
      const lower = method.toLowerCase();
      if (!["get", "post", "put", "patch", "delete", "head", "options", "trace"].includes(lower)) {
        continue;
      }
      out.push({
        method: lower.toUpperCase(),
        pathPattern,
        framework: "openapi",
        truth: "VERIFIED",
        evidence: [{ path: relativePath, excerpt: `paths.${pathPattern}.${lower}` }],
      });
    }
  }
  return out;
}

/** Minimal YAML path/method extraction without a YAML library */
function extractYamlOpenApiPaths(content: string, relativePath: string): ApiEndpointFinding[] {
  const out: ApiEndpointFinding[] = [];
  const lines = content.split(/\r?\n/);
  let inPaths = false;
  let currentPath: string | null = null;
  const methodRe = /^\s{2,6}(get|post|put|patch|delete|head|options|trace):\s*$/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (/^paths:\s*$/.test(line.trim())) {
      inPaths = true;
      currentPath = null;
      continue;
    }
    if (!inPaths) continue;
    if (/^[a-zA-Z]/.test(line) && !line.startsWith(" ")) {
      break;
    }
    const pathKey = /^\s{2}(\/[^\s:]+):\s*$/.exec(line);
    if (pathKey) {
      currentPath = pathKey[1]!;
      continue;
    }
    const methodMatch = methodRe.exec(line);
    if (methodMatch && currentPath) {
      const method = methodMatch[1]!.toUpperCase();
      out.push({
        method,
        pathPattern: currentPath,
        framework: "openapi",
        truth: "VERIFIED",
        evidence: [{ path: relativePath, line: i + 1, excerpt: line.trim() }],
      });
    }
  }
  return out;
}

export async function discoverOpenApiEndpoints(
  rootInput: string,
  maxFileSizeBytes = 512 * 1024,
): Promise<{ endpoints: ApiEndpointFinding[]; limitations: string[] }> {
  const root = resolveRepoRoot(rootInput);
  const detection = await detectProject(root, maxFileSizeBytes);
  const limitations = [
    "OpenAPI discovery reads static spec files only — mounted servers and merged specs are not resolved.",
  ];

  const endpoints: ApiEndpointFinding[] = [];
  for (const entry of detection.discovery.files) {
    const rel = entry.relativePath.replace(/\\/g, "/");
    if (!OPENAPI_NAMES.has(basenameLower(rel))) continue;
    const text = await readTextFile(path.join(root, rel), maxFileSizeBytes);
    if (text === null) continue;
    const lower = basenameLower(rel);
    if (lower.endsWith(".json")) {
      endpoints.push(...extractJsonOpenApiPaths(text, rel));
    } else {
      endpoints.push(...extractYamlOpenApiPaths(text, rel));
      if (!endpoints.length) {
        limitations.push(`YAML spec ${rel} had no paths block detected (minimal parser)`);
      }
    }
  }

  const seen = new Set<string>();
  const deduped = endpoints.filter((e) => {
    const key = `${e.method}:${e.pathPattern}:${e.evidence[0]?.path}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  deduped.sort((a, b) =>
    a.pathPattern === b.pathPattern
      ? a.method.localeCompare(b.method)
      : a.pathPattern.localeCompare(b.pathPattern),
  );

  return { endpoints: deduped, limitations };
}

export type { TruthLabel, ProductEvidence };
