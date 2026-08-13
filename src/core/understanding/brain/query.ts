import { averageBrainConfidence } from "./confidence.js";
import { buildBrainDelta, type BrainDelta } from "./delta.js";
import type { ProjectBrain } from "./types.js";

export type BrainQueryType =
  | "ProjectSummary"
  | "ListDomains"
  | "ListComponents"
  | "ListEntrypoints"
  | "ListDependencies"
  | "ListRelationships"
  | "ListArchitectures"
  | "ListOwnership"
  | "ListRisks"
  | "ListClaims"
  | "ListEvidence"
  | "ListContradictions"
  | "ListUnknowns"
  | "ListChanges"
  | "ListInvalidations"
  | "Impact"
  | "BlastRadius";

export type BrainQuery =
  | { type: "ProjectSummary" }
  | { type: "ListDomains" }
  | { type: "ListComponents" }
  | { type: "ListEntrypoints" }
  | { type: "ListDependencies" }
  | { type: "ListRelationships" }
  | { type: "ListArchitectures" }
  | { type: "ListOwnership" }
  | { type: "ListRisks" }
  | { type: "ListClaims"; status?: string }
  | { type: "ListEvidence" }
  | { type: "ListContradictions" }
  | { type: "ListUnknowns" }
  | { type: "ListChanges"; previous?: ProjectBrain }
  | { type: "ListInvalidations" }
  | { type: "Impact"; target: string }
  | { type: "BlastRadius"; target: string };

export interface BrainQueryResponse<T> {
  result: T;
  evidenceIds: readonly string[];
  confidence: number;
  snapshotId: string;
  metadata: {
    queryType: BrainQueryType;
    brainId: string;
    schemaVersion: string;
    projectName: string;
  };
  executionTimeMs: number;
}

function meta(brain: ProjectBrain, queryType: BrainQueryType) {
  return {
    queryType,
    brainId: brain.metadata.brainId,
    schemaVersion: brain.metadata.schemaVersion,
    projectName: brain.metadata.projectName,
  };
}

function envelope<T>(
  brain: ProjectBrain,
  queryType: BrainQueryType,
  result: T,
  evidenceIds: readonly string[],
  confidence: number,
  started: number,
): BrainQueryResponse<T> {
  return {
    result,
    evidenceIds,
    confidence,
    snapshotId: brain.snapshot.id,
    metadata: meta(brain, queryType),
    executionTimeMs: Math.max(0, Math.round(performance.now() - started)),
  };
}

export class BrainQueryEngine {
  constructor(private readonly brain: ProjectBrain) {}

  execute(query: BrainQuery): BrainQueryResponse<unknown> {
    const started = performance.now();
    const brain = this.brain;

    switch (query.type) {
      case "ProjectSummary":
        return envelope(
          brain,
          query.type,
          {
            projectName: brain.metadata.projectName,
            snapshotId: brain.snapshot.id,
            domainCount: brain.model.domains.length,
            componentCount: brain.components.length,
            claimCount: brain.claims.filter((c) => c.status === "ACTIVE").length,
            riskCount: brain.risks.risks.length,
            unknownCount: brain.unknowns.length,
            topDomains: brain.model.summary.topDomains,
          },
          [],
          averageBrainConfidence(brain.claims.map((c) => c.confidence)),
          started,
        );
      case "ListDomains":
        return envelope(
          brain,
          query.type,
          brain.model.domains,
          brain.model.domains.flatMap((d) =>
            brain.evidence.filter((e) => d.evidence.includes(e.locator)).map((e) => e.id),
          ),
          averageBrainConfidence(brain.model.domains.map((d) => d.confidence)),
          started,
        );
      case "ListComponents":
        return envelope(
          brain,
          query.type,
          brain.components,
          brain.components.flatMap((c) => c.evidenceIds),
          averageBrainConfidence(brain.components.map((c) => c.confidence)),
          started,
        );
      case "ListEntrypoints":
        return envelope(
          brain,
          query.type,
          brain.model.entrypoints,
          [],
          averageBrainConfidence(brain.model.entrypoints.map((e) => e.confidence)),
          started,
        );
      case "ListDependencies":
        return envelope(
          brain,
          query.type,
          brain.model.dependencies,
          [],
          averageBrainConfidence(brain.model.dependencies.map((d) => d.confidence)),
          started,
        );
      case "ListRelationships":
        return envelope(
          brain,
          query.type,
          brain.model.relationships,
          [],
          averageBrainConfidence(brain.model.relationships.map((r) => r.confidence)),
          started,
        );
      case "ListArchitectures":
        return envelope(
          brain,
          query.type,
          brain.model.architectures,
          [],
          averageBrainConfidence(brain.model.architectures.map((a) => a.confidence)),
          started,
        );
      case "ListOwnership":
        return envelope(
          brain,
          query.type,
          brain.ownership,
          [],
          averageBrainConfidence(brain.ownership.ownerships.map((o) => o.confidence)),
          started,
        );
      case "ListRisks":
        return envelope(
          brain,
          query.type,
          brain.risks,
          [],
          averageBrainConfidence(brain.risks.risks.map((r) => r.confidence)),
          started,
        );
      case "ListClaims": {
        const filtered = query.status
          ? brain.claims.filter((c) => c.status === query.status)
          : brain.claims.filter((c) => c.status === "ACTIVE" || c.status === "CONTRADICTED");
        return envelope(
          brain,
          query.type,
          filtered,
          filtered.flatMap((c) => c.evidenceIds),
          averageBrainConfidence(filtered.map((c) => c.confidence)),
          started,
        );
      }
      case "ListEvidence":
        return envelope(
          brain,
          query.type,
          brain.evidence,
          brain.evidence.map((e) => e.id),
          1,
          started,
        );
      case "ListContradictions":
        return envelope(
          brain,
          query.type,
          brain.contradictions,
          brain.contradictions.flatMap((c) => c.evidenceIds),
          averageBrainConfidence(brain.contradictions.map((c) => c.confidence)),
          started,
        );
      case "ListUnknowns":
        return envelope(brain, query.type, brain.unknowns, [], 1, started);
      case "ListChanges": {
        if (!query.previous) {
          return envelope(
            brain,
            query.type,
            { message: "previous brain required for changes" } as const,
            [],
            0,
            started,
          );
        }
        const delta: BrainDelta = buildBrainDelta(query.previous, brain);
        return envelope(brain, query.type, delta, [], 1, started);
      }
      case "ListInvalidations":
        return envelope(
          brain,
          query.type,
          brain.claims.filter((c) => c.status === "INVALIDATED"),
          [],
          1,
          started,
        );
      case "Impact":
      case "BlastRadius": {
        const target = query.target.toLowerCase();
        const deps = brain.model.dependencies.filter(
          (d) => d.from.toLowerCase().includes(target) || d.to.toLowerCase().includes(target),
        );
        const comps = brain.components.filter(
          (c) => c.path.toLowerCase().includes(target) || c.name.toLowerCase().includes(target),
        );
        return envelope(
          brain,
          query.type,
          { target: query.target, dependencies: deps, components: comps },
          comps.flatMap((c) => c.evidenceIds),
          averageBrainConfidence(deps.map((d) => d.confidence)),
          started,
        );
      }
      default:
        throw new Error(`unsupported brain query`);
    }
  }
}

export function createBrainQueryEngine(brain: ProjectBrain): BrainQueryEngine {
  return new BrainQueryEngine(brain);
}
