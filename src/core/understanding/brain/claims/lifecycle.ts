import type { BrainClaim, ClaimStatus } from "./types.js";

export function withClaimStatus(
  claim: BrainClaim,
  status: ClaimStatus,
  options: {
    invalidatedAt?: string;
    supersededBy?: string;
    contradictionIds?: readonly string[];
  } = {},
): BrainClaim {
  const next: BrainClaim = {
    ...claim,
    status,
    contradictionIds: options.contradictionIds
      ? [...options.contradictionIds]
      : [...claim.contradictionIds],
  };
  if (options.invalidatedAt !== undefined) {
    next.invalidatedAt = options.invalidatedAt;
  } else if (status === "ACTIVE") {
    delete (next as { invalidatedAt?: string }).invalidatedAt;
  }
  if (options.supersededBy !== undefined) {
    next.supersededBy = options.supersededBy;
  } else if (status === "ACTIVE") {
    delete (next as { supersededBy?: string }).supersededBy;
  }
  return next;
}

/**
 * Apply lifecycle transitions when moving from beforeClaims → afterClaims for a new snapshot.
 * Claims missing in after become INVALIDATED (kept in history with status).
 * Same subject+predicate with different object → prior SUPERSEDED, both retained.
 */
export function applyClaimLifecycle(options: {
  previous: readonly BrainClaim[];
  nextActive: readonly BrainClaim[];
  at: string;
}): BrainClaim[] {
  const { previous, nextActive, at } = options;
  const byKey = new Map<string, BrainClaim>();
  const keyOf = (c: BrainClaim) => `${c.subject}\0${c.predicate}\0${c.object}`;
  const subjectPred = (c: BrainClaim) => `${c.subject}\0${c.predicate}`;

  const nextByKey = new Map(nextActive.map((c) => [keyOf(c), c]));
  const nextBySubjectPred = new Map<string, BrainClaim[]>();
  for (const claim of nextActive) {
    const sp = subjectPred(claim);
    const list = nextBySubjectPred.get(sp) ?? [];
    list.push(claim);
    nextBySubjectPred.set(sp, list);
  }

  const result: BrainClaim[] = [];

  for (const claim of nextActive) {
    result.push({ ...claim, status: "ACTIVE" });
    byKey.set(keyOf(claim), claim);
  }

  for (const prior of previous) {
    if (prior.status === "INVALIDATED" && !nextByKey.has(keyOf(prior))) {
      result.push(prior);
      continue;
    }
    const k = keyOf(prior);
    if (nextByKey.has(k)) {
      continue;
    }
    const rivals = nextBySubjectPred.get(subjectPred(prior)) ?? [];
    if (rivals.length > 0) {
      const successor = rivals[0];
      result.push(
        withClaimStatus(
          prior,
          "SUPERSEDED",
          successor ? { invalidatedAt: at, supersededBy: successor.id } : { invalidatedAt: at },
        ),
      );
      continue;
    }
    result.push(withClaimStatus(prior, "INVALIDATED", { invalidatedAt: at }));
  }

  // Dedupe by id preferring ACTIVE > CONTRADICTED > SUPERSEDED > INVALIDATED
  const rank: Record<ClaimStatus, number> = {
    ACTIVE: 4,
    CONTRADICTED: 3,
    SUPERSEDED: 2,
    INVALIDATED: 1,
  };
  const byId = new Map<string, BrainClaim>();
  for (const claim of result) {
    const existing = byId.get(claim.id);
    if (!existing || rank[claim.status] >= rank[existing.status]) {
      byId.set(claim.id, claim);
    }
  }
  return [...byId.values()].sort(
    (a, b) =>
      rank[b.status] - rank[a.status] || b.confidence - a.confidence || a.id.localeCompare(b.id),
  );
}
