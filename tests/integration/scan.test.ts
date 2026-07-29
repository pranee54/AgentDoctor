import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { scan } from "../../src/index.js";
import { renderJsonReport } from "../../src/reporters/json/report.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixturesRoot = path.resolve(here, "../../fixtures");

describe("scan integration", () => {
  it("detects Express + TypeScript on clean-project", async () => {
    const result = await scan({ cwd: path.join(fixturesRoot, "clean-project") });
    expect(result.repository.primaryLanguage).toBe("typescript");
    expect(result.repository.primaryFramework).toBe("express");
    expect(result.repository.primaryPackageManager).toBe("npm");
    expect(result.repository.filesScanned).toBeGreaterThan(0);
    expect(result.findings).toEqual([]);
    expect(result.version).toBe("0.1.0-beta");
    expect(result.scoringAvailable).toBe(false);
  });

  it("detects Next.js on nextjs-project", async () => {
    const result = await scan({ cwd: path.join(fixturesRoot, "nextjs-project") });
    expect(result.repository.primaryFramework).toBe("nextjs");
    expect(result.repository.languages).toContain("typescript");
  });

  it("detects turborepo monorepo", async () => {
    const result = await scan({ cwd: path.join(fixturesRoot, "monorepo-project") });
    expect(result.repository.monorepo).toBe("turborepo");
    expect(result.repository.primaryPackageManager).toBe("pnpm");
  });

  it("json report is valid JSON without decorative fields", async () => {
    const result = await scan({ cwd: path.join(fixturesRoot, "clean-project") });
    const json = renderJsonReport(result);
    expect(() => JSON.parse(json)).not.toThrow();
    expect(json.includes("█")).toBe(false);
    expect(json.includes("🩺")).toBe(false);
  });
});
