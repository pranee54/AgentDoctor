import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { analyzeTestBrain, mapTestsFromGraph } from "../../../src/product/testbrain/analyze.js";
import type { RepositoryGraph } from "../../../src/platform/types.js";

describe("Test Brain", () => {
  it("maps test imports to source files in graph", () => {
    const graph: RepositoryGraph = {
      root: "/tmp",
      generatedAt: new Date().toISOString(),
      nodes: [
        { id: "f1", kind: "test", label: "util.test.ts", path: "tests/util.test.ts" },
        {
          id: "d1",
          kind: "dependency",
          label: "../src/util",
          path: "tests/util.test.ts",
          meta: { specifier: "../src/util" },
        },
        { id: "f2", kind: "file", label: "util.ts", path: "src/util.ts" },
      ],
      edges: [{ id: "e1", from: "f1", to: "d1", kind: "imports", evidence: "verified" }],
      limitations: [],
    };
    const map = mapTestsFromGraph(graph);
    expect(map.get("src/util.ts")?.has("tests/util.test.ts")).toBe(true);
  });

  it("analyzeTestBrain returns impact and label", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ad-tb-"));
    try {
      await fs.mkdir(path.join(root, "src"), { recursive: true });
      await fs.mkdir(path.join(root, "tests"), { recursive: true });
      await fs.writeFile(
        path.join(root, "src", "math.ts"),
        "export function add(a: number, b: number) { return a + b; }\n",
      );
      await fs.writeFile(
        path.join(root, "tests", "math.test.ts"),
        "import { add } from '../src/math';\ntest('add', () => expect(add(1,2)).toBe(3));\n",
      );
      const report = await analyzeTestBrain({ root });
      expect(report.staticAnalysisLabel).toBe("TECHNICAL_STATIC_ANALYSIS_SUPPORTED");
      expect(report.testImpact).toBeDefined();
      expect(report.graphStats.testFileNodes).toBeGreaterThanOrEqual(1);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  }, 60_000);
});
