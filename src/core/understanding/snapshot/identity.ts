import { createHash } from "node:crypto";

import { serializeProjectModel } from "../model/serializer.js";
import type { ProjectModel } from "../model/types.js";
import { UNDERSTANDING_COMPILER_VERSION } from "../model/version.js";

/**
 * Identity of one deterministic understanding snapshot.
 * contentHash ignores timestamps so structural equality is detectable across rebuild clocks.
 */
export interface SnapshotIdentity {
  id: string;
  contentHash: string;
  compilerVersion: string;
  schemaVersion: string;
  projectName: string;
  generatedAt: string;
  domainCount: number;
  entrypointCount: number;
  dependencyCount: number;
  relationshipCount: number;
  architectureCount: number;
}

function structuralPayload(model: ProjectModel): unknown {
  return {
    schemaVersion: model.metadata.schemaVersion,
    compilerVersion: model.compilerMetadata.compilerVersion,
    projectName: model.metadata.project.name,
    domains: model.domains.map((d) => ({
      name: d.name,
      paths: d.paths,
      confidence: d.confidence,
      evidence: d.evidence,
    })),
    entrypoints: model.entrypoints.map((e) => ({
      framework: e.framework,
      file: e.file,
      confidence: e.confidence,
      evidence: e.evidence,
    })),
    dependencies: model.dependencies.map((d) => ({
      from: d.from,
      to: d.to,
      type: d.type,
      confidence: d.confidence,
      evidence: d.evidence,
    })),
    relationships: model.relationships.map((r) => ({
      source: r.source,
      target: r.target,
      relationship: r.relationship,
      strength: r.strength,
      bidirectional: r.bidirectional,
      confidence: r.confidence,
      evidence: r.evidence,
    })),
    architectures: model.architectures.map((a) => ({
      pattern: a.pattern,
      matchedRules: a.matchedRules,
      conflictingEvidence: a.conflictingEvidence,
      unknowns: a.unknowns,
      confidence: a.confidence,
      evidence: a.evidence,
    })),
  };
}

export function computeContentHash(model: ProjectModel): string {
  const json = JSON.stringify(structuralPayload(model));
  return createHash("sha256").update(json).digest("hex").slice(0, 32);
}

export function createSnapshotIdentity(
  model: ProjectModel,
  options: { generatedAt?: string } = {},
): SnapshotIdentity {
  const contentHash = computeContentHash(model);
  const generatedAt = options.generatedAt ?? model.compilerMetadata.generatedAt;
  const id = createHash("sha256")
    .update(contentHash)
    .update("\0")
    .update(generatedAt)
    .update("\0")
    .update(UNDERSTANDING_COMPILER_VERSION)
    .digest("hex")
    .slice(0, 24);

  return {
    id: `snap_${id}`,
    contentHash,
    compilerVersion: model.compilerMetadata.compilerVersion,
    schemaVersion: model.metadata.schemaVersion,
    projectName: model.metadata.project.name,
    generatedAt,
    domainCount: model.domains.length,
    entrypointCount: model.entrypoints.length,
    dependencyCount: model.dependencies.length,
    relationshipCount: model.relationships.length,
    architectureCount: model.architectures.length,
  };
}

/** Convenience hash of the full serialized model (includes timestamps). */
export function hashSerializedModel(model: ProjectModel): string {
  return createHash("sha256").update(serializeProjectModel(model)).digest("hex").slice(0, 32);
}
