import path from "node:path";

import { DEFAULT_MAX_FILE_SIZE_BYTES } from "../constants.js";
import { detectProject } from "../detectors/project.js";
import { readTextFile } from "../utils/fs.js";
import { resolveRepoRoot } from "../utils/path.js";

export interface ScannedSourceFile {
  relativePath: string;
  content: string;
}

export async function loadProjectSourceFiles(
  rootInput: string,
  filter: (relativePath: string) => boolean,
  maxFileSizeBytes = DEFAULT_MAX_FILE_SIZE_BYTES,
): Promise<{ root: string; files: ScannedSourceFile[]; limitations: string[] }> {
  const root = resolveRepoRoot(rootInput);
  const detection = await detectProject(root, maxFileSizeBytes);
  const limitations: string[] = [];
  if (detection.diagnostics.length) {
    limitations.push(...detection.diagnostics.slice(0, 5));
  }
  const files: ScannedSourceFile[] = [];
  for (const entry of detection.discovery.files) {
    const rel = entry.relativePath.replace(/\\/g, "/");
    if (!filter(rel)) continue;
    const text = await readTextFile(path.join(root, rel), maxFileSizeBytes);
    if (text === null) continue;
    files.push({ relativePath: rel, content: text });
  }
  return { root, files, limitations };
}

export function lineNumberAt(content: string, index: number): number {
  if (index <= 0) return 1;
  let line = 1;
  for (let i = 0; i < index && i < content.length; i++) {
    if (content.charCodeAt(i) === 10) line++;
  }
  return line;
}

export function isMarkdownDoc(relativePath: string): boolean {
  const lower = relativePath.toLowerCase();
  return lower.endsWith(".md") || lower.endsWith(".markdown");
}

export function isLikelyRequirementsDoc(relativePath: string): boolean {
  const base = relativePath.split("/").pop()?.toLowerCase() ?? "";
  if (base === "requirements.md" || base === "user-stories.md") return true;
  if (relativePath.startsWith("docs/") && isMarkdownDoc(relativePath)) return true;
  return false;
}
