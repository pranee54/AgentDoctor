import type { ProjectBrain } from "../../core/understanding/brain/index.js";

export interface SnapshotProvenance {
  id: string;
  schemaVersion: string;
  contentHash: string;
  createdAt: string;
  brainId: string;
  projectName: string;
}

export interface BrainMcpEnvelope<T> {
  ok: true;
  result: T;
  evidenceIds: readonly string[];
  confidence: number;
  snapshot: SnapshotProvenance;
  claimStatus?: string;
  metadata: Record<string, unknown>;
}

export function snapshotProvenance(brain: ProjectBrain): SnapshotProvenance {
  return {
    id: brain.snapshot.id,
    schemaVersion: brain.metadata.schemaVersion,
    contentHash: brain.snapshot.contentHash,
    createdAt: brain.snapshot.generatedAt,
    brainId: brain.metadata.brainId,
    projectName: brain.metadata.projectName,
  };
}

export function wrapProvenance<T>(options: {
  brain: ProjectBrain;
  result: T;
  evidenceIds?: readonly string[];
  confidence?: number;
  claimStatus?: string;
  metadata?: Record<string, unknown>;
}): BrainMcpEnvelope<T> {
  const envelope: BrainMcpEnvelope<T> = {
    ok: true,
    result: options.result,
    evidenceIds: options.evidenceIds ?? [],
    confidence: options.confidence ?? 0,
    snapshot: snapshotProvenance(options.brain),
    metadata: options.metadata ?? {},
  };
  if (options.claimStatus !== undefined) {
    envelope.claimStatus = options.claimStatus;
  }
  return envelope;
}

/** Stable JSON for determinism checks (drops timing). */
export function stableJson(value: unknown): string {
  return `${JSON.stringify(sortKeysDeep(stripTiming(value)))}\n`;
}

function stripTiming(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripTiming);
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const next: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(record)) {
      if (key === "executionTimeMs" || key === "timingMs") {
        continue;
      }
      next[key] = stripTiming(entry);
    }
    return next;
  }
  return value;
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
