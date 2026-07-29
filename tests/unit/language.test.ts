import { describe, expect, it } from "vitest";

import { detectLanguages } from "../../src/detectors/language.js";

describe("detectLanguages", () => {
  it("detects TypeScript from tsconfig and .ts files", () => {
    const result = detectLanguages({
      relativePaths: ["tsconfig.json", "src/index.ts", "src/util.ts"],
    });
    expect(result.primaryLanguage).toBe("typescript");
    expect(result.languages).toContain("typescript");
  });

  it("detects Python from requirements.txt", () => {
    const result = detectLanguages({
      relativePaths: ["requirements.txt", "app/main.py"],
    });
    expect(result.primaryLanguage).toBe("python");
  });

  it("detects Go from go.mod", () => {
    const result = detectLanguages({
      relativePaths: ["go.mod", "cmd/main.go"],
    });
    expect(result.primaryLanguage).toBe("go");
  });

  it("returns unknown when no markers exist", () => {
    const result = detectLanguages({ relativePaths: ["README.md"] });
    expect(result.primaryLanguage).toBe("unknown");
  });

  it("prefers TypeScript over JavaScript when both present", () => {
    const result = detectLanguages({
      relativePaths: ["tsconfig.json", "package.json", "src/a.ts", "src/b.js"],
    });
    expect(result.primaryLanguage).toBe("typescript");
  });
});
