import type { EvidenceSchemaVersion } from "../version.js";
import { EVIDENCE_SCHEMA_VERSION } from "../version.js";

export type EvidenceKind =
  | "path"
  | "file-presence"
  | "config-key"
  | "import-edge"
  | "role-signal"
  | "pattern-match"
  | "ownership-rule"
  | "model-statistic"
  | "derived";

export type EvidenceEpistemics = "observed" | "inferred";

export type EvidenceRedactionStatus = "none" | "path-only" | "redacted";

export interface BrainEvidence {
  schemaVersion: EvidenceSchemaVersion;
  id: string;
  kind: EvidenceKind;
  /** Repository-relative locator (path, pattern, or symbolic key). Never secret contents. */
  locator: string;
  source: string;
  snapshotId: string;
  epistemics: EvidenceEpistemics;
  symbol?: string;
  range?: { startLine: number; endLine: number };
  redaction: EvidenceRedactionStatus;
}

export function createEvidenceId(parts: readonly string[]): string {
  const key = parts.join("\0");
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return `ev_${hash.toString(16).padStart(8, "0")}`;
}

export function buildEvidence(input: {
  kind: EvidenceKind;
  locator: string;
  source: string;
  snapshotId: string;
  epistemics: EvidenceEpistemics;
  symbol?: string;
  range?: { startLine: number; endLine: number };
  redaction?: EvidenceRedactionStatus;
}): BrainEvidence {
  const evidence: BrainEvidence = {
    schemaVersion: EVIDENCE_SCHEMA_VERSION,
    id: createEvidenceId([
      input.kind,
      input.locator,
      input.source,
      input.snapshotId,
      input.epistemics,
      input.symbol ?? "",
    ]),
    kind: input.kind,
    locator: input.locator,
    source: input.source,
    snapshotId: input.snapshotId,
    epistemics: input.epistemics,
    redaction: input.redaction ?? "path-only",
  };
  if (input.symbol !== undefined) {
    evidence.symbol = input.symbol;
  }
  if (input.range !== undefined) {
    evidence.range = input.range;
  }
  return evidence;
}
