import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  inferArchitectures,
  listArchitecturePatterns,
  scorePatternConfidence,
} from "../../../src/core/understanding/index.js";
import type { ArchitectureInferenceInput } from "../../../src/core/understanding/architecture/types.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.resolve(here, "../../../fixtures/understanding-architecture-inference");

function loadFixture(name: string): ArchitectureInferenceInput {
  const raw = fs.readFileSync(path.join(fixtureDir, name), "utf8");
  return JSON.parse(raw) as ArchitectureInferenceInput;
}

describe("architecture inference helpers", () => {
  it("lists all supported patterns", () => {
    const patterns = listArchitecturePatterns();
    expect(patterns).toEqual(
      expect.arrayContaining([
        "MVC",
        "Clean Architecture",
        "BLoC",
        "Monorepo Workspace",
        "Repository Pattern",
        "Service Layer",
      ]),
    );
    expect(patterns.length).toBe(17);
  });

  it("never scores certainty", () => {
    expect(
      scorePatternConfidence({ supportScore: 100, conflictScore: 0, matchedRuleCount: 10 }),
    ).toBeLessThanOrEqual(0.95);
  });
});

describe("inferArchitectures", () => {
  it("returns no architectures for empty discovery input", () => {
    const result = inferArchitectures(loadFixture("empty.json"));
    expect(result.architectures).toEqual([]);
    expect(result.patternsEvaluated).toBe(17);
  });

  it("infers multiple patterns from rich monorepo discovery output", () => {
    const result = inferArchitectures(loadFixture("rich-monorepo.json"));
    expect(result.architectures.length).toBeGreaterThanOrEqual(5);

    for (const arch of result.architectures) {
      expect(arch.confidence).toBeGreaterThan(0);
      expect(arch.confidence).toBeLessThanOrEqual(0.95);
      expect(arch.matchedRules.length).toBeGreaterThan(0);
      expect(arch.evidence.length).toBeGreaterThan(0);
      expect(Array.isArray(arch.conflictingEvidence)).toBe(true);
      expect(Array.isArray(arch.unknowns)).toBe(true);
    }

    const byPattern = Object.fromEntries(result.architectures.map((a) => [a.pattern, a]));
    expect(byPattern["Clean Architecture"]).toBeDefined();
    expect(byPattern["Clean Architecture"]?.matchedRules).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/Presentation|Repositories behind interfaces|Application/),
      ]),
    );
    expect(byPattern["Repository Pattern"]).toBeDefined();
    expect(byPattern["Service Layer"]).toBeDefined();
    expect(byPattern.BLoC).toBeDefined();
    expect(byPattern["Monorepo Workspace"]).toBeDefined();
    expect(byPattern.MVC).toBeDefined();

    const json = JSON.parse(JSON.stringify({ architectures: result.architectures })) as {
      architectures: Array<{
        pattern: string;
        confidence: number;
        matchedRules: string[];
        conflictingEvidence: string[];
        unknowns: string[];
        evidence: string[];
      }>;
    };
    expect(json.architectures[0]).toMatchObject({
      pattern: expect.any(String),
      confidence: expect.any(Number),
      matchedRules: expect.any(Array),
      conflictingEvidence: expect.any(Array),
      unknowns: expect.any(Array),
      evidence: expect.any(Array),
    });
  });

  it("records conflicting infrastructure leaks for clean architecture", () => {
    const result = inferArchitectures(loadFixture("clean-with-leak.json"));
    const clean = result.architectures.find((a) => a.pattern === "Clean Architecture");
    expect(clean).toBeDefined();
    expect(
      clean?.conflictingEvidence.some((e) => /Infrastructure accessed directly/i.test(e)),
    ).toBe(true);
    expect(clean?.matchedRules.some((r) => /Repositories behind interfaces/i.test(r))).toBe(true);
  });

  it("is deterministic across repeated runs", () => {
    const input = loadFixture("rich-monorepo.json");
    const a = inferArchitectures(input);
    const b = inferArchitectures(input);
    expect(a.architectures).toEqual(b.architectures);
  });

  it("never invents patterns without matched rules", () => {
    const result = inferArchitectures(loadFixture("empty.json"));
    expect(result.architectures.every((a) => a.matchedRules.length > 0)).toBe(true);
  });
});
