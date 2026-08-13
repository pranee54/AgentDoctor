import type { BrainClaim } from "../claims/types.js";
import { withClaimStatus } from "../claims/lifecycle.js";
import { createContradictionId, type BrainContradiction } from "./types.js";

/**
 * Detect contradictory ACTIVE claims sharing subject+predicate with different objects.
 * Marks those claims CONTRADICTED and returns contradiction records.
 */
export function detectContradictions(
  claims: readonly BrainClaim[],
  snapshotId: string,
): { claims: BrainClaim[]; contradictions: BrainContradiction[] } {
  const groups = new Map<string, BrainClaim[]>();
  for (const claim of claims) {
    if (claim.status !== "ACTIVE" && claim.status !== "CONTRADICTED") {
      continue;
    }
    const key = `${claim.subject}\0${claim.predicate}`;
    const list = groups.get(key) ?? [];
    list.push(claim);
    groups.set(key, list);
  }

  const contradictions: BrainContradiction[] = [];
  const contradictedIds = new Map<string, string[]>();

  for (const [, group] of groups) {
    const uniqueObjects = [...new Set(group.map((c) => c.object))];
    if (uniqueObjects.length < 2) {
      continue;
    }
    const subject = group[0]?.subject ?? "";
    const predicate = group[0]?.predicate ?? "";
    const id = createContradictionId(subject, predicate, uniqueObjects);
    const claimIds = group.map((c) => c.id);
    const evidenceIds = [...new Set(group.flatMap((c) => c.evidenceIds))];
    contradictions.push({
      id,
      snapshotId,
      claimIds,
      subject,
      predicate,
      values: uniqueObjects.sort((a, b) => a.localeCompare(b)),
      evidenceIds,
      confidence: Math.min(...group.map((c) => c.confidence)),
      rationale: `Multiple ACTIVE values for ${predicate} on ${subject}`,
    });
    for (const claim of group) {
      const list = contradictedIds.get(claim.id) ?? [];
      list.push(id);
      contradictedIds.set(claim.id, list);
    }
  }

  const nextClaims = claims.map((claim) => {
    const contra = contradictedIds.get(claim.id);
    if (!contra) {
      return claim;
    }
    return withClaimStatus(claim, "CONTRADICTED", { contradictionIds: contra });
  });

  contradictions.sort((a, b) => a.id.localeCompare(b.id));
  return { claims: nextClaims, contradictions };
}

export type { BrainContradiction } from "./types.js";
export { createContradictionId } from "./types.js";
