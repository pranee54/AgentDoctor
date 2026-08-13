import {
  COMPILER_PASSES,
  MODEL_PROVENANCE_KEYS,
  PROJECT_MODEL_REQUIRED_ROOT_KEYS,
} from "./schema.js";
import type {
  CompilerPassId,
  ModelProvenance,
  ProjectModel,
  ProjectModelValidationIssue,
  ProjectModelValidationResult,
} from "./types.js";
import { isIsoTimestamp } from "./ids.js";
import { PROJECT_MODEL_SCHEMA_VERSION, UNDERSTANDING_COMPILER_VERSION } from "./version.js";

function issue(path: string, message: string): ProjectModelValidationIssue {
  return { path, message };
}

function validateProvenance(
  path: string,
  value: unknown,
  issues: ProjectModelValidationIssue[],
): value is ModelProvenance {
  const before = issues.length;
  if (!value || typeof value !== "object") {
    issues.push(issue(path, "expected provenance object"));
    return false;
  }
  const record = value as Record<string, unknown>;
  for (const key of MODEL_PROVENANCE_KEYS) {
    if (!(key in record)) {
      issues.push(issue(`${path}.${key}`, "missing required provenance field"));
    }
  }
  if (typeof record.id !== "string" || record.id.length === 0) {
    issues.push(issue(`${path}.id`, "id must be a non-empty string"));
  }
  if (!Array.isArray(record.evidence) || record.evidence.some((e) => typeof e !== "string")) {
    issues.push(issue(`${path}.evidence`, "evidence must be string[]"));
  } else if ((record.evidence as string[]).length === 0) {
    issues.push(issue(`${path}.evidence`, "evidence must not be empty"));
  }
  if (typeof record.confidence !== "number" || record.confidence < 0 || record.confidence > 1) {
    issues.push(issue(`${path}.confidence`, "confidence must be a number in [0,1]"));
  }
  if (
    typeof record.sourcePass !== "string" ||
    !COMPILER_PASSES.includes(record.sourcePass as CompilerPassId)
  ) {
    issues.push(issue(`${path}.sourcePass`, "sourcePass must be a known compiler pass"));
  }
  if (typeof record.timestamp !== "string" || !isIsoTimestamp(record.timestamp)) {
    issues.push(issue(`${path}.timestamp`, "timestamp must be an ISO-8601 UTC string"));
  }
  return issues.length === before;
}

/**
 * Validate a ProjectModel against the versioned schema contract.
 */
export function validateProjectModel(model: ProjectModel): ProjectModelValidationResult {
  const issues: ProjectModelValidationIssue[] = [];

  if (!model || typeof model !== "object") {
    return { ok: false, issues: [issue("$", "model must be an object")] };
  }

  for (const key of PROJECT_MODEL_REQUIRED_ROOT_KEYS) {
    if (!(key in model)) {
      issues.push(issue(key, "missing required root key"));
    }
  }

  validateProvenance("metadata", model.metadata, issues);
  if (model.metadata) {
    if (model.metadata.schemaVersion !== PROJECT_MODEL_SCHEMA_VERSION) {
      issues.push(
        issue(
          "metadata.schemaVersion",
          `expected ${PROJECT_MODEL_SCHEMA_VERSION}, got ${String(model.metadata.schemaVersion)}`,
        ),
      );
    }
    validateProvenance("metadata.project", model.metadata.project, issues);
    if (model.metadata.project && typeof model.metadata.project.name !== "string") {
      issues.push(issue("metadata.project.name", "project name must be a string"));
    }
  }

  const collections: Array<{ path: string; items: readonly unknown[] | undefined }> = [
    { path: "domains", items: model.domains },
    { path: "entrypoints", items: model.entrypoints },
    { path: "dependencies", items: model.dependencies },
    { path: "relationships", items: model.relationships },
    { path: "architectures", items: model.architectures },
  ];

  for (const collection of collections) {
    if (!Array.isArray(collection.items)) {
      issues.push(issue(collection.path, "must be an array"));
      continue;
    }
    collection.items.forEach((item, index) => {
      validateProvenance(`${collection.path}[${index}]`, item, issues);
    });
  }

  if (!model.summary || typeof model.summary !== "object") {
    issues.push(issue("summary", "summary must be an object"));
  } else if (!model.summary.statistics || typeof model.summary.statistics !== "object") {
    issues.push(issue("summary.statistics", "statistics must be an object"));
  }

  if (!model.compilerMetadata || typeof model.compilerMetadata !== "object") {
    issues.push(issue("compilerMetadata", "compilerMetadata must be an object"));
  } else {
    if (model.compilerMetadata.compilerVersion !== UNDERSTANDING_COMPILER_VERSION) {
      issues.push(
        issue("compilerMetadata.compilerVersion", `expected ${UNDERSTANDING_COMPILER_VERSION}`),
      );
    }
    if (model.compilerMetadata.schemaVersion !== PROJECT_MODEL_SCHEMA_VERSION) {
      issues.push(
        issue("compilerMetadata.schemaVersion", `expected ${PROJECT_MODEL_SCHEMA_VERSION}`),
      );
    }
    if (
      typeof model.compilerMetadata.generatedAt !== "string" ||
      !isIsoTimestamp(model.compilerMetadata.generatedAt)
    ) {
      issues.push(issue("compilerMetadata.generatedAt", "must be ISO-8601 UTC"));
    }
    if (!Array.isArray(model.compilerMetadata.passes)) {
      issues.push(issue("compilerMetadata.passes", "passes must be an array"));
    }
  }

  // Stable id uniqueness across all provenance-bearing objects
  const ids = new Map<string, string>();
  const track = (path: string, id: string): void => {
    const existing = ids.get(id);
    if (existing) {
      issues.push(issue(path, `duplicate id ${id} (also at ${existing})`));
    } else {
      ids.set(id, path);
    }
  };
  if (model.metadata?.id) {
    track("metadata", model.metadata.id);
  }
  if (model.metadata?.project?.id) {
    track("metadata.project", model.metadata.project.id);
  }
  model.domains?.forEach((d, i) => track(`domains[${i}]`, d.id));
  model.entrypoints?.forEach((e, i) => track(`entrypoints[${i}]`, e.id));
  model.dependencies?.forEach((d, i) => track(`dependencies[${i}]`, d.id));
  model.relationships?.forEach((r, i) => track(`relationships[${i}]`, r.id));
  model.architectures?.forEach((a, i) => track(`architectures[${i}]`, a.id));

  return { ok: issues.length === 0, issues };
}
