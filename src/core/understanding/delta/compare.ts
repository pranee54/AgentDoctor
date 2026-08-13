import type { ProjectModel } from "../model/types.js";
import { createSnapshotIdentity, type SnapshotIdentity } from "../snapshot/index.js";

export interface SetDelta<T> {
  added: readonly T[];
  removed: readonly T[];
  unchanged: readonly T[];
}

export interface UnderstandingDelta {
  before: SnapshotIdentity;
  after: SnapshotIdentity;
  structuralEqual: boolean;
  domains: SetDelta<string>;
  entrypoints: SetDelta<string>;
  dependencies: SetDelta<string>;
  relationships: SetDelta<string>;
  architectures: SetDelta<string>;
  /** Model object ids present before but absent after. */
  invalidatedIds: readonly string[];
  /** Human-readable summary lines. */
  summary: readonly string[];
}

function setDelta(before: readonly string[], after: readonly string[]): SetDelta<string> {
  const beforeSet = new Set(before);
  const afterSet = new Set(after);
  const added = after.filter((item) => !beforeSet.has(item)).sort((a, b) => a.localeCompare(b));
  const removed = before.filter((item) => !afterSet.has(item)).sort((a, b) => a.localeCompare(b));
  const unchanged = before.filter((item) => afterSet.has(item)).sort((a, b) => a.localeCompare(b));
  return { added, removed, unchanged };
}

function collectIds(model: ProjectModel): string[] {
  return [
    model.metadata.id,
    model.metadata.project.id,
    ...model.domains.map((d) => d.id),
    ...model.entrypoints.map((e) => e.id),
    ...model.dependencies.map((d) => d.id),
    ...model.relationships.map((r) => r.id),
    ...model.architectures.map((a) => a.id),
  ];
}

/**
 * Compare two ProjectModel snapshots into an understanding delta.
 * Does not re-scan the repository.
 */
export function compareProjectModels(
  before: ProjectModel,
  after: ProjectModel,
): UnderstandingDelta {
  const beforeSnap = createSnapshotIdentity(before);
  const afterSnap = createSnapshotIdentity(after);
  const domains = setDelta(
    before.domains.map((d) => d.name),
    after.domains.map((d) => d.name),
  );
  const entrypoints = setDelta(
    before.entrypoints.map((e) => `${e.framework}:${e.file}`),
    after.entrypoints.map((e) => `${e.framework}:${e.file}`),
  );
  const dependencies = setDelta(
    before.dependencies.map((d) => `${d.from}->${d.to}:${d.type}`),
    after.dependencies.map((d) => `${d.from}->${d.to}:${d.type}`),
  );
  const relationships = setDelta(
    before.relationships.map((r) => `${r.source}->${r.target}:${r.relationship}`),
    after.relationships.map((r) => `${r.source}->${r.target}:${r.relationship}`),
  );
  const architectures = setDelta(
    before.architectures.map((a) => a.pattern),
    after.architectures.map((a) => a.pattern),
  );

  const afterIds = new Set(collectIds(after));
  const invalidatedIds = collectIds(before)
    .filter((id) => !afterIds.has(id))
    .sort((a, b) => a.localeCompare(b));

  const structuralEqual = beforeSnap.contentHash === afterSnap.contentHash;
  const summary: string[] = [];
  if (structuralEqual) {
    summary.push("No structural understanding changes");
  } else {
    if (domains.added.length || domains.removed.length) {
      summary.push(`Domains +${domains.added.length}/-${domains.removed.length}`);
    }
    if (entrypoints.added.length || entrypoints.removed.length) {
      summary.push(`Entrypoints +${entrypoints.added.length}/-${entrypoints.removed.length}`);
    }
    if (dependencies.added.length || dependencies.removed.length) {
      summary.push(`Dependencies +${dependencies.added.length}/-${dependencies.removed.length}`);
    }
    if (relationships.added.length || relationships.removed.length) {
      summary.push(`Relationships +${relationships.added.length}/-${relationships.removed.length}`);
    }
    if (architectures.added.length || architectures.removed.length) {
      summary.push(`Architectures +${architectures.added.length}/-${architectures.removed.length}`);
    }
    if (invalidatedIds.length > 0) {
      summary.push(`Invalidated claims: ${invalidatedIds.length}`);
    }
  }

  return {
    before: beforeSnap,
    after: afterSnap,
    structuralEqual,
    domains,
    entrypoints,
    dependencies,
    relationships,
    architectures,
    invalidatedIds,
    summary,
  };
}
