import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  PROJECT_MODEL_SCHEMA_VERSION,
  UNDERSTANDING_COMPILER_VERSION,
  buildProjectModel,
  parseProjectModel,
  serializeProjectModel,
  stableModelId,
  validateProjectModel,
} from "../../../src/core/understanding/model/index.js";
import type { ProjectModelBuilderInput } from "../../../src/core/understanding/model/types.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.resolve(here, "../../../fixtures/understanding-project-model");

function loadInput(name: string): ProjectModelBuilderInput {
  return JSON.parse(
    fs.readFileSync(path.join(fixtureDir, name), "utf8"),
  ) as ProjectModelBuilderInput;
}

describe("project model ids", () => {
  it("produces stable deterministic ids", () => {
    const a = stableModelId("domain-discovery", "domain", "Payments");
    const b = stableModelId("domain-discovery", "domain", "Payments");
    const c = stableModelId("domain-discovery", "domain", "Auth");
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a.startsWith("domain_")).toBe(true);
  });
});

describe("buildProjectModel", () => {
  it("builds a unified immutable model from compiler pass outputs", () => {
    const model = buildProjectModel(loadInput("builder-input.json"));

    expect(model.metadata.schemaVersion).toBe(PROJECT_MODEL_SCHEMA_VERSION);
    expect(model.compilerMetadata.compilerVersion).toBe(UNDERSTANDING_COMPILER_VERSION);
    expect(model.compilerMetadata.generatedAt).toBe("2026-08-06T00:00:00.000Z");
    expect(model.domains.length).toBeGreaterThan(0);
    expect(model.entrypoints.length).toBeGreaterThan(0);
    expect(model.dependencies.length).toBeGreaterThan(0);
    expect(model.relationships.length).toBeGreaterThan(0);
    expect(model.architectures.length).toBeGreaterThan(0);

    for (const domain of model.domains) {
      expect(domain.id).toMatch(/^domain_/);
      expect(domain.sourcePass).toBe("domain-discovery");
      expect(domain.evidence.length).toBeGreaterThan(0);
      expect(domain.timestamp).toBe("2026-08-06T00:00:00.000Z");
      expect(domain.confidence).toBeGreaterThanOrEqual(0);
    }
    for (const entry of model.entrypoints) {
      expect(entry.sourcePass).toBe("entrypoint-discovery");
      expect(entry.id).toMatch(/^entrypoint_/);
    }
    for (const dep of model.dependencies) {
      expect(dep.sourcePass).toBe("dependency-discovery");
    }
    for (const rel of model.relationships) {
      expect(rel.sourcePass).toBe("relationship-discovery");
    }
    for (const arch of model.architectures) {
      expect(arch.sourcePass).toBe("architecture-inference");
      expect(arch.matchedRules.length).toBeGreaterThan(0);
    }

    expect(model.summary.statistics.domainCount).toBe(model.domains.length);
    expect(model.summary.statistics.architectureCount).toBe(model.architectures.length);
    expect(Object.isFrozen(model)).toBe(true);
    expect(Object.isFrozen(model.domains)).toBe(true);

    const validation = validateProjectModel(model);
    expect(validation.ok).toBe(true);
    expect(validation.issues).toEqual([]);
  });

  it("builds an empty but valid model", () => {
    const model = buildProjectModel(loadInput("empty-input.json"));
    expect(model.domains).toEqual([]);
    expect(model.architectures).toEqual([]);
    expect(model.summary.statistics.evidenceCount).toBe(0);
    expect(validateProjectModel(model).ok).toBe(true);
  });

  it("is deterministic for fixed generatedAt", () => {
    const input = loadInput("builder-input.json");
    const a = buildProjectModel(input);
    const b = buildProjectModel(input);
    expect(a).toEqual(b);
    expect(serializeProjectModel(a)).toBe(serializeProjectModel(b));
  });
});

describe("serializeProjectModel / parseProjectModel", () => {
  it("round-trips through deterministic JSON", () => {
    const model = buildProjectModel(loadInput("builder-input.json"));
    const json = serializeProjectModel(model);
    expect(json.endsWith("\n")).toBe(true);
    const restored = parseProjectModel(json);
    expect(restored.metadata.project.name).toBe(model.metadata.project.name);
    expect(restored.domains).toEqual(model.domains);
    expect(restored.architectures.map((a) => a.pattern)).toEqual(
      model.architectures.map((a) => a.pattern),
    );
  });

  it("rejects invalid JSON payloads", () => {
    expect(() => parseProjectModel("{}")).toThrow(/validation failed/);
  });
});
