import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { analyzePrivacySurface } from "../../../src/product/privacy/doctor.js";

describe("privacy doctor", () => {
  it("finds email-like patterns with redaction", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ad-privacy-"));
    try {
      await fs.writeFile(path.join(root, "contact.txt"), "reach us at user@example.com for info\n");
      const report = await analyzePrivacySurface(root);
      expect(report.limitations.some((l) => /not legal/i.test(l))).toBe(true);
      expect(report.findings.some((f) => f.id === "email-like")).toBe(true);
      expect(JSON.stringify(report)).not.toContain("user@example.com");
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
