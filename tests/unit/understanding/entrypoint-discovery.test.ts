import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  discoverEntrypoints,
  scoreEntrypointConfidence,
} from "../../../src/core/understanding/index.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtureRoot = path.resolve(here, "../../../fixtures/understanding-entrypoints-project");

describe("scoreEntrypointConfidence", () => {
  it("returns null when a signal is required but missing", () => {
    expect(
      scoreEntrypointConfidence({
        pathConfidence: 0.6,
        signalBoost: 0.1,
        signalHits: 0,
        requireSignal: true,
      }),
    ).toBeNull();
  });

  it("boosts confidence with content signals", () => {
    const base = scoreEntrypointConfidence({
      pathConfidence: 0.7,
      signalBoost: 0.1,
      signalHits: 0,
      requireSignal: false,
    });
    const boosted = scoreEntrypointConfidence({
      pathConfidence: 0.7,
      signalBoost: 0.1,
      signalHits: 2,
      requireSignal: false,
    });
    expect(base).toBe(0.7);
    expect(boosted).toBe(0.9);
  });
});

describe("discoverEntrypoints", () => {
  it("finds multi-ecosystem entrypoints in a monorepo fixture", async () => {
    const result = await discoverEntrypoints({ cwd: fixtureRoot });

    expect(result.filesConsidered).toBeGreaterThan(0);
    expect(result.entrypoints.length).toBeGreaterThanOrEqual(10);

    const byFramework = Object.fromEntries(
      [...new Set(result.entrypoints.map((e) => e.framework))].map((framework) => [
        framework,
        result.entrypoints.filter((e) => e.framework === framework),
      ]),
    );

    expect(byFramework.Flutter?.[0]?.file).toBe("apps/mobile/lib/main.dart");
    expect(byFramework.Flutter?.[0]?.evidence).toEqual(
      expect.arrayContaining(["runApp()", "MaterialApp"]),
    );

    expect(byFramework.Laravel?.some((e) => e.file.endsWith("routes/web.php"))).toBe(true);
    expect(byFramework.Laravel?.some((e) => e.file.endsWith("artisan"))).toBe(true);

    expect(byFramework.React?.some((e) => e.file.endsWith("main.tsx"))).toBe(true);
    expect(byFramework.React?.[0]?.evidence).toEqual(
      expect.arrayContaining(["ReactDOM.createRoot()"]),
    );

    expect(byFramework["Next.js"]?.some((e) => e.file.includes("app/layout.tsx"))).toBe(true);
    expect(byFramework.Node?.some((e) => e.file.endsWith("server.ts"))).toBe(true);
    expect(byFramework.NestJS?.some((e) => e.file.endsWith("main.ts"))).toBe(true);
    expect(byFramework.Python?.some((e) => e.file.endsWith("app.py"))).toBe(true);
    expect(byFramework.Django?.some((e) => e.file.endsWith("manage.py"))).toBe(true);
    expect(byFramework.Java?.some((e) => e.file.endsWith("DemoApplication.java"))).toBe(true);
    expect(byFramework.Go?.some((e) => e.file.endsWith("main.go"))).toBe(true);
    expect(byFramework.Rust?.some((e) => e.file.endsWith("main.rs"))).toBe(true);

    // Generic package index without server signals must not be guessed.
    expect(result.entrypoints.some((e) => e.file.includes("packages/utils"))).toBe(false);

    const json = JSON.parse(JSON.stringify({ entrypoints: result.entrypoints })) as {
      entrypoints: Array<{
        framework: string;
        file: string;
        confidence: number;
        evidence: string[];
      }>;
    };
    expect(json.entrypoints[0]).toMatchObject({
      framework: expect.any(String),
      file: expect.any(String),
      confidence: expect.any(Number),
      evidence: expect.any(Array),
    });
  });

  it("is deterministic across repeated runs", async () => {
    const a = await discoverEntrypoints({ cwd: fixtureRoot });
    const b = await discoverEntrypoints({ cwd: fixtureRoot });
    expect(a.entrypoints).toEqual(b.entrypoints);
  });

  it("never emits an entrypoint with empty evidence", async () => {
    const result = await discoverEntrypoints({ cwd: fixtureRoot });
    for (const entry of result.entrypoints) {
      expect(entry.evidence.length).toBeGreaterThan(0);
      expect(entry.confidence).toBeGreaterThan(0);
    }
  });
});
