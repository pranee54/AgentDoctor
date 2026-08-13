import { inferArchitectures } from "../../../src/core/understanding/architecture/index.js";
import type { ArchitectureInferenceResult } from "../../../src/core/understanding/architecture/types.js";
import { discoverDependencies } from "../../../src/core/understanding/dependencies/index.js";
import type { DependencyDiscoveryResult } from "../../../src/core/understanding/dependencies/types.js";
import { discoverDomains } from "../../../src/core/understanding/domain/index.js";
import { discoverEntrypoints } from "../../../src/core/understanding/entrypoints/index.js";
import type { EntrypointDiscoveryResult } from "../../../src/core/understanding/entrypoints/types.js";
import { buildProjectMind } from "../../../src/core/understanding/mind/index.js";
import type { ProjectMind } from "../../../src/core/understanding/mind/types.js";
import { buildProjectModel } from "../../../src/core/understanding/model/index.js";
import type { ProjectModel } from "../../../src/core/understanding/model/types.js";
import { discoverOwnership } from "../../../src/core/understanding/ownership/index.js";
import type { OwnershipDiscoveryResult } from "../../../src/core/understanding/ownership/types.js";
import { createQueryEngine } from "../../../src/core/understanding/query/index.js";
import { discoverRelationships } from "../../../src/core/understanding/relationships/index.js";
import type { RelationshipDiscoveryResult } from "../../../src/core/understanding/relationships/types.js";
import { discoverRisks } from "../../../src/core/understanding/risks/index.js";
import type { RiskDiscoveryResult } from "../../../src/core/understanding/risks/types.js";
import type { DomainDiscoveryResult } from "../../../src/core/understanding/types/index.js";
import { createUnderstandService } from "../../../src/core/understanding/understand/index.js";
import type { UnderstandResult } from "../../../src/core/understanding/understand/types.js";
import { VALIDATION_GENERATED_AT } from "../version.js";

export interface CompiledRepository {
  domains: DomainDiscoveryResult;
  entrypoints: EntrypointDiscoveryResult;
  dependencies: DependencyDiscoveryResult;
  relationships: RelationshipDiscoveryResult;
  architectures: ArchitectureInferenceResult;
  ownership: OwnershipDiscoveryResult;
  risks: RiskDiscoveryResult;
  model: ProjectModel;
  mind: ProjectMind;
  understand: UnderstandResult;
  timingMs: {
    domains: number;
    entrypoints: number;
    dependencies: number;
    relationships: number;
    architectures: number;
    ownership: number;
    risks: number;
    projectModel: number;
    projectMind: number;
    query: number;
    understand: number;
    total: number;
  };
}

/**
 * Run Compiler + Ownership/Risk + Project Mind + Query + Understand pipeline.
 */
export async function compileRepository(cwd: string): Promise<CompiledRepository> {
  const totalStarted = performance.now();

  let started = performance.now();
  const domains = await discoverDomains({ cwd });
  const domainsMs = Math.round(performance.now() - started);

  started = performance.now();
  const entrypoints = await discoverEntrypoints({ cwd });
  const entrypointsMs = Math.round(performance.now() - started);

  started = performance.now();
  const dependencies = await discoverDependencies({ cwd });
  const dependenciesMs = Math.round(performance.now() - started);

  started = performance.now();
  const relationships = await discoverRelationships({
    cwd,
    domains,
    entrypoints,
    dependencies,
  });
  const relationshipsMs = Math.round(performance.now() - started);

  started = performance.now();
  const architectures = inferArchitectures({
    domains,
    entrypoints,
    dependencies,
    relationships,
  });
  const architecturesMs = Math.round(performance.now() - started);

  started = performance.now();
  const ownership = await discoverOwnership({ cwd });
  const ownershipMs = Math.round(performance.now() - started);

  started = performance.now();
  const model = buildProjectModel({
    domains,
    entrypoints,
    dependencies,
    relationships,
    architectures,
    projectName: cwd.split(/[/\\]/).filter(Boolean).pop() ?? "project",
    generatedAt: VALIDATION_GENERATED_AT,
  });
  const projectModelMs = Math.round(performance.now() - started);

  started = performance.now();
  const risks = discoverRisks(model, ownership);
  const risksMs = Math.round(performance.now() - started);

  started = performance.now();
  const mind = await buildProjectMind(model, { cwd, ownership, risks });
  const projectMindMs = Math.round(performance.now() - started);

  started = performance.now();
  const engine = createQueryEngine(model);
  engine.execute({ type: "RepositorySummary" });
  engine.execute({ type: "ListDomains" });
  engine.execute({ type: "ListEntrypoints" });
  engine.execute({ type: "Statistics" });
  const queryMs = Math.round(performance.now() - started);

  started = performance.now();
  const understand = createUnderstandService(engine).summarize();
  const understandMs = Math.round(performance.now() - started);

  return {
    domains,
    entrypoints,
    dependencies,
    relationships,
    architectures,
    ownership,
    risks,
    model,
    mind,
    understand,
    timingMs: {
      domains: domainsMs,
      entrypoints: entrypointsMs,
      dependencies: dependenciesMs,
      relationships: relationshipsMs,
      architectures: architecturesMs,
      ownership: ownershipMs,
      risks: risksMs,
      projectModel: projectModelMs,
      projectMind: projectMindMs,
      query: queryMs,
      understand: understandMs,
      total: Math.round(performance.now() - totalStarted),
    },
  };
}
