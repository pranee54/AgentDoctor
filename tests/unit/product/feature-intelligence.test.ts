import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { analyzeFeatureIntelligence } from "../../../src/product/features/intelligence.js";

describe("feature intelligence", () => {
  it("marks zombie when doc-only FEATURE has no code hits", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ad-feat-"));
    try {
      await fs.writeFile(
        path.join(root, "package.json"),
        JSON.stringify({ name: "feat-fixture", private: true }),
        "utf8",
      );
      await fs.mkdir(path.join(root, "docs"), { recursive: true });
      await fs.writeFile(
        path.join(root, "docs", "features.md"),
        "# FEATURE: QuantumFluxPortal\n\nUndocumented in code.\n",
        "utf8",
      );
      const report = await analyzeFeatureIntelligence(root);
      const zombie = report.features.find((f) => f.title.includes("QuantumFluxPortal"));
      expect(zombie?.zombie).toBe(true);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("links code when tokens match source files", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ad-feat-"));
    try {
      await fs.writeFile(
        path.join(root, "package.json"),
        JSON.stringify({ name: "feat-fixture", private: true }),
        "utf8",
      );
      await fs.mkdir(path.join(root, "docs"), { recursive: true });
      await fs.writeFile(
        path.join(root, "docs", "requirements.md"),
        "## FEATURE: Billing Checkout\n",
        "utf8",
      );
      await fs.mkdir(path.join(root, "src", "services"), { recursive: true });
      await fs.writeFile(
        path.join(root, "src", "services", "billing-checkout.ts"),
        "export function billingCheckout() {}\n",
        "utf8",
      );
      const report = await analyzeFeatureIntelligence(root);
      const feat = report.features.find((f) => f.title.includes("Billing Checkout"));
      expect(feat?.zombie).toBe(false);
      expect(feat?.links.some((l) => l.layer === "service")).toBe(true);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
