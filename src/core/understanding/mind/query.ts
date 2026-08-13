import { ownersForPath } from "../ownership/index.js";
import type { OwnershipMatch } from "../ownership/types.js";
import type { RiskMatch } from "../risks/types.js";
import type { ProjectClaim, ProjectMind } from "./types.js";

export interface MindOwnershipResult {
  ownerships: readonly OwnershipMatch[];
  count: number;
  unknowns: readonly string[];
}

export interface MindRiskResult {
  risks: readonly RiskMatch[];
  count: number;
  unknowns: readonly string[];
}

export interface MindClaimResult {
  claim: ProjectClaim | null;
  found: boolean;
}

export function listMindOwnership(mind: ProjectMind): MindOwnershipResult {
  return {
    ownerships: mind.ownership.ownerships,
    count: mind.ownership.ownerships.length,
    unknowns: mind.ownership.unknowns,
  };
}

export function listMindRisks(mind: ProjectMind): MindRiskResult {
  return {
    risks: mind.risks.risks,
    count: mind.risks.risks.length,
    unknowns: mind.risks.unknowns,
  };
}

export function findMindOwner(mind: ProjectMind, filePath: string): OwnershipMatch | null {
  return ownersForPath(filePath, mind.ownership.ownerships);
}

export function findMindRisks(mind: ProjectMind, target: string): RiskMatch[] {
  const needle = target.toLowerCase();
  return mind.risks.risks.filter(
    (risk) =>
      risk.target.toLowerCase().includes(needle) || risk.kind.toLowerCase().includes(needle),
  );
}

export function findMindClaim(mind: ProjectMind, claimId: string): MindClaimResult {
  const claim = mind.claims.find((item) => item.id === claimId) ?? null;
  return { claim, found: claim !== null };
}

export function mindSummary(mind: ProjectMind): {
  projectName: string;
  snapshotId: string;
  contentHash: string;
  claimCount: number;
  ownershipCount: number;
  riskCount: number;
  unknownCount: number;
  topDomains: readonly string[];
  topRisks: readonly string[];
} {
  return {
    projectName: mind.model.metadata.project.name,
    snapshotId: mind.snapshot.id,
    contentHash: mind.snapshot.contentHash,
    claimCount: mind.claims.length,
    ownershipCount: mind.ownership.ownerships.length,
    riskCount: mind.risks.risks.length,
    unknownCount: mind.unknowns.length,
    topDomains: mind.model.summary.topDomains,
    topRisks: mind.risks.risks.slice(0, 5).map((risk) => `${risk.kind}:${risk.target}`),
  };
}
