import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { atomicWriteTextFile } from "../../../../utils/fs.js";
import type { BrainDelta } from "../delta.js";
import { parseBrainDelta, serializeBrainDelta } from "../delta.js";
import { checkBrainCompatibility, migrateBrain } from "../migrate.js";
import { assertBrainContract } from "../contract.js";
import { redactBrainForStorage } from "../security.js";
import type { ProjectBrain } from "../types.js";
import {
  BRAIN_STORAGE_FORMAT_VERSION,
  PROJECT_BRAIN_SCHEMA_VERSION,
  SNAPSHOT_META_SCHEMA_VERSION,
  type BrainStorageFormatVersion,
  type ProjectBrainSchemaVersion,
  type SnapshotMetaSchemaVersion,
} from "../version.js";

export interface SnapshotMeta {
  schemaVersion: SnapshotMetaSchemaVersion;
  id: string;
  contentHash: string;
  createdAt: string;
  projectName: string;
  brainId: string;
  checksum: string;
}

export interface BrainStoreMeta {
  storageFormatVersion: BrainStorageFormatVersion;
  schemaVersion: ProjectBrainSchemaVersion;
  projectName: string;
  latestSnapshotId: string | null;
  snapshots: SnapshotMeta[];
}

export interface SnapshotComparison {
  leftId: string;
  rightId: string;
  sameContentHash: boolean;
  sameChecksum: boolean;
  left: SnapshotMeta;
  right: SnapshotMeta;
}

export class BrainStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BrainStorageError";
  }
}

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort((a, b) => a.localeCompare(b))) {
      sorted[key] = sortKeysDeep(record[key]);
    }
    return sorted;
  }
  return value;
}

export function serializeBrain(brain: ProjectBrain): string {
  const safe = redactBrainForStorage(brain);
  return `${JSON.stringify(sortKeysDeep(safe), null, 2)}\n`;
}

export function checksumPayload(payload: string): string {
  return createHash("sha256").update(payload).digest("hex");
}

function assertInsideRoot(root: string, candidate: string): string {
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(candidate);
  const rel = path.relative(resolvedRoot, resolved);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new BrainStorageError("path escapes brain storage root");
  }
  return resolved;
}

async function assertInsideRootResolved(root: string, candidate: string): Promise<string> {
  const lexical = assertInsideRoot(root, candidate);
  try {
    const realRoot = await fs.realpath(root);
    // Walk up until an existing ancestor can be realpath'd (catches symlink dirs).
    let probe = lexical;
    for (;;) {
      try {
        const realProbe = await fs.realpath(probe);
        const rel = path.relative(realRoot, realProbe);
        if (rel.startsWith("..") || path.isAbsolute(rel)) {
          throw new BrainStorageError("path escapes brain storage root via symlink");
        }
        // Existing path is inside root; return lexical target for create/read of leaf.
        return lexical;
      } catch (error) {
        if (error instanceof BrainStorageError) {
          throw error;
        }
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
          throw error;
        }
        const parent = path.dirname(probe);
        if (parent === probe) {
          return lexical;
        }
        probe = parent;
      }
    }
  } catch (error) {
    if (error instanceof BrainStorageError) {
      throw error;
    }
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return lexical;
    }
    throw error;
  }
}

export class LocalBrainStore {
  readonly root: string;

  constructor(rootDir: string) {
    this.root = path.resolve(rootDir);
  }

  static underRepo(repoRoot: string): LocalBrainStore {
    return new LocalBrainStore(path.join(repoRoot, ".agentdoctor", "project-brain"));
  }

  private metaPath(): string {
    return path.join(this.root, "store.json");
  }

  private snapshotDir(snapshotId: string): string {
    if (!/^snap_[a-f0-9]+$/i.test(snapshotId) && !/^snap_[a-z0-9_]+$/i.test(snapshotId)) {
      // Allow our snap_ hex ids; reject path tricks.
      if (snapshotId.includes("..") || snapshotId.includes("/") || snapshotId.includes("\\")) {
        throw new BrainStorageError("invalid snapshot id");
      }
    }
    if (snapshotId.includes("..") || snapshotId.includes("/") || snapshotId.includes("\\")) {
      throw new BrainStorageError("invalid snapshot id");
    }
    return assertInsideRoot(this.root, path.join(this.root, "snapshots", snapshotId));
  }

  private brainPath(snapshotId: string): string {
    return path.join(this.snapshotDir(snapshotId), "brain.json");
  }

  private deltaPath(beforeId: string, afterId: string): string {
    if (
      beforeId.includes("..") ||
      afterId.includes("..") ||
      beforeId.includes("/") ||
      afterId.includes("/") ||
      beforeId.includes("\\") ||
      afterId.includes("\\")
    ) {
      throw new BrainStorageError("invalid delta snapshot ids");
    }
    const name = `delta_${beforeId}__${afterId}.json`;
    return assertInsideRoot(this.root, path.join(this.root, "deltas", name));
  }

  async ensureRoot(): Promise<void> {
    await fs.mkdir(path.join(this.root, "snapshots"), { recursive: true });
    await fs.mkdir(path.join(this.root, "deltas"), { recursive: true });
  }

