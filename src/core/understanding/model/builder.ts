import type {
  CompilerMetadata,
  CompilerPassId,
  ProjectArchitecture,
  ProjectDependency,
  ProjectDomain,
  ProjectEntrypoint,
  ProjectIdentity,
  ProjectMetadata,
  ProjectModel,
  ProjectModelBuilderInput,
  ProjectRelationship,
  ProjectStatistics,
  ProjectSummary,
} from "./types.js";
import { averageConfidence, clampModelConfidence, deepFreeze, stableModelId } from "./ids.js";
import { COMPILER_PASSES } from "./schema.js";
import { PROJECT_MODEL_SCHEMA_VERSION, UNDERSTANDING_COMPILER_VERSION } from "./version.js";
import { validateProjectModel } from "./validator.js";

function assertBuilderInput(input: ProjectModelBuilderInput): void {
  if (
    !input.domains ||
    !input.entrypoints ||
    !input.dependencies ||
    !input.relationships ||
    !input.architectures
  ) {
    throw new Error(
      "ProjectModelBuilder requires domains, entrypoints, dependencies, relationships, and architectures",
    );
  }
}

function countEvidence(lists: readonly (readonly string[])[]): number {
  let total = 0;
  for (const list of lists) {
    total += list.length;
  }
  return total;
}

function buildSummary(options: {
  domains: readonly ProjectDomain[];
  entrypoints: readonly ProjectEntrypoint[];
  dependencies: readonly ProjectDependency[];
  relationships: readonly ProjectRelationship[];
  architectures: readonly ProjectArchitecture[];
  input: ProjectModelBuilderInput;
}): ProjectSummary {
  const { domains, entrypoints, dependencies, relationships, architectures, input } = options;
  const confidences = [
    ...domains.map((d) => d.confidence),
    ...entrypoints.map((e) => e.confidence),
    ...dependencies.map((d) => d.confidence),
    ...relationships.map((r) => r.confidence),
    ...architectures.map((a) => a.confidence),
  ];

  const statistics: ProjectStatistics = {
    domainCount: domains.length,
    entrypointCount: entrypoints.length,
    dependencyCount: dependencies.length,
    relationshipCount: relationships.length,
    architectureCount: architectures.length,
    evidenceCount: countEvidence([
      ...domains.map((d) => d.evidence),
      ...entrypoints.map((e) => e.evidence),
      ...dependencies.map((d) => d.evidence),
      ...relationships.map((r) => r.evidence),
      ...architectures.map((a) => a.evidence),
    ]),
    averageConfidence: averageConfidence(confidences),
    passTimingMs: {
      domains: input.domains.timingMs,
      entrypoints: input.entrypoints.timingMs,
      dependencies: input.dependencies.timingMs,
      relationships: input.relationships.timingMs,
      architectures: input.architectures.timingMs,
    },
  };

  return {
    topDomains: domains
      .slice()
      .sort((a, b) => b.confidence - a.confidence || a.name.localeCompare(b.name))
      .slice(0, 5)
      .map((d) => d.name),
    topArchitectures: architectures
      .slice()
      .sort((a, b) => b.confidence - a.confidence || a.pattern.localeCompare(b.pattern))
      .slice(0, 5)
      .map((a) => a.pattern),
    frameworks: [...new Set(entrypoints.map((e) => e.framework))].sort((a, b) =>
      a.localeCompare(b),
    ),
    statistics,
  };
}

/**
 * Builds a canonical immutable ProjectModel from compiler pass outputs.
 */
