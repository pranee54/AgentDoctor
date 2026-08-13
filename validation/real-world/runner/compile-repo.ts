import { inferArchitectures } from "../../../src/core/understanding/architecture/index.js";
import { discoverDependencies } from "../../../src/core/understanding/dependencies/index.js";
import { discoverDomains } from "../../../src/core/understanding/domain/index.js";
import { discoverEntrypoints } from "../../../src/core/understanding/entrypoints/index.js";
import { buildProjectModel } from "../../../src/core/understanding/model/index.js";
import type { ProjectModel } from "../../../src/core/understanding/model/types.js";
import { createQueryEngine } from "../../../src/core/understanding/query/index.js";
import { discoverRelationships } from "../../../src/core/understanding/relationships/index.js";
import { createUnderstandService } from "../../../src/core/understanding/understand/index.js";
import type { UnderstandResult } from "../../../src/core/understanding/understand/types.js";
import type { DomainDiscoveryResult } from "../../../src/core/understanding/types/index.js";
import type { EntrypointDiscoveryResult } from "../../../src/core/understanding/entrypoints/types.js";
import type { DependencyDiscoveryResult } from "../../../src/core/understanding/dependencies/types.js";
import type { RelationshipDiscoveryResult } from "../../../src/core/understanding/relationships/types.js";
import type { ArchitectureInferenceResult } from "../../../src/core/understanding/architecture/types.js";
import {
  REAL_WORLD_COMPILE_TIMEOUT_MS,
  REAL_WORLD_GENERATED_AT,
} from "../version.js";

export interface CompiledRepository {
  domains: DomainDiscoveryResult;
  entrypoints: EntrypointDiscoveryResult;
  dependencies: DependencyDiscoveryResult;
  relationships: RelationshipDiscoveryResult;
  architectures: ArchitectureInferenceResult;
  model: ProjectModel;
  understand: UnderstandResult;
  timingMs: {
    domains: number;
    entrypoints: number;
    dependencies: number;
    relationships: number;
    architectures: number;
    projectModel: number;
    query: number;
    understand: number;
    total: number;
  };
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_resolve, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`Timeout after ${ms}ms: ${label}`));
        }, ms);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

export async function compileRepository(
  cwd: string,
  timeoutMs: number = REAL_WORLD_COMPILE_TIMEOUT_MS,
): Promise<CompiledRepository> {
  return withTimeout(compileRepositoryInner(cwd), timeoutMs, cwd);
}

async function compileRepositoryInner(cwd: string): Promise<CompiledRepository> {
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
  const model = buildProjectModel({
    domains,
    entrypoints,
    dependencies,
    relationships,
    architectures,
    projectName: cwd.split(/[/\\]/).filter(Boolean).pop() ?? "project",
    generatedAt: REAL_WORLD_GENERATED_AT,
  });
  const projectModelMs = Math.round(performance.now() - started);

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
    model,
    understand,
    timingMs: {
      domains: domainsMs,
      entrypoints: entrypointsMs,
      dependencies: dependenciesMs,
      relationships: relationshipsMs,
      architectures: architecturesMs,
      projectModel: projectModelMs,
      query: queryMs,
      understand: understandMs,
      total: Math.round(performance.now() - totalStarted),
    },
  };
}
