import { describe, expect, it } from "vitest";

import { detectPackageManagers } from "../../src/detectors/package-manager.js";
import { detectMonorepo } from "../../src/detectors/monorepo.js";

describe("detectPackageManagers", () => {
  it("prefers pnpm when pnpm-lock.yaml exists", () => {
    const result = detectPackageManagers({
      relativePaths: ["package.json", "pnpm-lock.yaml"],
    });
    expect(result.primaryPackageManager).toBe("pnpm");
  });

  it("detects npm from package-lock.json", () => {
    const result = detectPackageManagers({
      relativePaths: ["package.json", "package-lock.json"],
    });
    expect(result.primaryPackageManager).toBe("npm");
  });

  it("falls back to npm when only package.json exists", () => {
    const result = detectPackageManagers({
      relativePaths: ["package.json"],
    });
    expect(result.primaryPackageManager).toBe("npm");
  });
});

describe("detectMonorepo", () => {
  it("detects turborepo", () => {
    expect(detectMonorepo({ relativePaths: ["turbo.json"] }).monorepo).toBe("turborepo");
  });

  it("detects pnpm workspaces", () => {
    expect(detectMonorepo({ relativePaths: ["pnpm-workspace.yaml"] }).monorepo).toBe(
      "pnpm-workspaces",
    );
  });

  it("detects npm workspaces from package.json", () => {
    expect(
      detectMonorepo({
        relativePaths: ["package.json"],
        packageJsonWorkspaces: ["packages/*"],
      }).monorepo,
    ).toBe("npm-workspaces");
  });

  it("returns none by default", () => {
    expect(detectMonorepo({ relativePaths: ["package.json"] }).monorepo).toBe("none");
  });
});
