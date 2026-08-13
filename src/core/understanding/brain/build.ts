import { createHash } from "node:crypto";

import type { ProjectModel } from "../model/types.js";
import { discoverOwnership, type OwnershipDiscoveryResult } from "../ownership/index.js";
import { discoverRisks, type RiskDiscoveryResult } from "../risks/index.js";
import { createSnapshotIdentity } from "../snapshot/index.js";
import { buildClaim, type BrainClaim, type ClaimSource } from "./claims/index.js";
import { applyClaimLifecycle } from "./claims/lifecycle.js";
import { buildComponents } from "./components/index.js";
import { CONFIDENCE_CONTRACT, clampBrainConfidence } from "./confidence.js";
import { detectContradictions } from "./contradictions/index.js";
import { buildEvidence, redactEvidenceList, type BrainEvidence } from "./evidence/index.js";
import { PROJECT_BRAIN_LIMITATIONS, type ProjectBrain } from "./types.js";
import { PROJECT_BRAIN_SCHEMA_VERSION } from "./version.js";

function brainIdFor(projectName: string, contentHash: string): string {
  return `brain_${createHash("sha256").update(projectName).update(contentHash).digest("hex").slice(0, 16)}`;
}

function pathEvidence(
  evidence: BrainEvidence[],
  snapshotId: string,
  locator: string,
  source: string,
  epistemics: "observed" | "inferred" = "observed",
): string {
  const ev = buildEvidence({
    kind: "path",
    locator,
    source,
    snapshotId,
    epistemics,
    redaction: "path-only",
  });
  evidence.push(ev);
  return ev.id;
}

function claimsFromModel(options: {
  model: ProjectModel;
  ownership: OwnershipDiscoveryResult;
  risks: RiskDiscoveryResult;
  snapshotId: string;
  createdAt: string;
  evidence: BrainEvidence[];
}): BrainClaim[] {
  const { model, ownership, risks, snapshotId, createdAt, evidence } = options;
  const claims: BrainClaim[] = [];

  const add = (
    subject: string,
    predicate: string,
    object: string,
    source: ClaimSource,
    confidence: number,
    locs: readonly string[],
    epistemics: "observed" | "inferred" = "inferred",
  ): void => {
    const evidenceIds = locs.map((locator) =>
      pathEvidence(evidence, snapshotId, locator, source, epistemics),
    );
    claims.push(
      buildClaim({
        subject,
        predicate,
        object,
        snapshotId,
        evidenceIds,
        confidence: clampBrainConfidence(confidence),
        source,
        createdAt,
      }),
    );
  };

  for (const domain of model.domains) {
    add(domain.name, "is-domain", "true", "domain-discovery", domain.confidence, domain.evidence);
  }
  for (const entry of model.entrypoints) {
    add(
      entry.file,
      "is-entrypoint",
      entry.framework,
      "entrypoint-discovery",
      entry.confidence,
      entry.evidence,
      "observed",
    );
  }
  for (const dep of model.dependencies) {
    add(
      dep.from,
      "depends-on",
      `${dep.to}:${dep.type}`,
      "dependency-discovery",
      dep.confidence,
      dep.evidence,
      "observed",
    );
  }
  for (const rel of model.relationships) {
    add(
      rel.source,
      rel.relationship,
      rel.target,
      "relationship-discovery",
      rel.confidence,
      rel.evidence,
    );
  }
  for (const arch of model.architectures) {
    add(
      model.metadata.project.name,
      "architecture",
      arch.pattern,
      "architecture-inference",
      arch.confidence,
      arch.evidence,
    );
  }
  for (const own of ownership.ownerships) {
    add(
      own.path,
      "owned-by",
      own.owners.join(","),
      "ownership-discovery",
      own.confidence,
      own.evidence,
      "observed",
    );
  }
  for (const risk of risks.risks) {
    add(risk.target, "has-risk", risk.kind, "risk-discovery", risk.confidence, risk.evidence);
  }

  return claims;
}

export interface BuildProjectBrainOptions {
  cwd?: string;
  ownership?: OwnershipDiscoveryResult;
  risks?: RiskDiscoveryResult;
  previousClaims?: readonly BrainClaim[];
  generatedAt?: string;
}

export async function buildProjectBrain(
  model: ProjectModel,
  options: BuildProjectBrainOptions = {},
): Promise<ProjectBrain> {
  const createdAt = options.generatedAt ?? model.compilerMetadata.generatedAt;
  const snapshot = createSnapshotIdentity(
    model,
    options.generatedAt !== undefined ? { generatedAt: options.generatedAt } : {},
  );
  let ownership: OwnershipDiscoveryResult;
  if (options.ownership) {
    ownership = options.ownership;
  } else if (options.cwd !== undefined) {
    ownership = await discoverOwnership({ cwd: options.cwd });
  } else {
    ownership = {
      ownerships: [],
      timingMs: 0,
      filesConsidered: 0,
      unknowns: ["Ownership not discovered (no cwd provided); UNKNOWN"],
    };
  }
  const risks = options.risks ?? discoverRisks(model, ownership);

  let evidence: BrainEvidence[] = [];
  const freshClaims = claimsFromModel({
    model,
    ownership,
    risks,
    snapshotId: snapshot.id,
    createdAt,
    evidence,
  });

  const lifecycleClaims = applyClaimLifecycle({
    previous: options.previousClaims ?? [],
    nextActive: freshClaims,
    at: createdAt,
  });

  const { claims, contradictions } = detectContradictions(lifecycleClaims, snapshot.id);
  const componentBuild = buildComponents({
    model,
    ownership,
    risks,
    snapshotId: snapshot.id,
    evidence,
  });
  evidence = redactEvidenceList(componentBuild.evidence);

  const unknowns = [
    ...new Set([
      ...ownership.unknowns,
      ...risks.unknowns,
      ...model.architectures.flatMap((a) => a.unknowns),
      ...(model.domains.length === 0
        ? ["No domains discovered at current confidence thresholds"]
        : []),
    ]),
  ].sort((a, b) => a.localeCompare(b));

  // Ensure every ACTIVE claim has evidence
  for (const claim of claims) {
    if (claim.status === "ACTIVE" && claim.evidenceIds.length === 0) {
      throw new Error(`ACTIVE claim ${claim.id} missing evidence`);
    }
  }

  const brain: ProjectBrain = {
    metadata: {
      schemaVersion: PROJECT_BRAIN_SCHEMA_VERSION,
      brainId: brainIdFor(model.metadata.project.name, snapshot.contentHash),
      projectName: model.metadata.project.name,
      createdAt,
      updatedAt: createdAt,
    },
    snapshot,
    model,
    ownership,
    risks,
    components: componentBuild.components,
    claims,
    evidence,
    contradictions,
    unknowns,
    limitations: [...PROJECT_BRAIN_LIMITATIONS],
    confidenceContract: CONFIDENCE_CONTRACT,
  };

  return Object.freeze(deepFreezeBrain(brain));
}

function deepFreezeBrain(brain: ProjectBrain): ProjectBrain {
  Object.freeze(brain.metadata);
  Object.freeze(brain.snapshot);
  Object.freeze(brain.components);
  Object.freeze(brain.claims);
  Object.freeze(brain.evidence);
  Object.freeze(brain.contradictions);
  Object.freeze(brain.unknowns);
  Object.freeze(brain.limitations);
  Object.freeze(brain.confidenceContract);
  return Object.freeze(brain);
}
