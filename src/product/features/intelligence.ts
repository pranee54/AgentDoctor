import path from "node:path";

import { analyzeApiSurface } from "../api/doctor.js";
import { analyzeDatabaseSchema } from "../database/doctor.js";
import {
  isLikelyRequirementsDoc,
  isMarkdownDoc,
  loadProjectSourceFiles,
} from "../evidence-scan.js";
import { readTextFile } from "../../utils/fs.js";
import { detectProject } from "../../detectors/project.js";
import { resolveRepoRoot } from "../../utils/path.js";
import type { ProductEvidence, TruthLabel } from "../truth.js";
import { DEFAULT_MAX_FILE_SIZE_BYTES } from "../../constants.js";

export interface FeatureFlowLink {
  layer: "ui" | "api" | "service" | "db";
  label: string;
  path?: string;
  truth: TruthLabel;
  evidence: ProductEvidence[];
}

export interface FeatureFlow {
  featureId: string;
  title: string;
  docSource?: string;
  docLine?: number;
  links: FeatureFlowLink[];
  zombie: boolean;
  truth: TruthLabel;
}

export interface FeatureIntelligenceReport {
  root: string;
  features: FeatureFlow[];
  limitations: string[];
}

const FEATURE_MARKER =
  /^(?:#{1,4}\s+)?(?:FEATURE|Feature)[:\s-]+(.+)$|<!--\s*FEATURE:\s*(.+?)\s*-->/i;
const FEATURE_INLINE = /FEATURE:\s*([^\n\r]+)/gi;

const UI_HEURISTICS = [
  /pages?\//i,
  /views?\//i,
  /screens?\//i,
  /components?\//i,
  /\.tsx$/i,
  /\.vue$/i,
  /filament/i,
  /livewire/i,
];

const SERVICE_HEURISTICS = [/services?\//i, /usecases?\//i, /domain\//i, /handlers?\//i];

function slugFeature(title: string, source: string, line: number): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return `${source.replace(/[^\w./-]/g, "_")}:${line}:${slug || "feature"}`;
}

function tokenize(title: string): string[] {
  return title
    .toLowerCase()
    .split(/\W+/)
    .filter((t) => t.length > 3);
}

function fileMatchesTokens(relativePath: string, content: string, tokens: string[]): boolean {
  if (!tokens.length) return false;
  const hay = `${relativePath}\n${content}`.toLowerCase();
  const hits = tokens.filter((t) => hay.includes(t));
  return hits.length >= Math.min(2, tokens.length);
}

function classifyUiPath(relativePath: string): boolean {
  return UI_HEURISTICS.some((re) => re.test(relativePath));
}

function classifyServicePath(relativePath: string): boolean {
  return SERVICE_HEURISTICS.some((re) => re.test(relativePath));
}

async function collectFeatureMarkersFromDocs(
  root: string,
  maxFileSizeBytes: number,
): Promise<Array<{ title: string; sourcePath: string; line: number }>> {
  const detection = await detectProject(root, maxFileSizeBytes);
  const out: Array<{ title: string; sourcePath: string; line: number }> = [];
  for (const entry of detection.discovery.files) {
    const rel = entry.relativePath.replace(/\\/g, "/");
    if (!isMarkdownDoc(rel)) continue;
    if (!isLikelyRequirementsDoc(rel) && !rel.toLowerCase().includes("feature")) continue;
    const content = await readTextFile(path.join(root, rel), maxFileSizeBytes);
    if (content === null) continue;
    const lines = content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? "";
      const heading = FEATURE_MARKER.exec(line.trim());
      if (heading) {
        const title = (heading[1] ?? heading[2] ?? "").trim();
        if (title) out.push({ title, sourcePath: rel, line: i + 1 });
      }
      FEATURE_INLINE.lastIndex = 0;
      let inline: RegExpExecArray | null;
      while ((inline = FEATURE_INLINE.exec(line)) !== null) {
        const title = inline[1]?.trim();
        if (title) {
          out.push({ title, sourcePath: rel, line: i + 1 });
        }
      }
    }
  }
  return out;
}

export async function analyzeFeatureIntelligence(
  rootInput: string,
  maxFileSizeBytes = DEFAULT_MAX_FILE_SIZE_BYTES,
): Promise<FeatureIntelligenceReport> {
  const root = resolveRepoRoot(rootInput);
  const limitations = [
    "Feature markers parsed from docs (FEATURE / HTML comments) — not a product management integration.",
    "UI→API→service→db links are heuristic substring matches — not runtime tracing.",
    "Zombie features = doc marker with no matching source file token hits.",
  ];

  const markers = await collectFeatureMarkersFromDocs(root, maxFileSizeBytes);
  const { files } = await loadProjectSourceFiles(
    root,
    (p) => !p.includes("node_modules/") && !p.startsWith(".agentdoctor/"),
    maxFileSizeBytes,
  );

  const apiReport = await analyzeApiSurface(root);
  const dbReport = await analyzeDatabaseSchema(root);

  const features: FeatureFlow[] = [];

  for (const marker of markers) {
    const tokens = tokenize(marker.title);
    const links: FeatureFlowLink[] = [];
    let codeHits = 0;

    for (const f of files) {
      if (isMarkdownDoc(f.relativePath)) continue;
      if (!fileMatchesTokens(f.relativePath, f.content, tokens)) continue;
      codeHits += 1;
      if (classifyUiPath(f.relativePath)) {
        links.push({
          layer: "ui",
          label: path.basename(f.relativePath),
          path: f.relativePath,
          truth: "INFERRED",
          evidence: [{ path: f.relativePath, excerpt: marker.title.slice(0, 80) }],
        });
      } else if (classifyServicePath(f.relativePath)) {
        links.push({
          layer: "service",
          label: path.basename(f.relativePath),
          path: f.relativePath,
          truth: "INFERRED",
          evidence: [{ path: f.relativePath, excerpt: marker.title.slice(0, 80) }],
        });
      }
    }

    for (const ep of apiReport.endpoints) {
      const hay = `${ep.pathPattern} ${ep.method}`.toLowerCase();
      if (tokens.some((t) => hay.includes(t))) {
        links.push({
          layer: "api",
          label: `${ep.method} ${ep.pathPattern}`,
          truth: ep.truth,
          evidence: ep.evidence,
        });
      }
    }

    for (const obj of dbReport.objects) {
      const hay = obj.name.toLowerCase();
      if (tokens.some((t) => hay.includes(t))) {
        links.push({
          layer: "db",
          label: obj.name,
          truth: obj.truth,
          evidence: obj.evidence,
        });
      }
    }

    const zombie = codeHits === 0;
    const truth: TruthLabel = links.length > 0 ? "INFERRED" : zombie ? "PARTIAL" : "UNKNOWN";

    features.push({
      featureId: slugFeature(marker.title, marker.sourcePath, marker.line),
      title: marker.title,
      docSource: marker.sourcePath,
      docLine: marker.line,
      links,
      zombie,
      truth,
    });
  }

  return { root, features, limitations };
}
