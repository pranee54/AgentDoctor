import fs from "node:fs/promises";
import path from "node:path";

import { safeRelPath } from "../../security/paths.js";
import { resolveRepoRoot } from "../../utils/path.js";
import { pathExists } from "../../utils/fs.js";

export interface ChangeLedgerEntry {
  id: string;
  recordedAt: string;
  task?: string;
  plan?: string;
  approval?: string;
  files?: string[];
  tests?: string[];
  proofIds?: string[];
  note?: string;
}

export interface ChangeLedgerListResult {
  root: string;
  ledgerDir: string;
  entries: ChangeLedgerEntry[];
  limitations: string[];
}

function ledgerDirFor(root: string): string {
  return path.join(resolveRepoRoot(root), ".agentdoctor", "change-ledger");
}

function ledgerFileFor(root: string): string {
  return path.join(ledgerDirFor(root), "entries.jsonl");
}

async function ensureLedgerDir(root: string): Promise<string> {
  const dir = ledgerDirFor(root);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

function newEntryId(): string {
  return `cle_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function appendChangeLedgerEntry(
  rootInput: string,
  entry: Omit<ChangeLedgerEntry, "id" | "recordedAt"> & { id?: string; recordedAt?: string },
): Promise<ChangeLedgerEntry> {
  const root = resolveRepoRoot(rootInput);
  await ensureLedgerDir(root);
  const record: ChangeLedgerEntry = {
    id: entry.id ?? newEntryId(),
    recordedAt: entry.recordedAt ?? new Date().toISOString(),
    ...(entry.task !== undefined ? { task: entry.task } : {}),
    ...(entry.plan !== undefined ? { plan: entry.plan } : {}),
    ...(entry.approval !== undefined ? { approval: entry.approval } : {}),
    ...(entry.files !== undefined ? { files: entry.files.map((f) => safeRelPath(root, f)) } : {}),
    ...(entry.tests !== undefined ? { tests: entry.tests } : {}),
    ...(entry.proofIds !== undefined ? { proofIds: entry.proofIds } : {}),
    ...(entry.note !== undefined ? { note: entry.note } : {}),
  };
  const line = `${JSON.stringify(record)}\n`;
  await fs.appendFile(ledgerFileFor(root), line, "utf8");
  return record;
}

export async function readChangeLedger(rootInput: string): Promise<ChangeLedgerListResult> {
  const root = resolveRepoRoot(rootInput);
  const ledgerDir = ledgerDirFor(root);
  const limitations = ["Append-only JSONL; entries are not cryptographically signed."];
  const file = ledgerFileFor(root);
  if (!(await pathExists(file))) {
    return { root, ledgerDir, entries: [], limitations };
  }
  const text = await fs.readFile(file, "utf8");
  const entries: ChangeLedgerEntry[] = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      entries.push(JSON.parse(trimmed) as ChangeLedgerEntry);
    } catch {
      limitations.push("Skipped malformed JSONL line in change ledger.");
    }
  }
  return { root, ledgerDir, entries, limitations };
}

export async function listChangeLedgerEntries(rootInput: string): Promise<ChangeLedgerEntry[]> {
  const result = await readChangeLedger(rootInput);
  return result.entries;
}
