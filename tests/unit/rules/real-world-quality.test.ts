import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { scan } from "../../../src/index.js";
import { matchIgnorePattern, relativizeIgnorePatterns } from "../../../src/core/rules/ignore.js";
import { detectMonorepo } from "../../../src/detectors/monorepo.js";
import { detectPackageManagers } from "../../../src/detectors/package-manager.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixturesRoot = path.resolve(here, "../../../fixtures");

describe("ignore pattern matching", () => {
  it("matches build/ at any directory level", () => {
    expect(matchIgnorePattern("mobile-apps/build", "build/")).toBe(true);
    expect(matchIgnorePattern("doctor-apps/build/", "build/")).toBe(true);
    expect(matchIgnorePattern("build", "build/")).toBe(true);
  });

  it("matches **/build/ nested paths", () => {
    expect(matchIgnorePattern("doctor-apps/build", "**/build/")).toBe(true);
  });

  it("relativizes nested gitignore patterns", () => {
    expect(relativizeIgnorePatterns("mobile-apps", ["build/"])).toEqual(["mobile-apps/build/"]);
  });
});

describe("context/generated-directory nested evidence", () => {
  it("does not flag nested build ignored by nested .gitignore", async () => {
    const result = await scan({
      cwd: path.join(fixturesRoot, "generated-nested-gitignore"),
    });
    const findings = result.findings.filter((f) => f.ruleId === "context/generated-directory");
    expect(findings.every((f) => f.evidence?.path !== "mobile-apps/build")).toBe(true);
    expect(findings.every((f) => f.evidence?.path !== "build")).toBe(true);
  });

  it("does not flag nested build ignored by root **/build/", async () => {
    const result = await scan({
      cwd: path.join(fixturesRoot, "generated-root-glob-ignore"),
    });
    const findings = result.findings.filter((f) => f.ruleId === "context/generated-directory");
    expect(findings).toHaveLength(0);
  });

  it("flags nested unignored build with exact evidence path", async () => {
    const result = await scan({
      cwd: path.join(fixturesRoot, "generated-nested-unignored"),
    });
    const findings = result.findings.filter((f) => f.ruleId === "context/generated-directory");
    expect(findings.some((f) => f.evidence?.path === "apps/build")).toBe(true);
    expect(findings.every((f) => f.evidence?.path !== "build")).toBe(true);
  });

  it("flags root unignored build/", async () => {
    const result = await scan({
      cwd: path.join(fixturesRoot, "generated-root-unignored"),
    });
    const findings = result.findings.filter((f) => f.ruleId === "context/generated-directory");
    expect(findings.some((f) => f.evidence?.path === "build")).toBe(true);
  });
});

describe("multi-app and package manager detection", () => {
  it("detects multi-project layout from Flutter + Laravel manifests", () => {
    const result = detectMonorepo({
      relativePaths: [
        "mobile-apps/pubspec.yaml",
        "doctor-apps/pubspec.yaml",
        "admin-panel/composer.json",
        "admin-panel/package.json",
      ],
    });
    expect(result.monorepo).toBe("multi-project");
  });

  it("detects composer, pub, and npm without preferring npm as primary", () => {
    const result = detectPackageManagers({
      relativePaths: [
        "mobile-apps/pubspec.yaml",
        "doctor-apps/pubspec.yaml",
        "admin-panel/composer.json",
        "admin-panel/package.json",
      ],
    });
    expect(result.packageManagers).toEqual(expect.arrayContaining(["composer", "pub", "npm"]));
    expect(result.primaryPackageManager).toBe("unknown");
  });

  it("scans multi-app fixture without malformed root package.json diagnostic", async () => {
    const result = await scan({
      cwd: path.join(fixturesRoot, "multi-app-flutter-laravel"),
    });
    expect(result.repository.monorepo).toBe("multi-project");
    expect(result.repository.packageManagers).toEqual(
      expect.arrayContaining(["composer", "pub", "npm"]),
    );
    expect(result.repository.primaryPackageManager).toBe("unknown");
    expect(result.diagnostics.warnings.every((d) => !d.includes("Malformed package.json"))).toBe(
      true,
    );
  });
});

describe("security/private-key-file credential-like names", () => {
  it("flags fake pem, der, and service-account filenames without printing contents", async () => {
    const result = await scan({
      cwd: path.join(fixturesRoot, "credential-files-project"),
    });
    const findings = result.findings.filter((f) => f.ruleId === "security/private-key-file");
    expect(findings.some((f) => f.evidence?.path === "app-signing.pem")).toBe(true);
    expect(findings.some((f) => f.evidence?.path === "app-signing.der")).toBe(true);
    expect(findings.some((f) => f.evidence?.path === "my-service-account.json")).toBe(true);
    expect(findings.every((f) => f.evidence?.path !== "config.local.php")).toBe(true);
    const json = JSON.stringify(result);
    expect(json).not.toContain("FAKE_TEST_CREDENTIAL_DO_NOT_USE");
    expect(json).not.toContain("FAKE_DER_BYTES_DO_NOT_USE");
  });
});
