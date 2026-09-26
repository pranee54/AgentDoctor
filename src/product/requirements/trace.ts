import path from "node:path";

import { DEFAULT_MAX_FILE_SIZE_BYTES } from "../../constants.js";
import { detectProject } from "../../detectors/project.js";
import { readTextFile } from "../../utils/fs.js";
import { resolveRepoRoot } from "../../utils/path.js";
import type { ProductEvidence, TruthLabel } from "../truth.js";
import { isLikelyRequirementsDoc, isMarkdownDoc } from "../evidence-scan.js";

export interface RequirementTrace {
  id: string;
  title: string;
  sourcePath: string;
  sourceLine: number;
  acceptanceCriteria: string[];
  truth: TruthLabel;
  evidence: ProductEvidence[];
  missingTestHeuristic: boolean;
  missingTestNote?: string;
}

export interface RequirementsTraceReport {
  root: string;
  requirements: RequirementTrace[];
  limitations: string[];
}

const REQ_HEADING =
  /^(#{1,4})\s+(?:REQ[-\s]?(\d+)[:\s]+|Requirement\s+(\d+)[:\s]+|US[-\s]?(\d+)[:\s]+|User\s+Story\s+(\d+)[:\s]+)?(.+)$/i;
const AC_LINE = /^\s*[-*]\s*(?:AC|Acceptance Criteria)[:\s]+(.+)$/i;
const AC_SECTION = /^#{1,4}\s+Acceptance Criteria\s*$/i;

function slugId(sourcePath: string, line: number, title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `${sourcePath.replace(/[^\w./-]/g, "_")}:${line}:${slug || "req"}`;
}

function testFileMightCover(title: string, testPaths: string[]): boolean {
  const tokens = title
    .toLowerCase()
    .split(/\W+/)
    .filter((t) => t.length > 3);
  if (!tokens.length) return false;
  for (const tp of testPaths) {
    const lower = tp.toLowerCase();
    if (tokens.some((t) => lower.includes(t))) return true;
  }
  return false;
}

function isTestPath(relativePath: string): boolean {
  const p = relativePath.toLowerCase();
  return (
    p.includes(".test.") ||
    p.includes(".spec.") ||
    p.startsWith("tests/") ||
    p.startsWith("test/") ||
    p.includes("__tests__/")
  );
}

function docEligible(relativePath: string, content: string): boolean {
  if (!isMarkdownDoc(relativePath)) return false;
  if (isLikelyRequirementsDoc(relativePath)) return true;
  if (/acceptance criteria/i.test(content)) return true;
  if (/^#{1,4}\s+(?:REQ|Requirement|User Story)/im.test(content)) return true;
  return false;
}

function parseRequirementsFromDoc(
  relativePath: string,
  content: string,
  testPaths: string[],
): RequirementTrace[] {
  const lines = content.split(/\r?\n/);
  const out: RequirementTrace[] = [];
  let inAcSection = false;
  let current: RequirementTrace | null = null;

  const flush = () => {
    if (!current) return;
    if (current.acceptanceCriteria.length === 0) {
      current.truth = "PARTIAL";
    }
    current.missingTestHeuristic = !testFileMightCover(current.title, testPaths);
    if (current.missingTestHeuristic) {
      current.missingTestNote =
        "No test file path matched requirement title tokens (heuristic only).";
    }
    out.push(current);
    current = null;
    inAcSection = false;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const lineNo = i + 1;

    if (AC_SECTION.test(line.trim())) {
      inAcSection = true;
      continue;
    }

    const heading = REQ_HEADING.exec(line.trim());
    if (heading) {
      flush();
      const reqNum = heading[2] ?? heading[3] ?? heading[4] ?? heading[5];
      const titlePart = (heading[6] ?? "").trim();
      const base = relativePath.split("/").pop()?.toLowerCase() ?? "";
      const explicitCatalog = base === "requirements.md" || base === "user-stories.md";
      if (!reqNum && !explicitCatalog) continue;
      const title = reqNum ? titlePart : titlePart || line.replace(/^#{1,4}\s+/, "").trim();
      if (!title || title.length < 3) continue;
      const displayTitle = reqNum ? `REQ-${reqNum}: ${title}` : title;
      current = {
        id: slugId(relativePath, lineNo, displayTitle),
        title: displayTitle,
        sourcePath: relativePath,
        sourceLine: lineNo,
        acceptanceCriteria: [],
        truth: "VERIFIED",
        evidence: [{ path: relativePath, line: lineNo, excerpt: line.trim().slice(0, 120) }],
        missingTestHeuristic: false,
      };
      inAcSection = false;
      continue;
    }

    if (!current) continue;

    const acInline = AC_LINE.exec(line);
    if (acInline?.[1]) {
      current.acceptanceCriteria.push(acInline[1].trim());
      current.evidence.push({
        path: relativePath,
        line: lineNo,
        excerpt: line.trim().slice(0, 120),
      });
      continue;
    }

    if (inAcSection && /^\s*[-*]\s+/.test(line)) {
      const item = line.replace(/^\s*[-*]\s+/, "").trim();
      if (item) {
        current.acceptanceCriteria.push(item);
        current.evidence.push({
          path: relativePath,
          line: lineNo,
          excerpt: item.slice(0, 120),
        });
      }
    } else if (inAcSection && line.trim() === "") {
      continue;
    } else if (inAcSection && /^#{1,4}\s/.test(line)) {
      inAcSection = false;
    }
  }
  flush();
  return out;
}

/**
 * Scan repository docs for requirements / user stories with file evidence only.
 */
export async function traceRequirements(
  rootInput: string,
  maxFileSizeBytes = DEFAULT_MAX_FILE_SIZE_BYTES,
): Promise<RequirementsTraceReport> {
  const root = resolveRepoRoot(rootInput);
  const detection = await detectProject(root, maxFileSizeBytes);
  const limitations: string[] = [
    "Requirements are extracted only from markdown headings and acceptance-criteria sections present in files.",
    "Missing-test detection is a filename/token heuristic, not coverage analysis.",
  ];
  if (detection.diagnostics.length) {
    limitations.push(...detection.diagnostics.slice(0, 3));
  }

  const testPaths = detection.discovery.files.map((f) => f.relativePath).filter(isTestPath);

  const requirements: RequirementTrace[] = [];
  for (const entry of detection.discovery.files) {
    const rel = entry.relativePath.replace(/\\/g, "/");
    const abs = path.join(root, rel);
    const text = await readTextFile(abs, maxFileSizeBytes);
    if (text === null) continue;
    if (!docEligible(rel, text)) continue;
    requirements.push(...parseRequirementsFromDoc(rel, text, testPaths));
  }

  requirements.sort((a, b) =>
    a.sourcePath === b.sourcePath
      ? a.sourceLine - b.sourceLine
      : a.sourcePath.localeCompare(b.sourcePath),
  );

  return { root, requirements, limitations };
}
