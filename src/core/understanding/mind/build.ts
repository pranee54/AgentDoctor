import type { ProjectModel } from "../model/types.js";
import { discoverOwnership, type OwnershipDiscoveryResult } from "../ownership/index.js";
import { discoverRisks, type RiskDiscoveryResult } from "../risks/index.js";
import { createSnapshotIdentity } from "../snapshot/index.js";
import { PROJECT_MIND_LIMITATIONS, type ProjectClaim, type ProjectMind } from "./types.js";

function collectUnknowns(
  ownership: OwnershipDiscoveryResult,
  risks: RiskDiscoveryResult,
  model: ProjectModel,
): string[] {
  const unknowns = new Set<string>();
  for (const item of ownership.unknowns) {
    unknowns.add(item);
  }
  for (const item of risks.unknowns) {
    unknowns.add(item);
  }
  for (const arch of model.architectures) {
    for (const unknown of arch.unknowns) {
      unknowns.add(unknown);
    }
  }
  if (model.domains.length === 0) {
    unknowns.add("No domains discovered at current confidence thresholds");
  }
  return [...unknowns].sort((a, b) => a.localeCompare(b));
}

export function extractClaims(
  model: ProjectModel,
  ownership: OwnershipDiscoveryResult,
  risks: RiskDiscoveryResult,
  snapshotId: string,
): ProjectClaim[] {
  const claims: ProjectClaim[] = [];

  for (const domain of model.domains) {
    claims.push({
      id: domain.id,
      kind: "domain",
      subject: domain.name,
      confidence: domain.confidence,
      evidence: domain.evidence,
      snapshotId,
    });
  }
  for (const entry of model.entrypoints) {
    claims.push({
      id: entry.id,
      kind: "entrypoint",
      subject: entry.file,
      confidence: entry.confidence,
      evidence: entry.evidence,
      snapshotId,
    });
  }
  for (const dep of model.dependencies) {
    claims.push({
      id: dep.id,
      kind: "dependency",
      subject: `${dep.from}->${dep.to}`,
      confidence: dep.confidence,
      evidence: dep.evidence,
      snapshotId,
    });
  }
  for (const rel of model.relationships) {
    claims.push({
      id: rel.id,
      kind: "relationship",
      subject: `${rel.source}->${rel.target}:${rel.relationship}`,
      confidence: rel.confidence,
      evidence: rel.evidence,
      snapshotId,
    });
  }
  for (const arch of model.architectures) {
    claims.push({
      id: arch.id,
      kind: "architecture",
      subject: arch.pattern,
      confidence: arch.confidence,
      evidence: arch.evidence,
      snapshotId,
    });
  }
  ownership.ownerships.forEach((ownershipMatch, index) => {
    claims.push({
      id: `ownership_${index}_${ownershipMatch.path}`,
      kind: "ownership",
      subject: ownershipMatch.path,
      confidence: ownershipMatch.confidence,
      evidence: ownershipMatch.evidence,
      snapshotId,
    });
  });
  risks.risks.forEach((risk, index) => {
    claims.push({
      id: `risk_${index}_${risk.kind}_${risk.target}`,
      kind: "risk",
      subject: risk.target,
      confidence: risk.confidence,
      evidence: risk.evidence,
      snapshotId,
    });
  });

  return claims.sort(
    (a, b) =>
      b.confidence - a.confidence ||
      a.kind.localeCompare(b.kind) ||
      a.subject.localeCompare(b.subject),
  );
}

export interface BuildProjectMindOptions {
  cwd?: string;
  ownership?: OwnershipDiscoveryResult;
  risks?: RiskDiscoveryResult;
}

/**
 * Build a Project Mind from a ProjectModel (+ ownership/risk discovery).
 * Never invents facts; preserves unknowns.
 */
export async function buildProjectMind(
  model: ProjectModel,
  options: BuildProjectMindOptions = {},
): Promise<ProjectMind> {
  const snapshot = createSnapshotIdentity(model);
  const ownership =
    options.ownership ??
    (await discoverOwnership(options.cwd !== undefined ? { cwd: options.cwd } : {}));
  const risks = options.risks ?? discoverRisks(model, ownership);
  const claims = extractClaims(model, ownership, risks, snapshot.id);
  const unknowns = collectUnknowns(ownership, risks, model);

  return Object.freeze({
    snapshot,
    model,
    ownership,
    risks,
    claims: Object.freeze(claims),
    unknowns: Object.freeze(unknowns),
    limitations: Object.freeze([...PROJECT_MIND_LIMITATIONS]),
  });
}

export function buildProjectMindSync(
  model: ProjectModel,
  ownership: OwnershipDiscoveryResult,
  risks?: RiskDiscoveryResult,
): ProjectMind {
  const snapshot = createSnapshotIdentity(model);
  const resolvedRisks = risks ?? discoverRisks(model, ownership);
  const claims = extractClaims(model, ownership, resolvedRisks, snapshot.id);
  const unknowns = collectUnknowns(ownership, resolvedRisks, model);
  return Object.freeze({
    snapshot,
    model,
    ownership,
    risks: resolvedRisks,
    claims: Object.freeze(claims),
    unknowns: Object.freeze(unknowns),
    limitations: Object.freeze([...PROJECT_MIND_LIMITATIONS]),
  });
}
