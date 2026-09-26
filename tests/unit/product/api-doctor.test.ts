import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { analyzeApiSurface } from "../../../src/product/api/doctor.js";

describe("api doctor", () => {
  it("finds express routes with evidence", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ad-api-"));
    await fs.mkdir(path.join(root, "src"), { recursive: true });
    await fs.writeFile(
      path.join(root, "src", "routes.ts"),
      "import express from 'express';\nconst app = express();\napp.get('/health', () => {});\n",
    );
    try {
      const report = await analyzeApiSurface(root);
      expect(report.endpoints.some((e) => e.pathPattern === "/health")).toBe(true);
      expect(report.endpoints[0]?.evidence[0]?.line).toBeGreaterThan(0);
      expect(report.limitations.length).toBeGreaterThan(0);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("finds GraphQL Query SDL and gql templates with evidence", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ad-api-gql-"));
    await fs.mkdir(path.join(root, "src", "graphql"), { recursive: true });
    await fs.writeFile(
      path.join(root, "schema.graphql"),
      "type Query {\n  health: String\n}\n",
      "utf8",
    );
    await fs.writeFile(
      path.join(root, "src", "graphql", "queries.ts"),
      "import gql from 'graphql-tag';\nexport const GET = gql`\n  query GetHealth { health }\n`;\n",
      "utf8",
    );
    try {
      const report = await analyzeApiSurface(root);
      expect(
        report.endpoints.some((e) => e.framework === "graphql-sdl" && e.pathPattern === "Query"),
      ).toBe(true);
      expect(
        report.endpoints.some(
          (e) => e.framework === "graphql-tag" && e.pathPattern === "GetHealth",
        ),
      ).toBe(true);
      expect(report.limitations.some((l) => /GraphQL schema extraction \(PARTIAL\)/i.test(l))).toBe(
        true,
      );
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
