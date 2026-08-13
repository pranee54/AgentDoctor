import { RELATION_CONFIDENCE, extensionOf, isSourceFile } from "./models.js";
import type { DependencyRelationType, ExtractedReference } from "./types.js";

const STRING = `["'\`]([^"'\`]+)["'\`]`;

function pushUnique(
  out: ExtractedReference[],
  specifier: string,
  type: DependencyRelationType,
): void {
  const trimmed = specifier.trim();
  if (!trimmed || trimmed.startsWith("node:") || trimmed === ".") {
    return;
  }
  // Skip bare relative current-dir noise without a path
  if (trimmed === "./" || trimmed === "../") {
    return;
  }
  out.push({
    specifier: trimmed,
    type,
    confidence: RELATION_CONFIDENCE[type],
  });
}

function extractJsFamily(content: string): ExtractedReference[] {
  const out: ExtractedReference[] = [];

  const fromImport = new RegExp(
    `\\bimport\\s+(?:type\\s+)?(?:[\\w*{}$,\\s]+\\s+from\\s+)?${STRING}`,
    "g",
  );
  for (const match of content.matchAll(fromImport)) {
    pushUnique(out, match[1] ?? "", "import");
  }

  const sideEffect = new RegExp(`\\bimport\\s+${STRING}`, "g");
  for (const match of content.matchAll(sideEffect)) {
    pushUnique(out, match[1] ?? "", "import");
  }

  const exportFrom = new RegExp(`\\bexport\\s+(?:\\*|\\{[^}]*\\})\\s+from\\s+${STRING}`, "g");
  for (const match of content.matchAll(exportFrom)) {
    pushUnique(out, match[1] ?? "", "export");
  }

  const requireCall = new RegExp(`\\brequire\\s*\\(\\s*${STRING}\\s*\\)`, "g");
  for (const match of content.matchAll(requireCall)) {
    pushUnique(out, match[1] ?? "", "require");
  }

  const dynamicImport = new RegExp(`\\bimport\\s*\\(\\s*${STRING}\\s*\\)`, "g");
  for (const match of content.matchAll(dynamicImport)) {
    pushUnique(out, match[1] ?? "", "dynamic-import");
  }

  return out;
}

function extractDart(content: string): ExtractedReference[] {
  const out: ExtractedReference[] = [];
  const importRe = /\bimport\s+['"]([^'"]+)['"]/g;
  for (const match of content.matchAll(importRe)) {
    pushUnique(out, match[1] ?? "", "import");
  }
  const exportRe = /\bexport\s+['"]([^'"]+)['"]/g;
  for (const match of content.matchAll(exportRe)) {
    pushUnique(out, match[1] ?? "", "export");
  }
  return out;
}

function extractJava(content: string): ExtractedReference[] {
  const out: ExtractedReference[] = [];
  const importRe = /\bimport\s+(?:static\s+)?([a-zA-Z_][\w.]*)\s*;/g;
  for (const match of content.matchAll(importRe)) {
    const pkg = match[1] ?? "";
    if (pkg.startsWith("java.") || pkg.startsWith("javax.") || pkg.startsWith("jakarta.")) {
      continue;
    }
    pushUnique(out, pkg, "import");
  }
  return out;
}

function extractGo(content: string): ExtractedReference[] {
  const out: ExtractedReference[] = [];
  const single = /\bimport\s+"([^"]+)"/g;
  for (const match of content.matchAll(single)) {
    pushUnique(out, match[1] ?? "", "import");
  }
  const block = /\bimport\s*\(([\s\S]*?)\)/g;
  for (const match of content.matchAll(block)) {
    const body = match[1] ?? "";
    for (const line of body.matchAll(/"([^"]+)"/g)) {
      pushUnique(out, line[1] ?? "", "import");
    }
  }
  return out;
}

function extractPython(content: string): ExtractedReference[] {
  const out: ExtractedReference[] = [];
  const fromImport = /^\s*from\s+([.\w]+)\s+import\s+/gm;
  for (const match of content.matchAll(fromImport)) {
    pushUnique(out, match[1] ?? "", "import");
  }
  const plainImport = /^\s*import\s+([.\w]+(?:\s*,\s*[.\w]+)*)/gm;
  for (const match of content.matchAll(plainImport)) {
    const group = match[1] ?? "";
    for (const part of group.split(",")) {
      const name =
        part
          .trim()
          .split(/\s+as\s+/)[0]
          ?.trim() ?? "";
      pushUnique(out, name, "import");
    }
  }
  return out;
}

function extractRust(content: string): ExtractedReference[] {
  const out: ExtractedReference[] = [];
  const useRe = /\buse\s+((?:crate|super|self)::[\w:]+|[\w]+(?:::[\w]+)+)\s*(?:;|::\{)/g;
  for (const match of content.matchAll(useRe)) {
    pushUnique(out, match[1] ?? "", "import");
  }
  const modRe = /\bmod\s+([a-zA-Z_][\w]*)\s*;/g;
  for (const match of content.matchAll(modRe)) {
    pushUnique(out, match[1] ?? "", "module");
  }
  return out;
}

function extractPhp(content: string): ExtractedReference[] {
  const out: ExtractedReference[] = [];
  const useRe = /\buse\s+([A-Za-z_\\][\w\\]*)\s*;/g;
  for (const match of content.matchAll(useRe)) {
    pushUnique(out, (match[1] ?? "").replace(/\\/g, "/"), "import");
  }
  const requireRe = /\b(?:require|include)(?:_once)?\s*\(?\s*['"]([^'"]+)['"]/g;
  for (const match of content.matchAll(requireRe)) {
    pushUnique(out, match[1] ?? "", "require");
  }
  // Route::… Controller class references
  const routeClass = /\[([A-Za-z_\\][\w\\]*)\s*::\s*class/g;
  for (const match of content.matchAll(routeClass)) {
    pushUnique(out, (match[1] ?? "").replace(/\\/g, "/"), "route");
  }
  return out;
}

/**
 * Extract dependency references from source text using deterministic regex heuristics.
 */
export function extractReferences(relativePath: string, content: string): ExtractedReference[] {
  if (!isSourceFile(relativePath)) {
    return [];
  }
  const ext = extensionOf(relativePath);
  switch (ext) {
    case ".ts":
    case ".tsx":
    case ".js":
    case ".jsx":
    case ".mjs":
    case ".cjs":
      return extractJsFamily(content);
    case ".dart":
      return extractDart(content);
    case ".java":
      return extractJava(content);
    case ".go":
      return extractGo(content);
    case ".py":
      return extractPython(content);
    case ".rs":
      return extractRust(content);
    case ".php":
      return extractPhp(content);
    default:
      return [];
  }
}

export function refineRelationType(options: {
  base: DependencyRelationType;
  sourcePath: string;
  targetPath: string;
}): DependencyRelationType {
  const { base, sourcePath, targetPath } = options;
  if (
    base === "dynamic-import" ||
    base === "require" ||
    base === "export" ||
    base === "package" ||
    base === "route" ||
    base === "module"
  ) {
    return base;
  }

  const source = sourcePath.toLowerCase();
  const target = targetPath.toLowerCase();

  if (/(^|\/)routes?\//.test(source) || /(^|\/)pages?\//.test(source)) {
    return "route";
  }
  if (/controller/.test(source) && /service/.test(target)) {
    return "service";
  }
  if (/service/.test(source) && /repositor/.test(target)) {
    return "repository";
  }
  if (/repositor/.test(target)) {
    return "repository";
  }
  if (/service/.test(target) && /controller|handler|route/.test(source)) {
    return "service";
  }
  return base;
}
