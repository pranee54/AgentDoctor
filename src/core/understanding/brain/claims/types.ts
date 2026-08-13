import type { ClaimSchemaVersion } from "../version.js";
import { CLAIM_SCHEMA_VERSION } from "../version.js";

export type ClaimStatus = "ACTIVE" | "INVALIDATED" | "SUPERSEDED" | "CONTRADICTED";

export type ClaimSource =
  | "domain-discovery"
  | "entrypoint-discovery"
  | "dependency-discovery"
  | "relationship-discovery"
  | "architecture-inference"
  | "ownership-discovery"
  | "risk-discovery"
  | "component-model"
  | "project-brain";

export interface BrainClaim {
  schemaVersion: ClaimSchemaVersion;
  id: string;
  subject: string;
  predicate: string;
  object: string;
  snapshotId: string;
  evidenceIds: readonly string[];
  confidence: number;
  source: ClaimSource;
  status: ClaimStatus;
  createdAt: string;
  invalidatedAt?: string;
  supersededBy?: string;
  contradictionIds: readonly string[];
}

export function createClaimId(subject: string, predicate: string, object: string): string {
  const key = `${subject}\0${predicate}\0${object}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return `claim_${hash.toString(16).padStart(8, "0")}`;
}

export function buildClaim(input: {
  subject: string;
  predicate: string;
  object: string;
  snapshotId: string;
  evidenceIds: readonly string[];
  confidence: number;
  source: ClaimSource;
  createdAt: string;
  status?: ClaimStatus;
  contradictionIds?: readonly string[];
}): BrainClaim {
  return {
    schemaVersion: CLAIM_SCHEMA_VERSION,
    id: createClaimId(input.subject, input.predicate, input.object),
    subject: input.subject,
    predicate: input.predicate,
    object: input.object,
    snapshotId: input.snapshotId,
    evidenceIds: [...input.evidenceIds],
    confidence: input.confidence,
    source: input.source,
    status: input.status ?? "ACTIVE",
    createdAt: input.createdAt,
    contradictionIds: [...(input.contradictionIds ?? [])],
  };
}
