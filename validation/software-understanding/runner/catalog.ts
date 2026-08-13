import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { BenchmarkCase } from "../types.js";

const here = path.dirname(fileURLToPath(import.meta.url));
export const VALIDATION_ROOT = path.resolve(here, "..");

const FRAMEWORKS = [
  "flutter",
  "laravel",
  "react",
  "next",
  "node",
  "python",
  "go",
  "java",
  "rust",
] as const;

export function listBenchmarkCases(): BenchmarkCase[] {
  return FRAMEWORKS.map((framework) => ({
    id: framework,
    framework,
    repoRoot: path.join(VALIDATION_ROOT, "frameworks", framework, "repo"),
    expectedPath: path.join(VALIDATION_ROOT, "expected", `${framework}.json`),
  }));
}

export function ensureReportsDir(): string {
  const reportsDir = path.join(VALIDATION_ROOT, "reports");
  fs.mkdirSync(reportsDir, { recursive: true });
  return reportsDir;
}
