import type {
  ProjectArchitecture,
  ProjectDependency,
  ProjectDomain,
  ProjectEntrypoint,
  ProjectModel,
  ProjectRelationship,
} from "../model/types.js";
import { QueryNotFoundError } from "./errors.js";
import type {
  EvidenceHit,
  FindArchitectureResult,
  FindComponentResult,
  FindDependencyResult,
  FindDomainResult,
  FindEntrypointResult,
  FindEvidenceResult,
  FindRelationshipResult,
  ListArchitecturesResult,
  ListDependenciesResult,
  ListDomainsResult,
  ListEntrypointsResult,
  ListRelationshipsResult,
  QueryHandlerContext,
  QueryHandlerOutput,
  QueryResultMap,
  RepositorySummaryResult,
  StatisticsResult,
} from "./models.js";
import type { Query, QueryType } from "./types.js";

function average(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const sum = values.reduce((acc, value) => acc + value, 0);
  return Math.round((sum / values.length) * 100) / 100;
}

function includesIgnoreCase(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

function equalsIgnoreCase(left: string, right: string): boolean {
  return left.toLowerCase() === right.toLowerCase();
}

function domainRelatedPaths(domain: ProjectDomain): string[] {
  return [...domain.paths, ...domain.evidence];
}

function entrypointsForDomain(model: ProjectModel, domain: ProjectDomain): ProjectEntrypoint[] {
  const paths = domainRelatedPaths(domain);
  return model.entrypoints.filter((entry) =>
    paths.some(
      (path) => includesIgnoreCase(path, entry.file) || includesIgnoreCase(entry.file, path),
    ),
  );
}

function relationshipsForDomain(model: ProjectModel, domain: ProjectDomain): ProjectRelationship[] {
  return model.relationships.filter(
    (rel) =>
      equalsIgnoreCase(rel.source, domain.name) ||
      equalsIgnoreCase(rel.target, domain.name) ||
      rel.evidence.some((e) => includesIgnoreCase(e, domain.name)) ||
      domainRelatedPaths(domain).some(
        (path) =>
          includesIgnoreCase(rel.source, path) ||
          includesIgnoreCase(rel.target, path) ||
          rel.evidence.some((e) => includesIgnoreCase(e, path)),
      ),
  );
}

function dependenciesForDomain(model: ProjectModel, domain: ProjectDomain): ProjectDependency[] {
  return model.dependencies.filter(
    (dep) =>
      equalsIgnoreCase(dep.from, domain.name) ||
      equalsIgnoreCase(dep.to, domain.name) ||
      dep.evidence.some((e) => includesIgnoreCase(e, domain.name)),
  );
}

function architecturesForDomain(model: ProjectModel, domain: ProjectDomain): ProjectArchitecture[] {
  const related = model.architectures.filter(
    (arch) =>
      arch.evidence.some((e) => includesIgnoreCase(e, domain.name)) ||
      arch.matchedRules.some((r) => includesIgnoreCase(r, domain.name)),
  );
  if (related.length > 0) {
    return related;
  }
  // Fall back to top architectures when domain exists but has no direct arch mentions.
  return model.architectures.slice(0, 3);
}

type Handler<T extends QueryType> = (
  query: Extract<Query, { type: T }>,
  ctx: QueryHandlerContext,
) => QueryHandlerOutput<QueryResultMap[T]>;

const handlers: { [K in QueryType]: Handler<K> } = {
  RepositorySummary: (_query, ctx) => {
    const { model } = ctx;
    const result: RepositorySummaryResult = {
      projectName: model.metadata.project.name,
      schemaVersion: model.metadata.schemaVersion,
      compilerVersion: model.compilerMetadata.compilerVersion,
      generatedAt: model.compilerMetadata.generatedAt,
      topDomains: model.summary.topDomains,
      topArchitectures: model.summary.topArchitectures,
      frameworks: model.summary.frameworks,
      statistics: model.summary.statistics,
    };
    return {
      result,
      evidence: [...model.metadata.evidence],
      confidence: model.metadata.confidence,
    };
  },

  ListDomains: (_query, ctx) => {
    const domains = ctx.model.domains;
    const result: ListDomainsResult = { domains, count: domains.length };
    return {
      result,
      evidence: domains.flatMap((d) => d.evidence).slice(0, 20),
      confidence: average(domains.map((d) => d.confidence)),
    };
  },

  ListEntrypoints: (_query, ctx) => {
    const entrypoints = ctx.model.entrypoints;
    const result: ListEntrypointsResult = { entrypoints, count: entrypoints.length };
    return {
      result,
      evidence: entrypoints.flatMap((e) => e.evidence).slice(0, 20),
      confidence: average(entrypoints.map((e) => e.confidence)),
    };
  },

  ListArchitectures: (_query, ctx) => {
    const architectures = ctx.model.architectures;
    const result: ListArchitecturesResult = { architectures, count: architectures.length };
    return {
      result,
      evidence: architectures.flatMap((a) => a.evidence).slice(0, 20),
      confidence: average(architectures.map((a) => a.confidence)),
    };
  },

  ListRelationships: (_query, ctx) => {
    const relationships = ctx.model.relationships;
    const result: ListRelationshipsResult = { relationships, count: relationships.length };
    return {
      result,
      evidence: relationships.flatMap((r) => r.evidence).slice(0, 20),
      confidence: average(relationships.map((r) => r.confidence)),
    };
  },

  ListDependencies: (_query, ctx) => {
    const dependencies = ctx.model.dependencies;
    const result: ListDependenciesResult = { dependencies, count: dependencies.length };
    return {
      result,
      evidence: dependencies.flatMap((d) => d.evidence).slice(0, 20),
      confidence: average(dependencies.map((d) => d.confidence)),
    };
  },

  FindDomain: (query, ctx) => {
    const domain = ctx.model.domains.find((d) => equalsIgnoreCase(d.name, query.name));
    if (!domain) {
      throw new QueryNotFoundError(`domain not found: ${query.name}`);
    }
    const entrypoints = entrypointsForDomain(ctx.model, domain);
    const relationships = relationshipsForDomain(ctx.model, domain);
    const dependencies = dependenciesForDomain(ctx.model, domain);
    const architectures = architecturesForDomain(ctx.model, domain);
    const result: FindDomainResult = {
      domain,
      entrypoints,
      relationships,
      dependencies,
      architectures,
    };
    return {
      result,
      evidence: [
        ...domain.evidence,
        ...entrypoints.flatMap((e) => e.evidence).slice(0, 5),
        ...relationships.flatMap((r) => r.evidence).slice(0, 5),
      ],
      confidence: domain.confidence,
    };
  },

  FindEntrypoint: (query, ctx) => {
    const entrypoint = ctx.model.entrypoints.find((entry) => {
      if (query.id && entry.id === query.id) {
        return true;
      }
      if (query.file && equalsIgnoreCase(entry.file, query.file)) {
        return true;
      }
      if (
        query.framework &&
        equalsIgnoreCase(entry.framework, query.framework) &&
        !query.file &&
        !query.id
      ) {
        return true;
      }
      if (
        query.framework &&
        query.file &&
        equalsIgnoreCase(entry.framework, query.framework) &&
        equalsIgnoreCase(entry.file, query.file)
      ) {
        return true;
      }
      return false;
    });
    if (!entrypoint) {
      throw new QueryNotFoundError("entrypoint not found");
    }
    const result: FindEntrypointResult = { entrypoint };
    return {
      result,
      evidence: [...entrypoint.evidence],
      confidence: entrypoint.confidence,
    };
  },

  FindArchitecture: (query, ctx) => {
    const architecture = ctx.model.architectures.find((arch) =>
      equalsIgnoreCase(arch.pattern, query.pattern),
    );
    if (!architecture) {
      throw new QueryNotFoundError(`architecture not found: ${query.pattern}`);
    }
    const result: FindArchitectureResult = { architecture };
    return {
      result,
      evidence: [...architecture.evidence, ...architecture.matchedRules],
      confidence: architecture.confidence,
    };
  },

  FindComponent: (query, ctx) => {
    const name = query.name;
    const asRelationshipSource = ctx.model.relationships.filter((r) =>
      equalsIgnoreCase(r.source, name),
    );
    const asRelationshipTarget = ctx.model.relationships.filter((r) =>
      equalsIgnoreCase(r.target, name),
    );
    const asDependencyEndpoint = ctx.model.dependencies.filter(
      (d) => equalsIgnoreCase(d.from, name) || equalsIgnoreCase(d.to, name),
    );
    const matchingEntrypoints = ctx.model.entrypoints.filter(
      (e) =>
        includesIgnoreCase(e.file, name) || e.evidence.some((ev) => includesIgnoreCase(ev, name)),
    );
    const matchingDomains = ctx.model.domains.filter(
      (d) =>
        equalsIgnoreCase(d.name, name) || d.evidence.some((ev) => includesIgnoreCase(ev, name)),
    );

    if (
      asRelationshipSource.length === 0 &&
      asRelationshipTarget.length === 0 &&
      asDependencyEndpoint.length === 0 &&
      matchingEntrypoints.length === 0 &&
      matchingDomains.length === 0
    ) {
      throw new QueryNotFoundError(`component not found: ${name}`);
    }

    const result: FindComponentResult = {
      name,
      asRelationshipSource,
      asRelationshipTarget,
      asDependencyEndpoint,
      matchingEntrypoints,
      matchingDomains,
    };
    const confidences = [
      ...asRelationshipSource.map((r) => r.confidence),
      ...asRelationshipTarget.map((r) => r.confidence),
      ...asDependencyEndpoint.map((d) => d.confidence),
      ...matchingEntrypoints.map((e) => e.confidence),
      ...matchingDomains.map((d) => d.confidence),
    ];
    return {
      result,
      evidence: [
        ...asRelationshipSource.flatMap((r) => r.evidence),
        ...asRelationshipTarget.flatMap((r) => r.evidence),
        ...asDependencyEndpoint.flatMap((d) => d.evidence),
      ].slice(0, 30),
      confidence: average(confidences),
    };
  },

  FindRelationship: (query, ctx) => {
    const matches = ctx.model.relationships.filter((rel) => {
      if (query.id) {
        return rel.id === query.id;
      }
      if (query.source && !equalsIgnoreCase(rel.source, query.source)) {
        return false;
      }
      if (query.target && !equalsIgnoreCase(rel.target, query.target)) {
        return false;
      }
      if (query.relationship && !equalsIgnoreCase(rel.relationship, query.relationship)) {
        return false;
      }
      return Boolean(query.source || query.target || query.relationship);
    });
    const relationship = matches[0];
    if (!relationship) {
      throw new QueryNotFoundError("relationship not found");
    }
    const result: FindRelationshipResult = { relationship };
    return {
      result,
      evidence: [...relationship.evidence],
      confidence: relationship.confidence,
    };
  },

  FindDependency: (query, ctx) => {
    const matches = ctx.model.dependencies.filter((dep) => {
      if (query.id) {
        return dep.id === query.id;
      }
      if (query.from && !equalsIgnoreCase(dep.from, query.from)) {
        return false;
      }
      if (query.to && !equalsIgnoreCase(dep.to, query.to)) {
        return false;
      }
      if (query.dependencyType && !equalsIgnoreCase(dep.type, query.dependencyType)) {
        return false;
      }
      return Boolean(query.from || query.to || query.dependencyType);
    });
    const dependency = matches[0];
    if (!dependency) {
      throw new QueryNotFoundError("dependency not found");
    }
    const result: FindDependencyResult = { dependency };
    return {
      result,
      evidence: [...dependency.evidence],
      confidence: dependency.confidence,
    };
  },

  FindEvidence: (query, ctx) => {
    const needle = query.needle;
    const hits: EvidenceHit[] = [];

    const push = (
      collection: EvidenceHit["collection"],
      id: string,
      label: string,
      evidence: readonly string[],
    ): void => {
      const matched = evidence.filter((item) => includesIgnoreCase(item, needle));
      if (matched.length > 0) {
        hits.push({ collection, id, label, evidence: matched });
      }
    };

    push(
      "metadata",
      ctx.model.metadata.id,
      ctx.model.metadata.project.name,
      ctx.model.metadata.evidence,
    );
    for (const domain of ctx.model.domains) {
      push("domains", domain.id, domain.name, domain.evidence);
    }
    for (const entry of ctx.model.entrypoints) {
      push("entrypoints", entry.id, entry.file, entry.evidence);
    }
    for (const dep of ctx.model.dependencies) {
      push("dependencies", dep.id, `${dep.from}->${dep.to}`, dep.evidence);
    }
    for (const rel of ctx.model.relationships) {
      push("relationships", rel.id, `${rel.source}->${rel.target}`, rel.evidence);
    }
    for (const arch of ctx.model.architectures) {
      push("architectures", arch.id, arch.pattern, [
        ...arch.evidence,
        ...arch.matchedRules,
        ...arch.conflictingEvidence,
        ...arch.unknowns,
      ]);
    }

    hits.sort((a, b) => a.collection.localeCompare(b.collection) || a.label.localeCompare(b.label));

    if (hits.length === 0) {
      throw new QueryNotFoundError(`evidence not found for needle: ${needle}`);
    }

    const result: FindEvidenceResult = { needle, hits, count: hits.length };
    return {
      result,
      evidence: hits.flatMap((hit) => hit.evidence).slice(0, 40),
      confidence: Math.min(0.99, 0.5 + Math.min(hits.length, 10) * 0.04),
    };
  },

  Statistics: (_query, ctx) => {
    const result: StatisticsResult = {
      summary: ctx.model.summary,
      model: {
        projectName: ctx.model.metadata.project.name,
        schemaVersion: ctx.model.metadata.schemaVersion,
        compilerVersion: ctx.model.compilerMetadata.compilerVersion,
        generatedAt: ctx.model.compilerMetadata.generatedAt,
      },
    };
    return {
      result,
      evidence: [
        `domains:${ctx.model.summary.statistics.domainCount}`,
        `entrypoints:${ctx.model.summary.statistics.entrypointCount}`,
        `dependencies:${ctx.model.summary.statistics.dependencyCount}`,
        `relationships:${ctx.model.summary.statistics.relationshipCount}`,
        `architectures:${ctx.model.summary.statistics.architectureCount}`,
      ],
      confidence: ctx.model.summary.statistics.averageConfidence,
    };
  },
};

export function getQueryHandler<T extends QueryType>(type: T): Handler<T> {
  return handlers[type];
}

export function listSupportedQueryTypes(): QueryType[] {
  return Object.keys(handlers).sort((a, b) => a.localeCompare(b)) as QueryType[];
}
