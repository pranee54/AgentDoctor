import fs from "node:fs/promises";
import path from "node:path";

import { DEFAULT_MAX_FILE_SIZE_BYTES } from "../../constants.js";
import { detectProject } from "../../detectors/project.js";
import { readTextFile } from "../../utils/fs.js";
import { resolveSafeRepoPath } from "../../security/paths.js";
import { resolveRepoRoot } from "../../utils/path.js";
import { pathExists } from "../../utils/fs.js";
import type { ProductEvidence, TruthLabel } from "../truth.js";

export interface DecisionRecord {
  id: string;
  title: string;
  status?: string;
  source: "adr-file" | "ledger";
  truth: TruthLabel;
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

function isAdrPath(relativePath: string): boolean {
  const norm = relativePath.replace(/\\/g, "/").toLowerCase();
  return (
    norm.startsWith("docs/adr/") ||
    norm.startsWith("adr/") ||
    norm.includes("/adr/") ||
    /^adr-\d+/i.test(path.basename(relativePath))
  );
}

function parseAdr(relativePath: string, content: string): DecisionRecord | null {
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
  return {
    id,
    title,
    ...(status !== undefined ? { status } : {}),
    source: "adr-file",
    truth: "VERIFIED",
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
    const parsed = parseAdr(rel, text);
    if (parsed) decisions.push(parsed);
  }
  decisions.sort((a, b) => a.id.localeCompare(b.id));
  return decisions;
}

export async function appendDecisionLedgerEntry(
  rootInput: string,
  record: Omit<DecisionRecord, "source" | "truth"> & {
    source?: DecisionRecord["source"];
    truth?: TruthLabel;
  },
): Promise<DecisionRecord> {
  const root = resolveRepoRoot(rootInput);
  const dir = path.dirname(ledgerFile(root));
  await fs.mkdir(dir, { recursive: true });
  const full: DecisionRecord = {
    ...record,
    source: record.source ?? "ledger",
    truth: record.truth ?? "VERIFIED",
    recordedAt: record.recordedAt ?? new Date().toISOString(),
  };
  await fs.appendFile(ledgerFile(root), `${JSON.stringify(full)}\n`, "utf8");
  return full;
}

export async function loadDecisionLedger(rootInput: string): Promise<DecisionLedgerResult> {
  const root = resolveRepoRoot(rootInput);
  const limitations = [
    "ADR parsing reads markdown titles and Status lines only.",
    "Ledger JSONL entries are merged with discovered ADR files (deduped by id).",
  ];
  const fromAdr = await parseAdrDecisions(root);
  const fromLedger: DecisionRecord[] = [];
  const file = ledgerFile(root);
  if (await pathExists(file)) {
    const text = await fs.readFile(file, "utf8");
    for (const line of text.split(/\r?\n/)) {
      if (!line.trim()) continue;
      try {
        fromLedger.push(JSON.parse(line) as DecisionRecord);
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
