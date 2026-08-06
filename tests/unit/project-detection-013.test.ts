import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { detectFrameworks } from "../../src/detectors/framework.js";
import { detectPackageManagers } from "../../src/detectors/package-manager.js";
import { scan } from "../../src/index.js";
import { renderTerminalReport } from "../../src/reporters/terminal/report.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixturesRoot = path.resolve(here, "../../fixtures");

describe("framework detection precision", () => {
  it("does not treat nested settings.py as Django", () => {
    const result = detectFrameworks({
      relativePaths: [
        "backend/pyproject.toml",
        "backend/app/main.py",
        "backend/app/api/v1/endpoints/settings.py",
      ],
      pythonDependencyNames: ["fastapi", "uvicorn"],
    });
    expect(result.frameworks).toContain("fastapi");
    expect(result.frameworks).not.toContain("django");
  });

  it("detects Django from manage.py + django dependency", () => {
    const result = detectFrameworks({
      relativePaths: ["manage.py", "mysite/settings.py", "pyproject.toml"],
      pythonDependencyNames: ["django"],
    });
    expect(result.frameworks).toContain("django");
  });

  it("requires FastAPI dependency plus app/main.py layout", () => {
    expect(
      detectFrameworks({
        relativePaths: ["app/main.py"],
        pythonDependencyNames: [],
      }).frameworks,
    ).not.toContain("fastapi");

    expect(
      detectFrameworks({
        relativePaths: ["backend/app/main.py", "backend/pyproject.toml"],
        pythonDependencyNames: ["fastapi"],
      }).frameworks,
    ).toContain("fastapi");
  });

  it("detects React from nested package.json dependencies", () => {
    const result = detectFrameworks({
      relativePaths: ["admin-panel/package.json", "admin-panel/src/App.jsx"],
      packageJsonDependencies: { react: "^18.3.1", "react-dom": "^18.3.1", vite: "^6.4.3" },
    });
    expect(result.frameworks).toContain("react");
    expect(result.primaryFramework).toBe("react");
  });
});

describe("package manager poetry precision", () => {
  it("does not infer Poetry from bare hatchling pyproject.toml", () => {
    const result = detectPackageManagers({
      relativePaths: ["backend/pyproject.toml"],
      poetryToolDetected: false,
      genericPyprojectDetected: true,
    });
    expect(result.packageManagers).toContain("pip");
    expect(result.packageManagers).not.toContain("poetry");
  });

  it("detects Poetry from poetry.lock / [tool.poetry]", () => {
    expect(
      detectPackageManagers({
        relativePaths: ["pyproject.toml", "poetry.lock"],
        poetryToolDetected: true,
      }).packageManagers,
    ).toContain("poetry");

    expect(
      detectPackageManagers({
        relativePaths: ["pyproject.toml"],
        poetryToolDetected: true,
      }).packageManagers,
    ).toContain("poetry");
  });

  it("detects pip from requirements.txt", () => {
    const result = detectPackageManagers({
      relativePaths: ["requirements.txt"],
    });
    expect(result.packageManagers).toContain("pip");
    expect(result.primaryPackageManager).toBe("pip");
  });

  it("mixed Flutter + Python + npm does not invent a primary manager", () => {
    const result = detectPackageManagers({
      relativePaths: ["mobile/pubspec.yaml", "backend/pyproject.toml", "admin-panel/package.json"],
      genericPyprojectDetected: true,
    });
    expect(result.packageManagers).toEqual(expect.arrayContaining(["pub", "pip", "npm"]));
    expect(result.primaryPackageManager).toBe("unknown");
  });
});

describe("excepta multi-stack fixture", () => {
  it("detects FastAPI + React + Flutter without Django or Poetry", async () => {
    const result = await scan({ cwd: path.join(fixturesRoot, "excepta") });
    expect(result.repository.monorepo).toBe("multi-project");
    expect(result.repository.frameworks).toEqual(
      expect.arrayContaining(["fastapi", "react", "flutter"]),
    );
    expect(result.repository.frameworks).not.toContain("django");
    expect(result.repository.packageManagers).toEqual(
      expect.arrayContaining(["pip", "npm", "pub", "gradle"]),
    );
    expect(result.repository.packageManagers).not.toContain("poetry");
    expect(result.repository.languages).toEqual(
      expect.arrayContaining(["python", "dart", "javascript"]),
    );
    expect(result.agentSecurityAnalysis).toBe("limited");

    const env = result.findings.filter((f) => f.ruleId === "security/env-file-exposure");
    expect(env.some((f) => f.evidence?.path === "backend/.env" && f.severity === "critical")).toBe(
      true,
    );
    expect(
      env.some((f) => f.evidence?.path === "backend/.env.example" && f.severity === "info"),
    ).toBe(true);
    expect(env.every((f) => f.affectedAgents.length === 0)).toBe(true);

    const terminal = renderTerminalReport(result);
    expect(terminal).toMatch(/Languages:/);
    expect(terminal).toMatch(/Frameworks:/);
    expect(terminal).toMatch(/FastAPI/);
    expect(terminal).toMatch(/React/);
    expect(terminal).toMatch(/Flutter/);
    expect(terminal).toMatch(/Package managers:/);
    expect(terminal).not.toMatch(/Framework: Django/);
  });

  it("preserves genuine Django fixture detection", async () => {
    const result = await scan({ cwd: path.join(fixturesRoot, "django-project") });
    expect(result.repository.frameworks).toContain("django");
    expect(result.repository.frameworks).not.toContain("fastapi");
  });

  it("preserves Poetry fixture detection", async () => {
    const result = await scan({ cwd: path.join(fixturesRoot, "poetry-project") });
    expect(result.repository.packageManagers).toContain("poetry");
  });
});
