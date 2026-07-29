import type { LanguageId } from "../types/index.js";

const LANGUAGE_MARKERS: Array<{ language: LanguageId; files: string[]; extensions: string[] }> = [
  {
    language: "typescript",
    files: ["tsconfig.json", "tsconfig.base.json"],
    extensions: [".ts", ".tsx", ".mts", ".cts"],
  },
  {
    language: "javascript",
    files: ["jsconfig.json", "package.json"],
    extensions: [".js", ".jsx", ".mjs", ".cjs"],
  },
  {
    language: "python",
    files: ["pyproject.toml", "requirements.txt", "setup.py", "Pipfile"],
    extensions: [".py"],
  },
  {
    language: "dart",
    files: ["pubspec.yaml"],
    extensions: [".dart"],
  },
  {
    language: "php",
    files: ["composer.json"],
    extensions: [".php"],
  },
  {
    language: "go",
    files: ["go.mod", "go.work"],
    extensions: [".go"],
  },
  {
    language: "rust",
    files: ["Cargo.toml"],
    extensions: [".rs"],
  },
  {
    language: "java",
    files: ["pom.xml", "build.gradle", "build.gradle.kts"],
    extensions: [".java"],
  },
  {
    language: "kotlin",
    files: ["build.gradle.kts"],
    extensions: [".kt", ".kts"],
  },
];

export interface LanguageDetectionInput {
  relativePaths: string[];
}

export interface LanguageDetectionResult {
  languages: LanguageId[];
  primaryLanguage: LanguageId;
}

function hasExtension(filePath: string, extensions: string[]): boolean {
  const lower = filePath.toLowerCase();
  return extensions.some((ext) => lower.endsWith(ext));
}

/**
 * Detect languages from known marker files and source extensions.
 * TypeScript is preferred over JavaScript when both appear.
 */
export function detectLanguages(input: LanguageDetectionInput): LanguageDetectionResult {
  const pathSet = new Set(input.relativePaths.map((p) => p.toLowerCase()));
  const basenameSet = new Set(
    input.relativePaths.map((p) => {
      const parts = p.split("/");
      return (parts[parts.length - 1] ?? p).toLowerCase();
    }),
  );

  const scores = new Map<LanguageId, number>();

  for (const marker of LANGUAGE_MARKERS) {
    let score = 0;
    for (const file of marker.files) {
      if (basenameSet.has(file.toLowerCase()) || pathSet.has(file.toLowerCase())) {
        score += 10;
      }
    }
    for (const relative of input.relativePaths) {
      if (hasExtension(relative, marker.extensions)) {
        score += 1;
      }
    }
    if (score > 0) {
      scores.set(marker.language, score);
    }
  }

  // Prefer TypeScript over JavaScript when both present with TS markers.
  if (scores.has("typescript") && scores.has("javascript")) {
    const jsScore = scores.get("javascript") ?? 0;
    // package.json alone shouldn't claim JS over TS
    if ((scores.get("typescript") ?? 0) >= 10) {
      scores.set("javascript", Math.min(jsScore, 5));
    }
  }

  const ordered = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  const languages = ordered.map(([lang]) => lang);

  let primaryLanguage: LanguageId = languages[0] ?? "unknown";

  // Explicit preference: TS > JS when both detected with meaningful scores
  if (languages.includes("typescript") && languages.includes("javascript")) {
    primaryLanguage = "typescript";
  }

  return {
    languages: languages.length > 0 ? languages : ["unknown"],
    primaryLanguage,
  };
}

export function formatLanguage(language: LanguageId): string {
  switch (language) {
    case "typescript":
      return "TypeScript";
    case "javascript":
      return "JavaScript";
    case "python":
      return "Python";
    case "dart":
      return "Dart";
    case "php":
      return "PHP";
    case "go":
      return "Go";
    case "rust":
      return "Rust";
    case "java":
      return "Java";
    case "kotlin":
      return "Kotlin";
    default:
      return "Unknown";
  }
}
