import type { ProjectModel } from "../model/types.js";
import { QueryUnsupportedError } from "./errors.js";
import { getQueryHandler } from "./registry.js";
import { validateQuery } from "./query.js";
import type { QueryResultMap } from "./models.js";
import type { Query, QueryMetadata, QueryResponse } from "./types.js";

function buildMetadata(model: ProjectModel, queryType: Query["type"]): QueryMetadata {
  return {
    queryType,
    projectName: model.metadata.project.name,
    modelId: model.metadata.id,
    schemaVersion: model.metadata.schemaVersion,
    compilerVersion: model.compilerMetadata.compilerVersion,
    modelGeneratedAt: model.compilerMetadata.generatedAt,
  };
}

/**
 * Execute a validated query against an immutable ProjectModel.
 * Pure: no I/O, no compiler passes, no model mutation.
 */
export function executeQuery<T extends Query>(
  model: ProjectModel,
  rawQuery: T,
): QueryResponse<QueryResultMap[T["type"]]> {
  const started = performance.now();
  const query = validateQuery(rawQuery) as T;
  const handler = getQueryHandler(query.type);
  if (!handler) {
    throw new QueryUnsupportedError(`no handler registered for ${query.type}`);
  }

  const output = handler(query as never, { model });
  const executionTimeMs = Math.max(0, Math.round(performance.now() - started));

  return {
    result: output.result as QueryResultMap[T["type"]],
    evidence: Object.freeze([...output.evidence]),
    confidence: output.confidence,
    metadata: buildMetadata(model, query.type),
    executionTimeMs,
  };
}
