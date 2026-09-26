import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

import { DEFAULT_MAX_FILE_SIZE_BYTES } from "../../constants.js";
import { atomicWriteTextFile, pathExists, readJsonFile } from "../../utils/fs.js";
import { resolveRepoRoot } from "../../utils/path.js";
import type { SoftwareDigitalTwin } from "./digital-twin.js";
import { buildSoftwareDigitalTwinSnapshot } from "./digital-twin.js";

export interface TwinSnapshotMeta {
  root: string;
  generatedAt: string;
  invalidationHash: string;
  changedFiles?: string[];
}

export interface StoredTwinSnapshot {
  meta: TwinSnapshotMeta;
  twin: SoftwareDigitalTwin;
}

function twinDir(root: string): string {
  return path.join(resolveRepoRoot(root), ".agentdoctor", "twin");
}

function snapshotPath(root: string): string {
  return path.join(twinDir(root), "snapshot.json");
}

function hashInputs(changedFiles: string[] | undefined): string {
  const payload = (changedFiles ?? []).slice().sort().join("\n");
  return createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

export async function loadTwinSnapshot(rootInput: string): Promise<StoredTwinSnapshot | null> {
  const root = resolveRepoRoot(rootInput);
  const parsed = await readJsonFile<StoredTwinSnapshot>(
    snapshotPath(root),
    DEFAULT_MAX_FILE_SIZE_BYTES,
  );
  if (!parsed.ok) return null;
  if (parsed.data.meta.root !== root) return null;
  return parsed.data;
}

export async function saveTwinSnapshot(
  rootInput: string,
  twin: SoftwareDigitalTwin,
  meta: Omit<TwinSnapshotMeta, "generatedAt"> & { generatedAt?: string },
): Promise<string> {
  const root = resolveRepoRoot(rootInput);
  const file = snapshotPath(root);
  await fs.mkdir(path.dirname(file), { recursive: true });
  const stored: StoredTwinSnapshot = {
    meta: {
      root,
      generatedAt: meta.generatedAt ?? new Date().toISOString(),
      invalidationHash: meta.invalidationHash,
      ...(meta.changedFiles?.length ? { changedFiles: meta.changedFiles } : {}),
    },
    twin,
  };
  await atomicWriteTextFile(file, `${JSON.stringify(stored, null, 2)}\n`);
  return file;
}

export async function invalidateTwinSnapshot(rootInput: string): Promise<void> {
  const root = resolveRepoRoot(rootInput);
  const file = snapshotPath(root);
  if (await pathExists(file)) {
    await fs.rm(file, { force: true });
  }
}

export async function updateTwin(
  rootInput: string,
  options?: { changedFiles?: string[]; force?: boolean },
): Promise<SoftwareDigitalTwin> {
  const root = resolveRepoRoot(rootInput);
  const invalidationHash = hashInputs(options?.changedFiles);
  const existing = options?.force ? null : await loadTwinSnapshot(root);

  if (
    existing &&
    existing.meta.invalidationHash === invalidationHash &&
    existing.twin.root === root
  ) {
    return existing.twin;
  }

  await invalidateTwinSnapshot(root);
  const twin = await buildSoftwareDigitalTwinSnapshot(root);
  await saveTwinSnapshot(root, twin, {
    root,
    invalidationHash,
    ...(options?.changedFiles?.length ? { changedFiles: options.changedFiles } : {}),
  });
  return twin;
}

export async function buildSoftwareDigitalTwin(rootInput: string): Promise<SoftwareDigitalTwin> {
  return updateTwin(rootInput);
}
