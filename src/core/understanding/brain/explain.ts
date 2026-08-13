import type { BrainClaim } from "./claims/types.js";
import type { BrainEvidence } from "./evidence/types.js";
import type { ProjectBrain } from "./types.js";

export interface ClaimExplanation {
  claim: BrainClaim;
  status: BrainClaim["status"];
  confidence: number;
  supportingEvidence: readonly BrainEvidence[];
  contradictions: readonly ProjectBrain["contradictions"][number][];
  invalidationState: {
    invalidated: boolean;
    invalidatedAt?: string;
    supersededBy?: string;
  };
  unknowns: readonly string[];
}

export function explainClaim(brain: ProjectBrain, claimId: string): ClaimExplanation | null {
  const claim = brain.claims.find((c) => c.id === claimId);
  if (!claim) {
    return null;
  }
  const supportingEvidence = brain.evidence.filter((e) => claim.evidenceIds.includes(e.id));
  const contradictions = brain.contradictions.filter((c) => c.claimIds.includes(claim.id));
  const unknowns: string[] = [];
  if (supportingEvidence.length === 0) {
    unknowns.push("No typed evidence records resolved for claim evidenceIds");
  }
  if (claim.status === "CONTRADICTED") {
    unknowns.push("Claim is contradicted by one or more sibling values");
  }

  const invalidationState: ClaimExplanation["invalidationState"] = {
    invalidated: claim.status === "INVALIDATED",
  };
  if (claim.invalidatedAt !== undefined) {
    invalidationState.invalidatedAt = claim.invalidatedAt;
  }
  if (claim.supersededBy !== undefined) {
    invalidationState.supersededBy = claim.supersededBy;
  }

  return {
    claim,
    status: claim.status,
    confidence: claim.confidence,
    supportingEvidence,
    contradictions,
    invalidationState,
    unknowns,
  };
}
