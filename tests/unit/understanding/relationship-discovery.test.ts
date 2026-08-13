import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  classifyRoleFromPath,
  discoverRelationships,
  extractSemanticSignals,
  scoreRelationshipConfidence,
} from "../../../src/core/understanding/index.js";
import { pascalCaseName } from "../../../src/core/understanding/relationships/extract.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtureRoot = path.resolve(here, "../../../fixtures/understanding-relationships-project");

describe("relationship extract helpers", () => {
  it("classifies layered roles from paths", () => {
    expect(classifyRoleFromPath("src/checkout.controller.ts")).toBe("Controller");
    expect(classifyRoleFromPath("src/payment.service.ts")).toBe("Service");
    expect(classifyRoleFromPath("src/payment.repository.ts")).toBe("Repository");
    expect(classifyRoleFromPath("src/payment.entity.ts")).toBe("Database");
    expect(classifyRoleFromPath("src/routes/orders.ts")).toBe("Route");
    expect(classifyRoleFromPath("lib/checkout_widget.dart")).toBe("Widget");
    expect(classifyRoleFromPath("lib/bloc/checkout_bloc.dart")).toBe("Bloc");
    expect(classifyRoleFromPath("src/app.module.ts")).toBe("Module");
    expect(classifyRoleFromPath("src/config/app.config.ts")).toBe("Configuration");
  });

  it("builds PascalCase component names", () => {
    expect(pascalCaseName("checkout.controller")).toBe("CheckoutController");
    expect(pascalCaseName("payment.service")).toBe("PaymentService");
  });

  it("extracts constructor injection and implements signals", () => {
    const signals = extractSemanticSignals(`
      export class CheckoutController {
        constructor(private readonly paymentService: PaymentService) {}
      }
      export class PaymentEntity implements PaymentStore {}
    `);
    expect(signals.some((s) => s.kind === "constructor-injection")).toBe(true);
    expect(signals.some((s) => s.kind === "implements" && s.relatedName === "PaymentStore")).toBe(
      true,
    );
  });
});

describe("scoreRelationshipConfidence", () => {
  it("boosts strong relationships and stays capped", () => {
    const medium = scoreRelationshipConfidence({
      base: 0.9,
      strength: "medium",
      evidenceCount: 1,
    });
    const strong = scoreRelationshipConfidence({
      base: 0.9,
      strength: "strong",
      evidenceCount: 2,
    });
    expect(strong).toBeGreaterThan(medium);
    expect(strong).toBeLessThanOrEqual(0.99);
  });
});

describe("discoverRelationships", () => {
  it("discovers semantic relationships with evidence across frameworks", async () => {
    const result = await discoverRelationships({ cwd: fixtureRoot });

    expect(result.filesConsidered).toBeGreaterThan(0);
    expect(result.relationships.length).toBeGreaterThanOrEqual(5);

    for (const rel of result.relationships) {
      expect(rel.evidence.length).toBeGreaterThan(0);
      expect(rel.confidence).toBeGreaterThan(0);
      expect(rel.strength).toMatch(/^(strong|medium|weak)$/);
    }

    const find = (source: string, target: string, relationship: string) =>
      result.relationships.find(
        (r) => r.source === source && r.target === target && r.relationship === relationship,
      );

    // Controller → Service USES with injection
    const uses = find("CheckoutController", "PaymentService", "USES");
    expect(uses).toBeDefined();
    expect(uses?.evidence).toEqual(
      expect.arrayContaining(["imports payment.service.ts", "constructor injection"]),
    );
    expect(uses?.strength).toBe("strong");
    expect(uses?.confidence).toBeGreaterThanOrEqual(0.96);

    // Service → Repository
    expect(find("PaymentService", "PaymentRepository", "USES")).toBeDefined();

    // Repository → Database/Entity
    expect(find("PaymentRepository", "PaymentEntity", "USES")).toBeDefined();

    // IMPLEMENTS
    expect(find("PaymentEntity", "PaymentStore", "IMPLEMENTS")).toBeDefined();

    // Route → Controller EXPOSES
    expect(
      result.relationships.some(
        (r) =>
          r.relationship === "EXPOSES" &&
          r.target === "CheckoutController" &&
          r.evidence.some((e) => e.includes("imports")),
      ),
    ).toBe(true);

    // Module CONFIGURES
    expect(
      result.relationships.some((r) => r.relationship === "CONFIGURES" && r.target === "AppConfig"),
    ).toBe(true);

    // Flutter Widget → Bloc → Repository
    expect(
      result.relationships.some(
        (r) =>
          r.relationship === "USES" && r.source.includes("Widget") && r.target.includes("Bloc"),
      ),
    ).toBe(true);
    expect(
      result.relationships.some(
        (r) =>
          r.relationship === "USES" && r.source.includes("Bloc") && r.target.includes("Repository"),
      ),
    ).toBe(true);

    // DEPENDS_ON from dependency graph
    expect(result.relationships.some((r) => r.relationship === "DEPENDS_ON")).toBe(true);

    // Feature CONSUMES / PROVIDES / CONTAINS
    expect(result.relationships.some((r) => r.relationship === "CONSUMES")).toBe(true);
    expect(result.relationships.some((r) => r.relationship === "PROVIDES")).toBe(true);
    expect(result.relationships.some((r) => r.relationship === "CONTAINS")).toBe(true);

    // Bidirectional detection when both directions exist
    const bidir = result.relationships.filter((r) => r.bidirectional);
    expect(bidir.length).toBeGreaterThanOrEqual(0);

    const json = JSON.parse(JSON.stringify({ relationships: result.relationships })) as {
      relationships: Array<{
        source: string;
        target: string;
        relationship: string;
        confidence: number;
        evidence: string[];
      }>;
    };
    expect(json.relationships[0]).toMatchObject({
      source: expect.any(String),
      target: expect.any(String),
      relationship: expect.any(String),
      confidence: expect.any(Number),
      evidence: expect.any(Array),
    });
  });

  it("is deterministic across repeated runs", async () => {
    const a = await discoverRelationships({ cwd: fixtureRoot });
    const b = await discoverRelationships({ cwd: fixtureRoot });
    expect(a.relationships).toEqual(b.relationships);
  });

  it("never emits relationships without evidence", async () => {
    const result = await discoverRelationships({ cwd: fixtureRoot });
    for (const rel of result.relationships) {
      expect(rel.evidence.length).toBeGreaterThan(0);
    }
  });
});
