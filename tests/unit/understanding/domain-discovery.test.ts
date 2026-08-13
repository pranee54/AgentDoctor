import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  domainForToken,
  tokenizeRelativePath,
} from "../../../src/core/understanding/shared/index.js";
import { discoverDomains, scoreDomainConfidence } from "../../../src/core/understanding/index.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtureRoot = path.resolve(here, "../../../fixtures/understanding-domains-project");

describe("understanding tokens", () => {
  it("splits camelCase and path segments while dropping stopwords", () => {
    expect(tokenizeRelativePath("src/payments/payment.service.ts")).toEqual([
      "payments",
      "payment",
    ]);
    expect(tokenizeRelativePath("src/auth/oauthService.ts")).toEqual(["auth", "oauth"]);
    expect(tokenizeRelativePath("src/utils/helpers.ts")).toEqual([]);
  });

  it("maps synonyms to canonical domains", () => {
    expect(domainForToken("invoice")).toBe("Payments");
    expect(domainForToken("oauth")).toBe("Auth");
    expect(domainForToken("profile")).toBe("Users");
    expect(domainForToken("helpers")).toBeUndefined();
  });
});

describe("domain confidence scoring", () => {
  it("increases with evidence and stays within 0–1", () => {
    expect(scoreDomainConfidence({ evidenceCount: 0, tokenHits: 0 })).toBe(0);
    const low = scoreDomainConfidence({ evidenceCount: 1, tokenHits: 1 });
    const high = scoreDomainConfidence({ evidenceCount: 5, tokenHits: 10 });
    expect(low).toBeGreaterThanOrEqual(0.5);
    expect(high).toBeGreaterThan(low);
    expect(high).toBeLessThanOrEqual(1);
  });
});

describe("discoverDomains", () => {
  it("returns structured domains with evidence paths for the fixture", async () => {
    const result = await discoverDomains({ cwd: fixtureRoot });

    expect(result.filesConsidered).toBeGreaterThan(0);
    expect(result.timingMs).toBeGreaterThanOrEqual(0);

    const names = result.domains.map((d) => d.name);
    expect(names).toEqual(expect.arrayContaining(["Payments", "Auth", "Users"]));

    const payments = result.domains.find((d) => d.name === "Payments");
    expect(payments).toBeDefined();
    expect(payments?.confidence).toBeGreaterThanOrEqual(0.5);
    expect(payments?.evidence).toEqual(
      expect.arrayContaining([
        "src/payments/invoice.controller.ts",
        "src/payments/payment.service.ts",
      ]),
    );

    const auth = result.domains.find((d) => d.name === "Auth");
    expect(auth?.evidence).toEqual(
      expect.arrayContaining(["src/auth/login.handler.ts", "src/auth/oauth.service.ts"]),
    );

    // Serializable JSON shape matches the engine contract.
    const json = JSON.parse(JSON.stringify({ domains: result.domains })) as {
      domains: Array<{ name: string; confidence: number; evidence: string[] }>;
    };
    expect(json.domains[0]).toMatchObject({
      name: expect.any(String),
      confidence: expect.any(Number),
      evidence: expect.any(Array),
    });
  });

  it("is deterministic across repeated runs", async () => {
    const a = await discoverDomains({ cwd: fixtureRoot });
    const b = await discoverDomains({ cwd: fixtureRoot });
    expect(a.domains).toEqual(b.domains);
  });

  it("respects minEvidence filter", async () => {
    const result = await discoverDomains({ cwd: fixtureRoot, minEvidence: 99 });
    expect(result.domains).toEqual([]);
  });
});
