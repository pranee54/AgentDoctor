import type { ProjectBrain } from "./types.js";
import { PROJECT_BRAIN_SCHEMA_VERSION } from "./version.js";
import { CONFIDENCE_MIN, CONFIDENCE_MAX } from "./confidence.js";

export class BrainContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BrainContractError";
  }
}

const CLAIM_STATUSES = new Set(["ACTIVE", "INVALIDATED", "SUPERSEDED", "CONTRADICTED"]);

/** Machine-consumption contract: required top-level ProjectBrain fields (schema 1.0.0). */
export const PROJECT_BRAIN_CONTRACT = {
  schemaVersion: PROJECT_BRAIN_SCHEMA_VERSION,
  requiredFields: [
    "metadata",
    "snapshot",
    "model",
    "ownership",
    "risks",
    "components",
    "claims",
    "evidence",
    "contradictions",
    "unknowns",
    "limitations",
    "confidenceContract",
  ] as const,
  claimStatuses: ["ACTIVE", "INVALIDATED", "SUPERSEDED", "CONTRADICTED"] as const,
  confidenceRange: [CONFIDENCE_MIN, CONFIDENCE_MAX] as const,
  notes: [
    "Project Brain is a parallel local intelligence layer; not part of the published safety CLI pack.",
    "Consumers must treat INVALIDATED/SUPERSEDED claims as historical, not active truth.",
    "Evidence locators are references only; secret contents are never embedded.",
  ] as const,
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Fail-closed structural validation for persisted / loaded Brain payloads.
 * Does not invent missing semantics — rejects malformed data.
 */
export function assertBrainContract(payload: unknown): ProjectBrain {
  if (!isRecord(payload)) {
    throw new BrainContractError("brain payload must be an object");
  }
  for (const field of PROJECT_BRAIN_CONTRACT.requiredFields) {
    if (!(field in payload)) {
      throw new BrainContractError(`missing required field: ${field}`);
    }
  }
  const metadata = payload.metadata;
  if (!isRecord(metadata) || typeof metadata.schemaVersion !== "string") {
    throw new BrainContractError("metadata.schemaVersion required");
  }
  if (metadata.schemaVersion !== PROJECT_BRAIN_SCHEMA_VERSION) {
    throw new BrainContractError(
      `incompatible schemaVersion ${metadata.schemaVersion}; expected ${PROJECT_BRAIN_SCHEMA_VERSION}`,
    );
  }
  if (typeof metadata.brainId !== "string" || metadata.brainId.length === 0) {
    throw new BrainContractError("metadata.brainId required");
  }
  const snapshot = payload.snapshot;
  if (!isRecord(snapshot) || typeof snapshot.id !== "string") {
    throw new BrainContractError("snapshot.id required");
  }
  if (!Array.isArray(payload.claims) || !Array.isArray(payload.evidence)) {
    throw new BrainContractError("claims and evidence must be arrays");
  }
  for (const claim of payload.claims) {
    if (!isRecord(claim)) {
      throw new BrainContractError("malformed claim");
    }
    if (typeof claim.id !== "string" || typeof claim.status !== "string") {
      throw new BrainContractError("claim id/status required");
    }
    if (!CLAIM_STATUSES.has(claim.status)) {
      throw new BrainContractError(`unsupported claim status: ${String(claim.status)}`);
    }
    if (typeof claim.confidence !== "number" || claim.confidence < 0 || claim.confidence > 1) {
      throw new BrainContractError(`invalid claim confidence for ${claim.id}`);
    }
    if (!Array.isArray(claim.evidenceIds)) {
      throw new BrainContractError(`claim ${claim.id} missing evidenceIds`);
    }
    if (claim.status === "ACTIVE" && claim.evidenceIds.length === 0) {
      throw new BrainContractError(`ACTIVE claim ${claim.id} missing evidence`);
    }
  }
  for (const evidence of payload.evidence) {
    if (!isRecord(evidence)) {
      throw new BrainContractError("malformed evidence");
    }
    if (typeof evidence.id !== "string" || typeof evidence.locator !== "string") {
      throw new BrainContractError("evidence id/locator required");
    }
    if (evidence.epistemics !== "observed" && evidence.epistemics !== "inferred") {
      throw new BrainContractError(`invalid evidence epistemics on ${evidence.id}`);
    }
  }
  return payload as unknown as ProjectBrain;
}
