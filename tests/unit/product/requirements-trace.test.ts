import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { traceRequirements } from "../../../src/product/requirements/trace.js";

async function tempRepo(files: Record<string, string>): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "ad-req-"));
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(root, rel);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, content);
  }
  return root;
}

describe("requirements trace", () => {
  it("extracts requirements from markdown only", async () => {
    const root = await tempRepo({
      "REQUIREMENTS.md": "# REQ-1: Login\n\n- AC: User can sign in\n",
      "tests/login.test.ts": "export {};\n",
      "src/notes.md": "# Meeting notes\nNo requirements here.\n",
    });
    try {
      const report = await traceRequirements(root);
      expect(report.requirements.length).toBe(1);
      expect(report.requirements[0]?.title).toContain("Login");
      expect(report.requirements[0]?.truth).toBe("VERIFIED");
      expect(report.requirements[0]?.acceptanceCriteria[0]).toContain("sign in");
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
