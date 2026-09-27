import fs from "node:fs/promises";
import path from "node:path";

import { DEFAULT_MAX_FILE_SIZE_BYTES } from "../../constants.js";
import { detectProject } from "../../detectors/project.js";
import {
  classifyRelativePathOwnership,
  isProjectOwnedRelativePath,
  verifiedDecisionTruthMeaning,
  type ProjectOwnershipClass,
} from "../../project/ownership.js";
import { resolveSafeRepoPath } from "../../security/paths.js";
import { pathExists, readTextFile } from "../../utils/fs.js";
import { resolveRepoRoot } from "../../utils/path.js";
import type { ProductEvidence, TruthLabel } from "../truth.js";

/** Why a decision document is attributed to the current project. */
export type DecisionSourceKind =
  "adr_file" | "decision_ledger" | "architecture_document" | "internal_note" | "unknown";

export interface DecisionRecord {
  id: string;
  title: string;
  status?: string;
  /** Wire-compat provenance channel. */
  source: "adr-file" | "ledger";
  sourceKind: DecisionSourceKind;
  truth: TruthLabel;
  /** Explicit meaning for UI — never “architecture proven correct”. */
  truthMeaning: string;
  projectRoot: string;
  ownership: ProjectOwnershipClass;
  evidence: ProductEvidence[];
  recordedAt?: string;
  bodyExcerpt?: string;
}

export interface DecisionLedgerResult {
  root: string;
  decisions: DecisionRecord[];
  ledgerPath: string;
  limitations: string[];
}

function ledgerFile(root: string): string {
  return path.join(resolveRepoRoot(root), ".agentdoctor", "decisions", "entries.jsonl");
}

/**
 * ADR-shaped paths under the current project-owned tree only.
 * Nested foreign trees with an adr directory segment are excluded by ownership
 * before this runs; this still refuses internal_docs / private paths as defense in depth.
 */
function isAdrPath(relativePath: string): boolean {
  if (!isProjectOwnedRelativePath(relativePath)) return false;
  const norm = relativePath.replace(/\\/g, "/").toLowerCase();
  const base = path.basename(relativePath);
  return norm.startsWith("docs/adr/") || norm.startsWith("adr/") || /^adr[-_]\d+/i.test(base);
}

function parseAdr(
  projectRoot: string,
  relativePath: string,
  content: string,
): DecisionRecord | null {
  const lines = content.split(/\r?\n/);
  let title = "";
  let status: string | undefined;
  for (const line of lines) {
    if (!title && /^#\s+/.test(line)) {
      title = line.replace(/^#\s+/, "").trim();
    }
    const statusMatch = /^\*\*Status\*\*:\s*(.+)$/i.exec(line.trim());
    if (statusMatch) status = statusMatch[1]!.trim();
  }
  if (!title) return null;
  const id = relativePath.replace(/[^\w./-]/g, "_");
  const ownership = classifyRelativePathOwnership(relativePath);
  return {
    id,
    title,
    ...(status !== undefined ? { status } : {}),
    source: "adr-file",
    sourceKind: "adr_file",
    truth: "VERIFIED",
    truthMeaning: verifiedDecisionTruthMeaning(),
    projectRoot,
    ownership,
    evidence: [{ path: relativePath, line: 1, excerpt: title.slice(0, 120) }],
    bodyExcerpt: content.slice(0, 400),
  };
}

export async function parseAdrDecisions(
  rootInput: string,
  maxFileSizeBytes = DEFAULT_MAX_FILE_SIZE_BYTES,
): Promise<DecisionRecord[]> {
  const root = resolveRepoRoot(rootInput);
  const detection = await detectProject(root, maxFileSizeBytes);
  const decisions: DecisionRecord[] = [];
  for (const entry of detection.discovery.files) {
    const rel = entry.relativePath.replace(/\\/g, "/");
    if (!isAdrPath(rel) || !rel.toLowerCase().endsWith(".md")) continue;
    const text = await readTextFile(path.join(root, rel), maxFileSizeBytes);
    if (!text) continue;
    const parsed = parseAdr(root, rel, text);
    if (parsed) decisions.push(parsed);
  }
  decisions.sort((a, b) => a.id.localeCompare(b.id));
  return decisions;
}

export async function appendDecisionLedgerEntry(
  rootInput: string,
  record: Omit<
    DecisionRecord,
    "source" | "truth" | "sourceKind" | "truthMeaning" | "projectRoot" | "ownership"
  > & {
    source?: DecisionRecord["source"];
    sourceKind?: DecisionSourceKind;
    truth?: TruthLabel;
    truthMeaning?: string;
    ownership?: ProjectOwnershipClass;
  },
): Promise<DecisionRecord> {
  const root = resolveRepoRoot(rootInput);
  const dir = path.dirname(ledgerFile(root));
  await fs.mkdir(dir, { recursive: true });
  const full: DecisionRecord = {
    ...record,
    source: record.source ?? "ledger",
    sourceKind: record.sourceKind ?? "decision_ledger",
    truth: record.truth ?? "VERIFIED",
    truthMeaning: record.truthMeaning ?? verifiedDecisionTruthMeaning(),
    projectRoot: root,
    ownership: record.ownership ?? "project_owned",
    recordedAt: record.recordedAt ?? new Date().toISOString(),
  };
  await fs.appendFile(ledgerFile(root), `${JSON.stringify(full)}\n`, "utf8");
  return full;
}

export async function loadDecisionLedger(rootInput: string): Promise<DecisionLedgerResult> {
  const root = resolveRepoRoot(rootInput);
  const limitations = [
    "ADR parsing reads markdown titles and Status lines only.",
    "Only project-owned trees are scanned; nested repositories and private/validation checkouts are excluded.",
    "VERIFIED means the ADR file was found and parsed — not that the architecture decision is independently proven correct.",
    "Ledger JSONL entries are merged with discovered ADR files (deduped by id) when present and project-owned.",
  ];
  const fromAdr = await parseAdrDecisions(root);
  const fromLedger: DecisionRecord[] = [];
  const file = ledgerFile(root);
  if (await pathExists(file)) {
    const text = await fs.readFile(file, "utf8");
    for (const line of text.split(/\r?\n/)) {
      if (!line.trim()) continue;
      try {
        const raw = JSON.parse(line) as DecisionRecord;
        const evidencePath = raw.evidence?.[0]?.path ?? raw.id;
        if (
          !isProjectOwnedRelativePath(String(evidencePath)) &&
          !isProjectOwnedRelativePath(String(raw.id))
        ) {
          limitations.push(`Skipped non-owned ledger entry: ${raw.id}`);
          continue;
        }
        fromLedger.push({
          ...raw,
          source: raw.source ?? "ledger",
          sourceKind: raw.sourceKind ?? "decision_ledger",
          truth: raw.truth ?? "VERIFIED",
          truthMeaning: raw.truthMeaning ?? verifiedDecisionTruthMeaning(),
          projectRoot: raw.projectRoot ?? root,
          ownership: raw.ownership ?? classifyRelativePathOwnership(String(evidencePath)),
        });
      } catch {
        limitations.push("Skipped malformed decision ledger line.");
      }
    }
  }

  const byId = new Map<string, DecisionRecord>();
  for (const d of [...fromAdr, ...fromLedger]) {
    byId.set(d.id, d);
  }

  return {
    root,
    decisions: [...byId.values()].sort((a, b) => a.title.localeCompare(b.title)),
    ledgerPath: ledgerFile(root),
    limitations,
  };
}

export function resolveDecisionPath(rootInput: string, candidate: string): string {
  return resolveSafeRepoPath(rootInput, candidate);
}
