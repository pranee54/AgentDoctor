import type { BrainClaim } from "./claims/types.js";
import type { BrainContradiction } from "./contradictions/types.js";
import type { ProjectBrain } from "./types.js";
import { DELTA_SCHEMA_VERSION, type DeltaSchemaVersion } from "./version.js";

export interface BrainDelta {
  schemaVersion: DeltaSchemaVersion;
  beforeSnapshotId: string;
  afterSnapshotId: string;
  addedClaimIds: readonly string[];
  removedClaimIds: readonly string[];
  changedClaimIds: readonly string[];
  invalidatedClaimIds: readonly string[];
  supersededClaimIds: readonly string[];
  contradictedClaimIds: readonly string[];
  newContradictionIds: readonly string[];
  resolvedContradictionIds: readonly string[];
  addedComponentIds: readonly string[];
  removedComponentIds: readonly string[];
  dependencyChanges: readonly string[];
  ownershipChanges: readonly string[];
  riskChanges: readonly string[];
  summary: readonly string[];
  createdAt: string;
}

function claimFinger(c: BrainClaim): string {
  return `${c.subject}|${c.predicate}|${c.object}|${c.status}|${c.confidence}`;
}

export function buildBrainDelta(before: ProjectBrain, after: ProjectBrain): BrainDelta {
  const beforeClaims = new Map(before.claims.map((c) => [c.id, c]));
  const afterClaims = new Map(after.claims.map((c) => [c.id, c]));

  const addedClaimIds: string[] = [];
  const removedClaimIds: string[] = [];
  const changedClaimIds: string[] = [];
  const invalidatedClaimIds: string[] = [];
  const supersededClaimIds: string[] = [];
  const contradictedClaimIds: string[] = [];

  for (const [id, claim] of afterClaims) {
    const prev = beforeClaims.get(id);
    if (!prev) {
      addedClaimIds.push(id);
      continue;
    }
    if (claimFinger(prev) !== claimFinger(claim)) {
      changedClaimIds.push(id);
    }
    if (claim.status === "INVALIDATED" && prev.status !== "INVALIDATED") {
      invalidatedClaimIds.push(id);
    }
    if (claim.status === "SUPERSEDED" && prev.status !== "SUPERSEDED") {
      supersededClaimIds.push(id);
    }
    if (claim.status === "CONTRADICTED" && prev.status !== "CONTRADICTED") {
      contradictedClaimIds.push(id);
    }
  }
  for (const id of beforeClaims.keys()) {
    if (!afterClaims.has(id)) {
      removedClaimIds.push(id);
    }
  }

  const beforeContra = new Set(before.contradictions.map((c: BrainContradiction) => c.id));
  const afterContra = new Set(after.contradictions.map((c) => c.id));
  const newContradictionIds = [...afterContra].filter((id) => !beforeContra.has(id)).sort();
  const resolvedContradictionIds = [...beforeContra].filter((id) => !afterContra.has(id)).sort();

  const beforeComps = new Set(before.components.map((c) => c.id));
  const afterComps = new Set(after.components.map((c) => c.id));
  const addedComponentIds = [...afterComps].filter((id) => !beforeComps.has(id)).sort();
  const removedComponentIds = [...beforeComps].filter((id) => !afterComps.has(id)).sort();

  const depKey = (b: ProjectBrain) =>
    b.model.dependencies.map((d) => `${d.from}->${d.to}:${d.type}`).sort();
  const beforeDeps = new Set(depKey(before));
  const afterDeps = new Set(depKey(after));
  const dependencyChanges = [
    ...[...afterDeps].filter((k) => !beforeDeps.has(k)).map((k) => `+${k}`),
    ...[...beforeDeps].filter((k) => !afterDeps.has(k)).map((k) => `-${k}`),
  ].sort();

  const ownKey = (b: ProjectBrain) =>
    b.ownership.ownerships.map((o) => `${o.path}:${o.owners.join(",")}`).sort();
  const beforeOwn = new Set(ownKey(before));
  const afterOwn = new Set(ownKey(after));
  const ownershipChanges = [
    ...[...afterOwn].filter((k) => !beforeOwn.has(k)).map((k) => `+${k}`),
    ...[...beforeOwn].filter((k) => !afterOwn.has(k)).map((k) => `-${k}`),
  ].sort();

  const riskKey = (b: ProjectBrain) => b.risks.risks.map((r) => `${r.kind}:${r.target}`).sort();
  const beforeRisk = new Set(riskKey(before));
  const afterRisk = new Set(riskKey(after));
  const riskChanges = [
    ...[...afterRisk].filter((k) => !beforeRisk.has(k)).map((k) => `+${k}`),
    ...[...beforeRisk].filter((k) => !afterRisk.has(k)).map((k) => `-${k}`),
  ].sort();

  const summary: string[] = [];
  if (addedClaimIds.length || invalidatedClaimIds.length) {
    summary.push(`Claims +${addedClaimIds.length} / invalidated ${invalidatedClaimIds.length}`);
  }
  if (dependencyChanges.length) {
    summary.push(`Dependency changes: ${dependencyChanges.length}`);
  }
  if (ownershipChanges.length) {
    summary.push(`Ownership changes: ${ownershipChanges.length}`);
  }
  if (riskChanges.length) {
    summary.push(`Risk changes: ${riskChanges.length}`);
  }
  if (newContradictionIds.length || resolvedContradictionIds.length) {
    summary.push(
      `Contradictions +${newContradictionIds.length}/-${resolvedContradictionIds.length}`,
    );
  }
  if (summary.length === 0) {
    summary.push("No structural brain changes");
  }

  return {
    schemaVersion: DELTA_SCHEMA_VERSION,
    beforeSnapshotId: before.snapshot.id,
    afterSnapshotId: after.snapshot.id,
    addedClaimIds: addedClaimIds.sort(),
    removedClaimIds: removedClaimIds.sort(),
    changedClaimIds: changedClaimIds.sort(),
    invalidatedClaimIds: invalidatedClaimIds.sort(),
    supersededClaimIds: supersededClaimIds.sort(),
    contradictedClaimIds: contradictedClaimIds.sort(),
    newContradictionIds,
    resolvedContradictionIds,
    addedComponentIds,
    removedComponentIds,
    dependencyChanges,
    ownershipChanges,
    riskChanges,
    summary,
    createdAt: after.metadata.updatedAt,
  };
}

export function serializeBrainDelta(delta: BrainDelta): string {
  return `${JSON.stringify(delta, null, 2)}\n`;
}

export function parseBrainDelta(json: string): BrainDelta {
  const parsed = JSON.parse(json) as BrainDelta;
  if (parsed.schemaVersion !== DELTA_SCHEMA_VERSION) {
    throw new Error(`incompatible delta schema ${String(parsed.schemaVersion)}`);
  }
  return parsed;
}