  async readMeta(): Promise<BrainStoreMeta> {
    await this.ensureRoot();
    try {
      const raw = await fs.readFile(this.metaPath(), "utf8");
      const parsed = JSON.parse(raw) as BrainStoreMeta;
      this.assertMetaCompatible(parsed);
      return parsed;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return {
          storageFormatVersion: BRAIN_STORAGE_FORMAT_VERSION,
          schemaVersion: PROJECT_BRAIN_SCHEMA_VERSION,
          projectName: "",
          latestSnapshotId: null,
          snapshots: [],
        };
      }
      throw error;
    }
  }

  private assertMetaCompatible(meta: BrainStoreMeta): void {
    const check = checkBrainCompatibility({
      schemaVersion: meta.schemaVersion,
      storageFormatVersion: meta.storageFormatVersion,
    });
    if (!check.compatible) {
      throw new BrainStorageError(check.reason ?? "incompatible store meta");
    }
  }

  async writeMeta(meta: BrainStoreMeta): Promise<void> {
    this.assertMetaCompatible(meta);
    await this.ensureRoot();
    await atomicWriteTextFile(this.metaPath(), `${JSON.stringify(sortKeysDeep(meta), null, 2)}\n`);
  }

  async saveSnapshot(brain: ProjectBrain): Promise<SnapshotMeta> {
    await this.ensureRoot();
    const snapshotId = brain.snapshot.id;
    const dir = await assertInsideRootResolved(this.root, this.snapshotDir(snapshotId));
    await fs.mkdir(dir, { recursive: true });

    const target = await assertInsideRootResolved(this.root, path.join(dir, "brain.json"));
    const payload = serializeBrain(brain);
    const nextChecksum = checksumPayload(payload);

    try {
      const existing = await fs.readFile(target, "utf8");
      const existingChecksum = checksumPayload(existing);
      if (existingChecksum !== nextChecksum) {
        throw new BrainStorageError(
          `snapshot ${snapshotId} already exists with different content; refusing overwrite`,
        );
      }
      const meta = await this.readMeta();
      const found = meta.snapshots.find((s) => s.id === snapshotId);
      if (found) {
        return found;
      }
    } catch (error) {
      if (error instanceof BrainStorageError) {
        throw error;
      }
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }

    await atomicWriteTextFile(target, payload);

    const snapMeta: SnapshotMeta = {
      schemaVersion: SNAPSHOT_META_SCHEMA_VERSION,
      id: snapshotId,
      contentHash: brain.snapshot.contentHash,
      createdAt: brain.snapshot.generatedAt,
      projectName: brain.metadata.projectName,
      brainId: brain.metadata.brainId,
      checksum: nextChecksum,
    };

    const meta = await this.readMeta();
    const snapshots = meta.snapshots.filter((s) => s.id !== snapshotId);
    snapshots.push(snapMeta);
    snapshots.sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));

    await this.writeMeta({
      storageFormatVersion: BRAIN_STORAGE_FORMAT_VERSION,
      schemaVersion: PROJECT_BRAIN_SCHEMA_VERSION,
      projectName: brain.metadata.projectName,
      latestSnapshotId: snapshotId,
      snapshots,
    });

    return snapMeta;
  }

  async loadSnapshot(snapshotId: string): Promise<ProjectBrain> {
    const target = await assertInsideRootResolved(this.root, this.brainPath(snapshotId));
    let raw: string;
    try {
      raw = await fs.readFile(target, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        throw new BrainStorageError(`snapshot not found: ${snapshotId}`);
      }
      throw error;
    }

    const meta = await this.readMeta();
    const snap = meta.snapshots.find((s) => s.id === snapshotId);
    if (snap) {
      const actual = checksumPayload(raw);
      if (actual !== snap.checksum) {
        throw new BrainStorageError(`checksum mismatch for snapshot ${snapshotId}`);
      }
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") {
      throw new BrainStorageError("corrupt brain JSON");
    }
    const version = String(
      (parsed as { metadata?: { schemaVersion?: string } }).metadata?.schemaVersion ?? "",
    );
    const check = checkBrainCompatibility({ schemaVersion: version });
    let brain: ProjectBrain;
    if (!check.compatible) {
      brain = migrateBrain(parsed as ProjectBrain, version);
    } else {
      try {
        brain = assertBrainContract(parsed);
      } catch (error) {
        throw new BrainStorageError(
          error instanceof Error ? error.message : "invalid brain contract",
        );
      }
    }
    return brain;
  }

  async listSnapshots(): Promise<SnapshotMeta[]> {
    const meta = await this.readMeta();
    return [...meta.snapshots];
  }

  async latestSnapshotId(): Promise<string | null> {
    const meta = await this.readMeta();
    return meta.latestSnapshotId;
  }

  async loadLatest(): Promise<ProjectBrain | null> {
    const id = await this.latestSnapshotId();
    if (!id) {
      return null;
    }
    return this.loadSnapshot(id);
  }

  async compareSnapshots(leftId: string, rightId: string): Promise<SnapshotComparison> {
    const meta = await this.readMeta();
    const left = meta.snapshots.find((s) => s.id === leftId);
    const right = meta.snapshots.find((s) => s.id === rightId);
    if (!left || !right) {
      throw new BrainStorageError("cannot compare: snapshot missing from registry");
    }
    return {
      leftId,
      rightId,
      sameContentHash: left.contentHash === right.contentHash,
      sameChecksum: left.checksum === right.checksum,
      left,
      right,
    };
  }

  async saveDelta(delta: BrainDelta): Promise<string> {
    await this.ensureRoot();
    const target = this.deltaPath(delta.beforeSnapshotId, delta.afterSnapshotId);
    await atomicWriteTextFile(target, serializeBrainDelta(delta));
    return target;
  }

  async loadDelta(beforeId: string, afterId: string): Promise<BrainDelta> {
    const target = this.deltaPath(beforeId, afterId);
    try {
      const raw = await fs.readFile(target, "utf8");
      return parseBrainDelta(raw);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        throw new BrainStorageError(`delta not found: ${beforeId} → ${afterId}`);
      }
      throw error;
    }
  }
}
