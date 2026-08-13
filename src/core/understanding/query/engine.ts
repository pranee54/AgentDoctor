import type { ProjectModel } from "../model/types.js";
import { executeQuery } from "./executor.js";
import type { QueryResultMap } from "./models.js";
import { Queries, validateQuery } from "./query.js";
import { listSupportedQueryTypes } from "./registry.js";
import type { Query, QueryResponse } from "./types.js";

/**
 * Runtime query facade over an immutable ProjectModel.
 * This is the only supported read interface for future Explain/Trace/Understand/Verify/Search layers.
 */
export class QueryEngine {
  private readonly model: ProjectModel;

  constructor(model: ProjectModel) {
    this.model = model;
  }

  /** Execute any supported query against the bound ProjectModel. */
  execute<T extends Query>(query: T): QueryResponse<QueryResultMap[T["type"]]> {
    return executeQuery(this.model, query);
  }

  /** Validate a raw query object without executing it. */
  validate(query: unknown): Query {
    return validateQuery(query);
  }

  supportedQueries(): readonly string[] {
    return listSupportedQueryTypes();
  }

  getModelIdentity(): {
    projectName: string;
    modelId: string;
    schemaVersion: string;
  } {
    return {
      projectName: this.model.metadata.project.name,
      modelId: this.model.metadata.id,
      schemaVersion: this.model.metadata.schemaVersion,
    };
  }
}

export function createQueryEngine(model: ProjectModel): QueryEngine {
  return new QueryEngine(model);
}

export { Queries };
