import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { StudentService } from "../../src/agent/student.js";
import { MockModelProvider } from "../../src/ai/index.js";

describe("E2E student learn flow", () => {
  it("explainProject and viva questions on fixture", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ad-e2e-student-"));
    await fs.mkdir(path.join(root, "src"), { recursive: true });
    await fs.writeFile(
      path.join(root, "package.json"),
      JSON.stringify({ name: "student-fixture", dependencies: { react: "18.0.0" } }),
    );
    await fs.writeFile(path.join(root, "src", "app.ts"), "export const app = 1;\n");
    await fs.writeFile(path.join(root, "README.md"), "# Student fixture\n");

    const student = new StudentService({ root, provider: new MockModelProvider() });
    try {
      const explain = await student.explainProject();
      expect(explain.sections.some((s) => s.id === "purpose")).toBe(true);
      expect(explain.sections.some((s) => s.body.includes("react"))).toBe(true);
      const viva = await student.generateVivaQuestions();
      expect(viva.length).toBeGreaterThan(2);
    } finally {
      await student.end();
      await fs.rm(root, { recursive: true, force: true });
    }
  }, 60_000);
});
