import type { ProjectModel } from "./types.js";
import { validateProjectModel } from "./validator.js";

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort((a, b) => a.localeCompare(b))) {
      sorted[key] = sortKeysDeep(record[key]);
    }
    return sorted;
  }
  return value;
}

/**
 * Serialize a ProjectModel to deterministic JSON (sorted keys, 2-space indent).
 */
export function serializeProjectModel(model: ProjectModel): string {
  const validation = validateProjectModel(model);
  if (!validation.ok) {
    const detail = validation.issues.map((i) => `${i.path}: ${i.message}`).join("; ");
    throw new Error(`Cannot serialize invalid ProjectModel: ${detail}`);
  }
  return `${JSON.stringify(sortKeysDeep(model), null, 2)}\n`;
}

/**
 * Parse JSON into a ProjectModel and validate schema/provenance.
 */
export function parseProjectModel(json: string): ProjectModel {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid JSON";
    throw new Error(`ProjectModel parse failed: ${message}`);
  }
  const model = parsed as ProjectModel;
  const validation = validateProjectModel(model);
  if (!validation.ok) {
    const detail = validation.issues.map((i) => `${i.path}: ${i.message}`).join("; ");
    throw new Error(`ProjectModel parse validation failed: ${detail}`);
  }
  return model;
}
