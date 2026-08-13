import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { parseProjectModel } from "../../../src/core/understanding/model/index.js";
import {
  Queries,
  QueryNotFoundError,
  QueryValidationError,
  createQueryEngine,
  listSupportedQueryTypes,
  validateQuery,
} from "../../../src/core/understanding/query/index.js";
import type { QueryEngine } from "../../../src/core/understanding/query/index.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const modelPath = path.resolve(here, "../../../fixtures/understanding-query/project-model.json");

function loadEngine(): QueryEngine {
  const model = parseProjectModel(fs.readFileSync(modelPath, "utf8"));
  return createQueryEngine(model);
}

describe("query validation", () => {
  it("accepts all supported query constructors", () => {
    const types = listSupportedQueryTypes();
    expect(types).toHaveLength(14);
    expect(validateQuery(Queries.repositorySummary()).type).toBe("RepositorySummary");
    expect(validateQuery(Queries.findDomain("Payments")).type).toBe("FindDomain");
    expect(() => validateQuery({ type: "FindDomain" })).toThrow(QueryValidationError);
    expect(() => validateQuery({ type: "NoSuchQuery" })).toThrow(QueryValidationError);
  });
});

describe("QueryEngine", () => {
  const engine = loadEngine();

  it("answers RepositorySummary from the project model only", () => {
    const response = engine.execute(Queries.repositorySummary());
    expect(response.result.projectName).toBeTruthy();
    expect(response.result.statistics.domainCount).toBeGreaterThan(0);
    expect(response.evidence.length).toBeGreaterThan(0);
    expect(response.metadata.queryType).toBe("RepositorySummary");
    expect(response.executionTimeMs).toBeGreaterThanOrEqual(0);
  });

  it("lists domains, entrypoints, architectures, relationships, dependencies", () => {
    expect(engine.execute(Queries.listDomains()).result.count).toBeGreaterThan(0);
    expect(engine.execute(Queries.listEntrypoints()).result.count).toBeGreaterThan(0);
    expect(engine.execute(Queries.listArchitectures()).result.count).toBeGreaterThan(0);
    expect(engine.execute(Queries.listRelationships()).result.count).toBeGreaterThan(0);
    expect(engine.execute(Queries.listDependencies()).result.count).toBeGreaterThan(0);
  });

  it("finds a domain with related model slices", () => {
    const response = engine.execute(Queries.findDomain("Payments"));
    expect(response.result.domain.name).toBe("Payments");
    expect(response.confidence).toBeGreaterThan(0);
    expect(response.result.architectures.length).toBeGreaterThan(0);
    expect(response.evidence.length).toBeGreaterThan(0);
    expect(response.metadata.queryType).toBe("FindDomain");
  });

  it("finds entrypoint, architecture, relationship, and dependency", () => {
    const entrypoints = engine.execute(Queries.listEntrypoints()).result.entrypoints;
    const first = entrypoints[0];
    expect(first).toBeDefined();
    const foundEntry = engine.execute(Queries.findEntrypoint({ file: first!.file }));
    expect(foundEntry.result.entrypoint.file).toBe(first!.file);

    const architectures = engine.execute(Queries.listArchitectures()).result.architectures;
    const arch = architectures[0]!;
    const foundArch = engine.execute(Queries.findArchitecture(arch.pattern));
    expect(foundArch.result.architecture.pattern).toBe(arch.pattern);

    const relationships = engine.execute(Queries.listRelationships()).result.relationships;
    const rel = relationships[0]!;
    const foundRel = engine.execute(
      Queries.findRelationship({
        source: rel.source,
        target: rel.target,
        relationship: rel.relationship,
      }),
    );
    expect(foundRel.result.relationship.id).toBe(rel.id);

    const dependencies = engine.execute(Queries.listDependencies()).result.dependencies;
    const dep = dependencies[0]!;
    const foundDep = engine.execute(
      Queries.findDependency({ from: dep.from, to: dep.to, dependencyType: dep.type }),
    );
    expect(foundDep.result.dependency.id).toBe(dep.id);
  });

  it("finds components mentioned in relationships", () => {
    const relationships = engine.execute(Queries.listRelationships()).result.relationships;
    const name = relationships[0]!.source;
    const response = engine.execute(Queries.findComponent(name));
    expect(response.result.name).toBe(name);
    expect(
      response.result.asRelationshipSource.length + response.result.asRelationshipTarget.length,
    ).toBeGreaterThan(0);
  });

  it("finds evidence by needle", () => {
    const response = engine.execute(Queries.findEvidence("Payments"));
    expect(response.result.count).toBeGreaterThan(0);
    expect(response.result.hits.every((hit) => hit.evidence.length > 0)).toBe(true);
  });

  it("returns statistics", () => {
    const response = engine.execute(Queries.statistics());
    expect(response.result.summary.statistics.architectureCount).toBeGreaterThan(0);
    expect(response.result.model.schemaVersion).toBeTruthy();
  });

  it("throws not-found for missing domain", () => {
    expect(() => engine.execute(Queries.findDomain("DefinitelyMissingDomainXYZ"))).toThrow(
      QueryNotFoundError,
    );
  });

  it("is deterministic across repeated queries", () => {
    const a = engine.execute(Queries.findDomain("Payments"));
    const b = engine.execute(Queries.findDomain("Payments"));
    expect(a.result).toEqual(b.result);
    expect(a.evidence).toEqual(b.evidence);
    expect(a.confidence).toBe(b.confidence);
  });

  it("does not mutate the bound project model", () => {
    const before = engine.getModelIdentity();
    engine.execute(Queries.listDomains());
    engine.execute(Queries.findEvidence("Service"));
    expect(engine.getModelIdentity()).toEqual(before);
  });
});
