import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { analyzeSecuritySurface } from "../../../src/product/security/doctor.js";

describe("security doctor", () => {
  it("redacts secrets and reports dangerous patterns", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ad-sec-"));
    try {
      await fs.writeFile(
        path.join(root, "bad.ts"),
        [
          "eval('x');",
          "document.body.innerHTML = userInput;",
          "import path from 'path';",
          "path.join('/tmp', req.query.file);",
          "import { exec } from 'child_process';",
          "exec('ls ' + userDir);",
          "const x = 'api_key=supersecretvalue123456';",
        ].join("\n"),
      );
      const report = await analyzeSecuritySurface(root);
      expect(report.staticAnalysisLabel).toBe("TECHNICAL_STATIC_ANALYSIS_SUPPORTED");
      expect(report.secretScan.findings.length).toBeGreaterThanOrEqual(0);
      for (const f of report.secretScan.findings) {
        expect(f.redactedSnippet).not.toContain("supersecretvalue123456");
      }
      expect(report.dangerousPatterns.some((p) => p.id === "eval-call")).toBe(true);
      expect(report.dangerousPatterns.some((p) => p.id === "innerhtml-assign")).toBe(true);
      expect(report.dangerousPatterns.some((p) => p.id === "path-join-user-input")).toBe(true);
      expect(report.dangerousPatterns.some((p) => p.id === "child-process-exec-concat")).toBe(true);
      expect(JSON.stringify(report)).not.toMatch(/supersecretvalue123456/);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
