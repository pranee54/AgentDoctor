import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { analyzeDatabaseSchema } from "../../../src/product/database/doctor.js";

describe("database doctor", () => {
  it("parses prisma models", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ad-db-"));
    await fs.mkdir(path.join(root, "prisma"), { recursive: true });
    await fs.writeFile(
      path.join(root, "prisma", "schema.prisma"),
      "model User {\n  id String @id\n}\n",
    );
    try {
      const report = await analyzeDatabaseSchema(root);
      expect(report.objects.some((o) => o.name === "User")).toBe(true);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
