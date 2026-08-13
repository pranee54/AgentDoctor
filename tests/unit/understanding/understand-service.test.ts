import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { parseProjectModel } from "../../../src/core/understanding/model/index.js";
import { Queries, createQueryEngine } from "../../../src/core/understanding/query/index.js";
import {
  UNDERSTAND_LIMITATIONS,
  collectUnknowns,
  createUnderstandService,
  formatConfidence,
  understandAsText,
} from "../../../src/core/understanding/understand/index.js";
import type { UnderstandEngine } from "../../../src/core/understanding/understand/types.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.resolve(here, "../../../fixtures/understanding-understand");

function loadEngine(): ReturnType<typeof createQueryEngine> {
  const model = parseProjectModel(
    fs.readFileSync(path.join(fixtureDir, "project-model.json"), "utf8"),
  );
  return createQueryEngine(model);
}

describe("understand helpers", () => {
  it("formats confidence deterministically", () => {
    expect(formatConfidence(0.9)).toBe("0.90");
    expect(formatConfidence(0.91)).toBe("0.91");
  });

  it("collects and sorts unknowns", () => {
    const unknowns = collectUnknowns({
      architectureUnknowns: ["b", "a", "a"],
      domainCount: 0,
      entrypointCount: 1,
      architectureCount: 1,
      dependencyCount: 1,
      relationshipCount: 1,
    });
    expect(unknowns).toContain("No domains were reported by the Query Engine.");
    expect(unknowns).toContain("a");
    expect(unknowns).toContain("b");
    expect(unknowns.filter((u) => u === "a")).toHaveLength(1);
    expect(unknowns).toEqual([...unknowns].sort((a, b) => a.localeCompare(b)));
  });

  it("exposes fixed limitations", () => {
    expect(UNDERSTAND_LIMITATIONS.length).toBeGreaterThan(0);
    expect(UNDERSTAND_LIMITATIONS.every((line) => line.length > 0)).toBe(true);
  });
});

describe("UnderstandService", () => {
  it("produces a deterministic plain-text summary via Query Engine only", () => {
    const engine = loadEngine();
    const service = createUnderstandService(engine);
    const result = service.summarize();
    const expected = fs.readFileSync(path.join(fixtureDir, "expected-summary.txt"), "utf8");

    expect(result.text).toBe(expected);
    expect(result.queryCount).toBe(7);
    expect(result.sections.map((s) => s.title)).toEqual([
      "Repository Overview",
      "Detected Domains",
      "Primary Entry Points",
      "Detected Architecture",
      "Dependency Highlights",
      "Relationship Highlights",
      "Compiler Confidence",
      "Statistics",
      "Evidence Summary",
      "Unknowns",
      "Limitations",
    ]);
    expect(result.text).toContain("Repository Overview");
    expect(result.text).toContain("Detected Domains");
    expect(result.text).toContain("Detected Architecture");
    expect(result.text).toContain("Primary Entry Points");
    expect(result.text).toContain("Dependency Highlights");
    expect(result.text).toContain("Relationship Highlights");
    expect(result.text).toContain("Compiler Confidence");
    expect(result.text).toContain("Evidence Summary");
    expect(result.text).toContain("Unknowns");
    expect(result.text).toContain("Limitations");
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("is reproducible across repeated runs", () => {
    const engine = loadEngine();
    const a = createUnderstandService(engine).summarize();
    const b = createUnderstandService(engine).summarize();
    expect(a.text).toBe(b.text);
    expect(a.sections).toEqual(b.sections);
    expect(a.confidence).toBe(b.confidence);
  });

  it("understandAsText returns the same report body", () => {
    const engine = loadEngine();
    const text = understandAsText(engine);
    const full = createUnderstandService(engine).summarize().text;
    expect(text).toBe(full);
  });

  it("uses only QueryEngine.execute and never requires ProjectModel APIs", () => {
    const real = loadEngine();
    const calls: string[] = [];
    const proxy: UnderstandEngine = {
      execute(query) {
        calls.push(query.type);
        return real.execute(query);
      },
    };
    const result = createUnderstandService(proxy).summarize();
    expect(calls).toEqual([
      "RepositorySummary",
      "ListDomains",
      "ListEntrypoints",
      "ListArchitectures",
      "ListDependencies",
      "ListRelationships",
      "Statistics",
    ]);
    expect(result.text.length).toBeGreaterThan(0);
    // sanity: proxy can answer the same Queries helpers
    expect(Queries.repositorySummary().type).toBe("RepositorySummary");
  });
});
