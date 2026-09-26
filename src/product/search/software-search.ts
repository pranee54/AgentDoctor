import path from "node:path";

import { loadLatestBrain, searchBrain } from "../../core/brain-cli/service.js";
import { detectProject } from "../../detectors/project.js";
import { readTextFile } from "../../utils/fs.js";
import { resolveRepoRoot } from "../../utils/path.js";
import type { TruthLabel } from "../truth.js";
import { buildIndex, documentId, searchHybrid, type IndexDocument } from "./index.js";

export interface SoftwareSearchHit {
  kind: "filename" | "content" | "brain" | "tfidf";
  path: string;
  line?: number;
  excerpt: string;
  score: number;
  truth: TruthLabel;
}

export interface SoftwareSearchReport {
  root: string;
  query: string;
  hits: SoftwareSearchHit[];
  limitations: string[];
}

export async function searchSymbolsAndConcepts(
  rootInput: string,
  query: string,
  options?: { maxHits?: number; maxFiles?: number },
): Promise<SoftwareSearchReport> {
  const root = resolveRepoRoot(rootInput);
  const q = query.trim();
  const maxHits = options?.maxHits ?? 40;
  const maxFiles = options?.maxFiles ?? 300;
  const limitations = [
    "Search combines TF-IDF keyword index + brain claims + bounded filename/content scan.",
    "TF-IDF is lexical — not neural embeddings or semantic code search.",
    "Content substring hits are INFERRED.",
  ];

  if (!q) {
    return { root, query: q, hits: [], limitations: [...limitations, "Empty query"] };
  }

  const hits: SoftwareSearchHit[] = [];
  const qLower = q.toLowerCase();

  const brain = await loadLatestBrain(root);
  if (brain) {
    for (const bh of searchBrain(brain, q)) {
      hits.push({
        kind: "brain",
        path: ".agentdoctor/project-brain",
        excerpt: bh.text,
        score: bh.score + 0.2,
        truth: "INFERRED",
      });
    }
  } else {
    limitations.push("No project brain snapshot; brain search skipped.");
  }

  const detection = await detectProject(root);
  let filesScanned = 0;
  const indexDocs: IndexDocument[] = [];
  const substringHits: Array<{ path: string; line?: number; excerpt: string; score: number }> = [];

  for (const entry of detection.discovery.files) {
    if (filesScanned >= maxFiles) break;
    const rel = entry.relativePath.replace(/\\/g, "/");
    filesScanned += 1;

    const base = path.basename(rel).toLowerCase();
    if (base.includes(qLower)) {
      hits.push({
        kind: "filename",
        path: rel,
        excerpt: rel,
        score: 1.1,
        truth: "VERIFIED",
      });
    }

    const text = await readTextFile(path.join(root, rel), 256 * 1024);
    if (text === null) continue;
    indexDocs.push({
      id: documentId(rel, text),
      path: rel,
      text: `${rel}\n${text.slice(0, 8_000)}`,
    });
    const idx = text.toLowerCase().indexOf(qLower);
    if (idx >= 0) {
      const line = text.slice(0, idx).split("\n").length;
      const lineText = text.split(/\r?\n/)[line - 1]?.trim() ?? "";
      substringHits.push({
        path: rel,
        line,
        excerpt: lineText.slice(0, 140),
        score: 1,
      });
    }
  }

  if (filesScanned >= maxFiles) {
    limitations.push(`Content scan capped at ${maxFiles} files`);
  }

  if (indexDocs.length) {
    const index = buildIndex(indexDocs);
    limitations.push(...index.limitations);
    for (const h of searchHybrid(index, q, substringHits, maxHits)) {
      hits.push({
        kind: h.kind === "tfidf" ? "tfidf" : "content",
        path: h.path,
        ...(h.line !== undefined ? { line: h.line } : {}),
        excerpt: h.excerpt,
        score: h.score,
        truth: h.kind === "tfidf" ? "INFERRED" : "INFERRED",
      });
    }
  }

  hits.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));

  return {
    root,
    query: q,
    hits: hits.slice(0, maxHits),
    limitations,
  };
}
