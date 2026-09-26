import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  assertForensicReadOnly,
  ForensicWriteRefusedError,
  runForensicAnalysis,
} from "../../../src/product/forensic/mode.js";

describe("forensic mode", () => {
  it("refuses writes when forensic", () => {
    expect(() => assertForensicReadOnly(true)).toThrow(ForensicWriteRefusedError);
    expect(() => assertForensicReadOnly(false)).not.toThrow();
  });

  it("runs read-only analysis", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ad-for-"));
    await fs.writeFile(path.join(root, "package.json"), "{}");
    try {
      const report = await runForensicAnalysis(root);
      expect(report.mode).toBe("read-only");
      expect(report.findings.length).toBeGreaterThan(0);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
