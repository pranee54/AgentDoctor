import path from "node:path";

import { DEFAULT_MAX_FILE_SIZE_BYTES } from "../../constants.js";
import { detectProject } from "../../detectors/project.js";
import { readTextFile } from "../../utils/fs.js";
import { resolveRepoRoot } from "../../utils/path.js";
import type { ProductEvidence, TruthLabel } from "../truth.js";

export interface InfraArtifact {
  kind: "docker" | "kubernetes" | "terraform" | "ci" | "compose-service" | "unknown";
  path: string;
  label: string;
  truth: TruthLabel;
  evidence: ProductEvidence[];
}

export interface InfraReport {
  root: string;
  artifacts: InfraArtifact[];
  services: string[];
  limitations: string[];
}

function classifyPath(relativePath: string): InfraArtifact | null {
  const norm = relativePath.replace(/\\/g, "/");
  const base = norm.split("/").pop()?.toLowerCase() ?? "";
  if (base === "dockerfile" || base.startsWith("dockerfile.")) {
    return {
      kind: "docker",
      path: norm,
      label: "Dockerfile",
      truth: "VERIFIED",
      evidence: [{ path: norm }],
    };
  }
  if (base === "docker-compose.yml" || base === "docker-compose.yaml" || base === "compose.yml") {
    return {
      kind: "docker",
      path: norm,
      label: "Docker Compose",
      truth: "VERIFIED",
      evidence: [{ path: norm }],
    };
  }
  if (norm.includes(".github/workflows/") && (base.endsWith(".yml") || base.endsWith(".yaml"))) {
    return {
      kind: "ci",
      path: norm,
      label: "GitHub Actions workflow",
      truth: "VERIFIED",
      evidence: [{ path: norm }],
    };
  }
  if (base.endsWith(".tf")) {
    return {
      kind: "terraform",
      path: norm,
      label: "Terraform",
      truth: "VERIFIED",
      evidence: [{ path: norm }],
    };
  }
  if (norm.includes("kubernetes/") || base.includes("deployment") || base.includes("service")) {
    if (base.endsWith(".yaml") || base.endsWith(".yml")) {
      return {
        kind: "kubernetes",
        path: norm,
        label: "Kubernetes manifest (heuristic)",
        truth: "INFERRED",
        evidence: [{ path: norm }],
      };
    }
  }
  return null;
}

function parseComposeServices(content: string, relativePath: string): string[] {
  const services: string[] = [];
  let inServices = false;
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (/^services:\s*$/i.test(trimmed)) {
      inServices = true;
      continue;
    }
    if (inServices) {
      if (/^[a-zA-Z0-9_-]+:\s*$/.test(trimmed) && !trimmed.startsWith("version:")) {
        const name = trimmed.replace(":", "");
        if (name !== "services" && !name.includes(" ")) services.push(name);
      }
      if (
        /^[a-zA-Z_]+:/.test(trimmed) &&
        !line.startsWith(" ") &&
        !line.startsWith("\t") &&
        trimmed !== "services:"
      ) {
        if (!trimmed.startsWith("services:")) inServices = false;
      }
    }
  }
  return services.map((s) => `${s}@${relativePath}`);
}

export async function analyzeInfra(
  rootInput: string,
  maxFileSizeBytes = DEFAULT_MAX_FILE_SIZE_BYTES,
): Promise<InfraReport> {
  const root = resolveRepoRoot(rootInput);
  const detection = await detectProject(root, maxFileSizeBytes);
  const limitations = [
    "Compose service names use simple line heuristics, not a full YAML parser.",
    "Kubernetes detection is path/name heuristic.",
  ];

  const artifacts: InfraArtifact[] = [];
  const services: string[] = [];

  for (const entry of detection.discovery.files) {
    const rel = entry.relativePath.replace(/\\/g, "/");
    const artifact = classifyPath(rel);
    if (artifact) artifacts.push(artifact);

    const base = rel.split("/").pop()?.toLowerCase() ?? "";
    if (base === "docker-compose.yml" || base === "docker-compose.yaml" || base === "compose.yml") {
      const text = await readTextFile(path.join(root, rel), maxFileSizeBytes);
      if (text) services.push(...parseComposeServices(text, rel));
    }
  }

  artifacts.sort((a, b) => a.path.localeCompare(b.path));
  return {
    root,
    artifacts,
    services: [...new Set(services)].sort(),
    limitations,
  };
}
