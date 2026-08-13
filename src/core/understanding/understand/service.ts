import { Queries } from "../query/engine.js";
import { formatUnderstandReport } from "./formatter.js";
import { UNDERSTAND_LIMITATIONS, collectUnknowns } from "./summary.js";
import type {
  UnderstandEngine,
  UnderstandResult,
  UnderstandServiceOptions,
  UnderstandSnapshot,
} from "./types.js";

const DEFAULT_MAX_ITEMS = 8;

/**
 * First vertical-slice consumer of the Software Understanding Compiler.
 * Reads exclusively through QueryEngine — never ProjectModel, never compiler passes.
 */
export class UnderstandService {
  private readonly engine: UnderstandEngine;
  private readonly maxItems: number;

  constructor(engine: UnderstandEngine, options: UnderstandServiceOptions = {}) {
    this.engine = engine;
    this.maxItems = options.maxItems ?? DEFAULT_MAX_ITEMS;
  }

  /**
   * Produce a deterministic human-readable repository understanding report.
   */
  summarize(): UnderstandResult {
    const started = performance.now();

    const repository = this.engine.execute(Queries.repositorySummary());
    const domains = this.engine.execute(Queries.listDomains());
    const entrypoints = this.engine.execute(Queries.listEntrypoints());
    const architectures = this.engine.execute(Queries.listArchitectures());
    const dependencies = this.engine.execute(Queries.listDependencies());
    const relationships = this.engine.execute(Queries.listRelationships());
    const statistics = this.engine.execute(Queries.statistics());
    const queryCount = 7;

    const architectureUnknowns = architectures.result.architectures.flatMap(
      (arch) => arch.unknowns,
    );

    const unknowns = collectUnknowns({
      architectureUnknowns,
      domainCount: domains.result.count,
      entrypointCount: entrypoints.result.count,
      architectureCount: architectures.result.count,
      dependencyCount: dependencies.result.count,
      relationshipCount: relationships.result.count,
    });

    const snapshot: UnderstandSnapshot = {
      repository: repository.result,
      domains: domains.result,
      entrypoints: entrypoints.result,
      architectures: architectures.result,
      dependencies: dependencies.result,
      relationships: relationships.result,
      statistics: statistics.result,
      unknowns,
      limitations: UNDERSTAND_LIMITATIONS,
      queryCount,
    };

    const { text, sections } = formatUnderstandReport(snapshot, { maxItems: this.maxItems });
    const confidence =
      Math.round(
        ((repository.confidence +
          domains.confidence +
          entrypoints.confidence +
          architectures.confidence +
          dependencies.confidence +
          relationships.confidence +
          statistics.confidence) /
          queryCount) *
          100,
      ) / 100;

    return {
      text,
      sections,
      confidence,
      executionTimeMs: Math.max(0, Math.round(performance.now() - started)),
      queryCount,
      snapshot,
    };
  }
}

export function createUnderstandService(
  engine: UnderstandEngine,
  options?: UnderstandServiceOptions,
): UnderstandService {
  return new UnderstandService(engine, options);
}

/** Convenience: run understand and return plain text only. */
export function understandAsText(
  engine: UnderstandEngine,
  options?: UnderstandServiceOptions,
): string {
  return createUnderstandService(engine, options).summarize().text;
}
