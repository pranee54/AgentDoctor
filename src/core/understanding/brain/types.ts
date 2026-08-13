import type { ProjectModel } from "../model/types.js";
import type { OwnershipDiscoveryResult } from "../ownership/types.js";
import type { RiskDiscoveryResult } from "../risks/types.js";
import type { SnapshotIdentity } from "../snapshot/index.js";
import type { BrainClaim } from "./claims/types.js";
import type { BrainComponent } from "./components/types.js";
import type { ConfidenceMetadata } from "./confidence.js";
import type { BrainContradiction } from "./contradictions/types.js";
import type { BrainEvidence } from "./evidence/types.js";
import type { ProjectBrainSchemaVersion } from "./version.js";

export interface ProjectBrainMetadata {
  schemaVersion: ProjectBrainSchemaVersion;
  brainId: string;
  projectName: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectBrain {
  metadata: ProjectBrainMetadata;
  snapshot: SnapshotIdentity;
  model: ProjectModel;
  ownership: OwnershipDiscoveryResult;
  risks: RiskDiscoveryResult;
  components: readonly BrainComponent[];
  claims: readonly BrainClaim[];
  evidence: readonly BrainEvidence[];
  contradictions: readonly BrainContradiction[];
  unknowns: readonly string[];
  limitations: readonly string[];
  confidenceContract: ConfidenceMetadata;
}

export const PROJECT_BRAIN_LIMITATIONS = [
  "Project Brain is deterministic and local-only",
  "Domains are path-inferred unless stronger evidence exists",
  "Ownership requires explicit CODEOWNERS / MAINTAINERS / package.json evidence",
  "Risks describe change-danger, not vulnerability scanning",
  "Business rules and design intent remain unknown",
  "Evidence never includes secret file contents",
] as const;
