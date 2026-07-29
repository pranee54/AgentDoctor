import { describe, expect, it } from "vitest";

import { detectFrameworks } from "../../src/detectors/framework.js";

describe("detectFrameworks", () => {
  it("detects Next.js from next dependency and config", () => {
    const result = detectFrameworks({
      relativePaths: ["package.json", "next.config.mjs", "app/page.tsx"],
      packageJsonDependencies: { next: "^15.0.0", react: "^19.0.0" },
    });
    expect(result.primaryFramework).toBe("nextjs");
    expect(result.frameworks).toContain("nextjs");
  });

  it("detects Express from dependency", () => {
    const result = detectFrameworks({
      relativePaths: ["package.json", "src/index.ts"],
      packageJsonDependencies: { express: "^4.0.0" },
    });
    expect(result.primaryFramework).toBe("express");
  });

  it("detects Laravel from artisan + composer require", () => {
    const result = detectFrameworks({
      relativePaths: ["artisan", "composer.json"],
      composerJsonRequire: { "laravel/framework": "^11.0" },
    });
    expect(result.primaryFramework).toBe("laravel");
  });

  it("returns unknown when nothing matches", () => {
    const result = detectFrameworks({
      relativePaths: ["README.md"],
    });
    expect(result.primaryFramework).toBe("unknown");
  });
});
