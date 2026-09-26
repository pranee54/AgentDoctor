import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { discoverOpenApiEndpoints } from "../../../src/product/api/openapi.js";

describe("openapi adapter", () => {
  it("reads paths from openapi.json", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ad-openapi-"));
    await fs.writeFile(
      path.join(root, "openapi.json"),
      JSON.stringify({
        openapi: "3.0.0",
        paths: {
          "/pets": { get: {}, post: {} },
        },
      }),
    );
    try {
      const { endpoints } = await discoverOpenApiEndpoints(root);
      expect(endpoints.some((e) => e.pathPattern === "/pets" && e.method === "GET")).toBe(true);
      expect(endpoints.some((e) => e.framework === "openapi" && e.truth === "VERIFIED")).toBe(true);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