export class ProjectModelBuilder {
  build(input: ProjectModelBuilderInput): ProjectModel {
    assertBuilderInput(input);
    const generatedAt = input.generatedAt ?? new Date().toISOString();
    const projectName = input.projectName?.trim() || "project";

    const domains: ProjectDomain[] = input.domains.domains
      .map((domain) => ({
        id: stableModelId("domain-discovery", "domain", domain.name),
        name: domain.name,
        paths: [...domain.evidence].sort((a, b) => a.localeCompare(b)),
        evidence: [...domain.evidence].sort((a, b) => a.localeCompare(b)),
        confidence: clampModelConfidence(domain.confidence),
        sourcePass: "domain-discovery" as const,
        timestamp: generatedAt,
      }))
      .sort((a, b) => b.confidence - a.confidence || a.name.localeCompare(b.name));

    const entrypoints: ProjectEntrypoint[] = input.entrypoints.entrypoints
      .map((entry) => ({
        id: stableModelId("entrypoint-discovery", "entrypoint", `${entry.framework}:${entry.file}`),
        framework: entry.framework,
        file: entry.file,
        evidence: [...entry.evidence].sort((a, b) => a.localeCompare(b)),
        confidence: clampModelConfidence(entry.confidence),
        sourcePass: "entrypoint-discovery" as const,
        timestamp: generatedAt,
      }))
      .sort(
        (a, b) =>
          b.confidence - a.confidence ||
          a.framework.localeCompare(b.framework) ||
          a.file.localeCompare(b.file),
      );

    const dependencies: ProjectDependency[] = input.dependencies.dependencies
      .map((dep) => ({
        id: stableModelId(
          "dependency-discovery",
          "dependency",
          `${dep.from}->${dep.to}:${dep.type}`,
        ),
        from: dep.from,
        to: dep.to,
        type: dep.type,
        evidence: [...dep.evidence].sort((a, b) => a.localeCompare(b)),
        confidence: clampModelConfidence(dep.confidence),
        sourcePass: "dependency-discovery" as const,
        timestamp: generatedAt,
      }))
      .sort(
        (a, b) =>
          b.confidence - a.confidence ||
          a.from.localeCompare(b.from) ||
          a.to.localeCompare(b.to) ||
          a.type.localeCompare(b.type),
      );

    const relationships: ProjectRelationship[] = input.relationships.relationships
      .map((rel) => ({
        id: stableModelId(
          "relationship-discovery",
          "relationship",
          `${rel.source}->${rel.target}:${rel.relationship}`,
        ),
        source: rel.source,
        target: rel.target,
        relationship: rel.relationship,
        strength: rel.strength,
        bidirectional: Boolean(rel.bidirectional),
        evidence: [...rel.evidence].sort((a, b) => a.localeCompare(b)),
        confidence: clampModelConfidence(rel.confidence),
        sourcePass: "relationship-discovery" as const,
        timestamp: generatedAt,
      }))
      .sort(
        (a, b) =>
          b.confidence - a.confidence ||
          a.relationship.localeCompare(b.relationship) ||
          a.source.localeCompare(b.source) ||
          a.target.localeCompare(b.target),
      );

    const architectures: ProjectArchitecture[] = input.architectures.architectures
      .map((arch) => ({
        id: stableModelId("architecture-inference", "architecture", arch.pattern),
        pattern: arch.pattern,
        matchedRules: [...arch.matchedRules].sort((a, b) => a.localeCompare(b)),
        conflictingEvidence: [...arch.conflictingEvidence].sort((a, b) => a.localeCompare(b)),
        unknowns: [...arch.unknowns].sort((a, b) => a.localeCompare(b)),
        evidence: [...arch.evidence].sort((a, b) => a.localeCompare(b)),
        confidence: clampModelConfidence(arch.confidence),
        sourcePass: "architecture-inference" as const,
        timestamp: generatedAt,
      }))
      .sort((a, b) => b.confidence - a.confidence || a.pattern.localeCompare(b.pattern));

    const projectEvidence = [
      `domains:${domains.length}`,
      `entrypoints:${entrypoints.length}`,
      `dependencies:${dependencies.length}`,
      `relationships:${relationships.length}`,
      `architectures:${architectures.length}`,
    ];

    const project: ProjectIdentity = {
      id: stableModelId("project-model", "project", projectName),
      name: projectName,
      evidence: projectEvidence,
      confidence: averageConfidence([
        ...domains.map((d) => d.confidence),
        ...entrypoints.map((e) => e.confidence),
        ...dependencies.map((d) => d.confidence),
        ...relationships.map((r) => r.confidence),
        ...architectures.map((a) => a.confidence),
      ]),
      sourcePass: "project-model",
      timestamp: generatedAt,
    };

    const metadata: ProjectMetadata = {
      id: stableModelId(
        "project-model",
        "metadata",
        `${projectName}:${PROJECT_MODEL_SCHEMA_VERSION}`,
      ),
      schemaVersion: PROJECT_MODEL_SCHEMA_VERSION,
      project,
      evidence: [`schema:${PROJECT_MODEL_SCHEMA_VERSION}`, ...projectEvidence],
      confidence: project.confidence,
      sourcePass: "project-model",
      timestamp: generatedAt,
    };

    const compilerMetadata: CompilerMetadata = {
      compilerVersion: UNDERSTANDING_COMPILER_VERSION,
      schemaVersion: PROJECT_MODEL_SCHEMA_VERSION,
      generatedAt,
      passes: COMPILER_PASSES as CompilerPassId[],
    };

    const summary = buildSummary({
      domains,
      entrypoints,
      dependencies,
      relationships,
      architectures,
      input,
    });

    const model = deepFreeze({
      metadata,
      domains,
      entrypoints,
      dependencies,
      relationships,
      architectures,
      summary,
      compilerMetadata,
    }) as ProjectModel;

    const validation = validateProjectModel(model);
    if (!validation.ok) {
      const detail = validation.issues.map((i) => `${i.path}: ${i.message}`).join("; ");
      throw new Error(`ProjectModel validation failed: ${detail}`);
    }

    return model;
  }
}

/** Convenience function wrapping ProjectModelBuilder. */
export function buildProjectModel(input: ProjectModelBuilderInput): ProjectModel {
  return new ProjectModelBuilder().build(input);
}
