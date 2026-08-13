import type { Query, QueryType } from "./types.js";
import { QueryValidationError } from "./errors.js";

function requireNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new QueryValidationError(`${field} must be a non-empty string`);
  }
  return value.trim();
}

function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  return requireNonEmptyString(value, field);
}

/**
 * Validate and normalize a raw query object into a typed Query.
 */
export function validateQuery(input: unknown): Query {
  if (!input || typeof input !== "object") {
    throw new QueryValidationError("query must be an object");
  }
  const record = input as Record<string, unknown>;
  if (typeof record.type !== "string") {
    throw new QueryValidationError("query.type is required");
  }

  switch (record.type as QueryType) {
    case "RepositorySummary":
      return { type: "RepositorySummary" };
    case "ListDomains":
      return { type: "ListDomains" };
    case "ListEntrypoints":
      return { type: "ListEntrypoints" };
    case "ListArchitectures":
      return { type: "ListArchitectures" };
    case "ListRelationships":
      return { type: "ListRelationships" };
    case "ListDependencies":
      return { type: "ListDependencies" };
    case "Statistics":
      return { type: "Statistics" };
    case "FindDomain":
      return { type: "FindDomain", name: requireNonEmptyString(record.name, "name") };
    case "FindEntrypoint": {
      const file = optionalString(record.file, "file");
      const framework = optionalString(record.framework, "framework");
      const id = optionalString(record.id, "id");
      if (!file && !framework && !id) {
        throw new QueryValidationError("FindEntrypoint requires file, framework, or id");
      }
      const query: Extract<Query, { type: "FindEntrypoint" }> = { type: "FindEntrypoint" };
      if (file !== undefined) {
        query.file = file;
      }
      if (framework !== undefined) {
        query.framework = framework;
      }
      if (id !== undefined) {
        query.id = id;
      }
      return query;
    }
    case "FindArchitecture":
      return {
        type: "FindArchitecture",
        pattern: requireNonEmptyString(record.pattern, "pattern"),
      };
    case "FindComponent":
      return { type: "FindComponent", name: requireNonEmptyString(record.name, "name") };
    case "FindRelationship": {
      const source = optionalString(record.source, "source");
      const target = optionalString(record.target, "target");
      const relationship = optionalString(record.relationship, "relationship");
      const id = optionalString(record.id, "id");
      if (!source && !target && !relationship && !id) {
        throw new QueryValidationError(
          "FindRelationship requires source, target, relationship, or id",
        );
      }
      const query: Extract<Query, { type: "FindRelationship" }> = { type: "FindRelationship" };
      if (source !== undefined) {
        query.source = source;
      }
      if (target !== undefined) {
        query.target = target;
      }
      if (relationship !== undefined) {
        query.relationship = relationship;
      }
      if (id !== undefined) {
        query.id = id;
      }
      return query;
    }
    case "FindDependency": {
      const from = optionalString(record.from, "from");
      const to = optionalString(record.to, "to");
      const dependencyType = optionalString(record.dependencyType, "dependencyType");
      const id = optionalString(record.id, "id");
      if (!from && !to && !dependencyType && !id) {
        throw new QueryValidationError("FindDependency requires from, to, dependencyType, or id");
      }
      const query: Extract<Query, { type: "FindDependency" }> = { type: "FindDependency" };
      if (from !== undefined) {
        query.from = from;
      }
      if (to !== undefined) {
        query.to = to;
      }
      if (dependencyType !== undefined) {
        query.dependencyType = dependencyType;
      }
      if (id !== undefined) {
        query.id = id;
      }
      return query;
    }
    case "FindEvidence":
      return { type: "FindEvidence", needle: requireNonEmptyString(record.needle, "needle") };
    default:
      throw new QueryValidationError(`unsupported query type: ${String(record.type)}`);
  }
}

function pickDefined<T extends Record<string, unknown>>(
  base: T,
  fields: Record<string, string | undefined>,
): T {
  const out: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      out[key] = value;
    }
  }
  return out as T;
}

/** Typed query constructors (internal ergonomics). */
export const Queries = {
  repositorySummary: () => ({ type: "RepositorySummary" as const }),
  listDomains: () => ({ type: "ListDomains" as const }),
  listEntrypoints: () => ({ type: "ListEntrypoints" as const }),
  listArchitectures: () => ({ type: "ListArchitectures" as const }),
  listRelationships: () => ({ type: "ListRelationships" as const }),
  listDependencies: () => ({ type: "ListDependencies" as const }),
  findDomain: (name: string) => ({ type: "FindDomain" as const, name }),
  findEntrypoint: (options: { file?: string; framework?: string; id?: string }) =>
    pickDefined({ type: "FindEntrypoint" as const }, options),
  findArchitecture: (pattern: string) => ({ type: "FindArchitecture" as const, pattern }),
  findComponent: (name: string) => ({ type: "FindComponent" as const, name }),
  findRelationship: (options: {
    source?: string;
    target?: string;
    relationship?: string;
    id?: string;
  }) => pickDefined({ type: "FindRelationship" as const }, options),
  findDependency: (options: { from?: string; to?: string; dependencyType?: string; id?: string }) =>
    pickDefined({ type: "FindDependency" as const }, options),
  findEvidence: (needle: string) => ({ type: "FindEvidence" as const, needle }),
  statistics: () => ({ type: "Statistics" as const }),
} as const;
