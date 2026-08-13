import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  discoverDependencies,
  extractReferences,
  scoreDependencyConfidence,
} from "../../../src/core/understanding/index.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtureRoot = path.resolve(here, "../../../fixtures/understanding-dependencies-project");

describe("extractReferences", () => {
  it("extracts static, require, and dynamic imports from JS", () => {
    const refs = extractReferences(
      "src/a.ts",
      `
        import { x } from "./b";
        export { y } from "./c";
        const z = require("./d");
        const w = import("./e");
      `,
    );
    const types = refs.map((r) => r.type).sort();
    expect(types).toEqual(["dynamic-import", "export", "import", "require"]);
  });

  it("extracts Dart imports and exports", () => {
    const refs = extractReferences("lib/a.dart", `import 'payments.dart';\nexport 'other.dart';`);
    expect(refs.map((r) => r.specifier)).toEqual(["payments.dart", "other.dart"]);
  });
});

describe("scoreDependencyConfidence", () => {
  it("assigns lower confidence to dynamic imports", () => {
    expect(scoreDependencyConfidence("import")).toBeGreaterThan(
      scoreDependencyConfidence("dynamic-import"),
    );
  });
});

describe("discoverDependencies", () => {
  it("discovers multi-language structural dependencies with evidence", async () => {
    const result = await discoverDependencies({ cwd: fixtureRoot });

    expect(result.filesConsidered).toBeGreaterThan(0);
    expect(result.dependencies.length).toBeGreaterThanOrEqual(5);

    for (const dep of result.dependencies) {
      expect(dep.evidence.length).toBeGreaterThan(0);
      expect(dep.confidence).toBeGreaterThan(0);
    }

    const pair = (from: string, to: string) =>
      result.dependencies.filter((d) => d.from === from && d.to === to);

    // Monorepo package cycle Checkout ↔ Payments
    expect(pair("Checkout", "Payments").length).toBeGreaterThan(0);
    expect(pair("Payments", "Checkout").length).toBeGreaterThan(0);

    const checkoutToPayments = pair("Checkout", "Payments");
    expect(checkoutToPayments.some((d) => d.type === "import" || d.type === "package")).toBe(true);
    expect(
      checkoutToPayments.some((d) =>
        d.evidence.some((e) => e.includes("imports") || e.includes("declares dependency")),
      ),
    ).toBe(true);

    // Dynamic import recorded separately
    expect(
      result.dependencies.some(
        (d) => d.type === "dynamic-import" && d.from === "Payments" && d.to === "Checkout",
      ),
    ).toBe(true);

    // Controller → service classification
    expect(
      result.dependencies.some(
        (d) =>
          d.from === "Checkout" &&
          d.type === "service" &&
          d.evidence.some((e) => e.includes("controller")),
      ),
    ).toBe(true);

    // Repository usage
    expect(result.dependencies.some((d) => d.type === "repository")).toBe(true);

    // Route reference
    expect(
      result.dependencies.some(
        (d) => d.type === "route" && d.evidence.some((e) => e.includes("routes/")),
      ),
    ).toBe(true);

    // Dart relative import
    expect(
      result.dependencies.some((d) =>
        d.evidence.some((e) => e.includes("checkout_page.dart") && e.includes("payments.dart")),
      ),
    ).toBe(true);

    // Go module import
    expect(
      result.dependencies.some((d) =>
        d.evidence.some((e) => e.includes("main.go") && e.includes("payments")),
      ),
    ).toBe(true);

    // Python import
    expect(
      result.dependencies.some((d) =>
        d.evidence.some((e) => e.includes("python/checkout/app.py") && e.includes("charge.py")),
      ),
    ).toBe(true);

    // Java import
    expect(
      result.dependencies.some((d) =>
        d.evidence.some(
          (e) => e.includes("CheckoutController.java") && e.includes("PaymentService.java"),
        ),
      ),
    ).toBe(true);

    // Rust use/module
    expect(
      result.dependencies.some((d) =>
        d.evidence.some((e) => e.includes("main.rs") && e.includes("payments")),
      ),
    ).toBe(true);

    // Never guess: no evidence-less rows; JSON shape matches contract
    const json = JSON.parse(JSON.stringify({ dependencies: result.dependencies })) as {
      dependencies: Array<{
        from: string;
        to: string;
        type: string;
        confidence: number;
        evidence: string[];
      }>;
    };
    expect(json.dependencies[0]).toMatchObject({
      from: expect.any(String),
      to: expect.any(String),
      type: expect.any(String),
      confidence: expect.any(Number),
      evidence: expect.any(Array),
    });
  });

  it("is deterministic across repeated runs", async () => {
    const a = await discoverDependencies({ cwd: fixtureRoot });
    const b = await discoverDependencies({ cwd: fixtureRoot });
    expect(a.dependencies).toEqual(b.dependencies);
  });

  it("does not invent edges for unresolved external packages", async () => {
    const result = await discoverDependencies({ cwd: fixtureRoot });
    expect(
      result.dependencies.some((d) =>
        d.evidence.some((e) => /express|lodash|react-dom/i.test(e) && !e.includes("@acme")),
      ),
    ).toBe(false);
  });
});
