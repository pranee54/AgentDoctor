import type { ProjectModel } from "../model/types.js";
import type { OwnershipDiscoveryResult } from "../ownership/types.js";
import type { RiskDiscoveryResult } from "../risks/types.js";
import type { SnapshotIdentity } from "../snapshot/index.js";

export type ClaimKind =
  "domain" | "entrypoint" | "dependency" | "relationship" | "architecture" | "ownership" | "risk";

export interface ProjectClaim {
  id: string;
  kind: ClaimKind;
  subject: string;
  confidence: number;
  evidence: readonly string[];
  /** Snapshot that produced this claim. */
  snapshotId: string;
}

export interface ProjectMind {
  snapshot: SnapshotIdentity;
  model: ProjectModel;
  ownership: OwnershipDiscoveryResult;
  risks: RiskDiscoveryResult;
  claims: readonly ProjectClaim[];
  unknowns: readonly string[];
  limitations: readonly string[];
}

export const PROJECT_MIND_LIMITATIONS = [
  "Project Mind is derived from deterministic compiler passes only",
  "Ownership requires explicit CODEOWNERS / MAINTAINERS / package.json evidence",
  "Risks describe change-danger, not vulnerability scanning",
  "Business rules and design intent remain unknown unless evidenced",
  "AI consumers must not invent repository facts beyond this representation",
] as const;
