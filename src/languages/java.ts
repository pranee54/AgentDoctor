import type { LanguageAdapter, LanguageImport, LanguageSymbol, ParseResult } from "./types.js";

export interface JavaParseSummary {
  packageName: string;
  imports: LanguageImport[];
  symbols: LanguageSymbol[];
  limitations: string[];
}

/** Lightweight line-oriented Java scan — not javaparser/tree-sitter. */
export function parseJavaSource(filePath: string, source: string): JavaParseSummary {
  const lines = source.split(/\r?\n/);
  const limitations = [
    "Java parsing uses a lightweight line scanner — not javaparser or tree-sitter-java; calls/types are not fully resolved.",
    "Full compiler or tree-sitter-java integration remains an EXTERNAL enhancement path (not bundled).",
  ];

  let packageName = "";
  const imports: LanguageImport[] = [];
  const symbols: LanguageSymbol[] = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i]!.trim();
    if (!packageName && trimmed.startsWith("package ") && trimmed.endsWith(";")) {
      packageName = trimmed.slice("package ".length, -1).trim();
    }
    if (trimmed.startsWith("import ") && trimmed.endsWith(";") && !trimmed.includes(" static ")) {
      const spec = trimmed.slice("import ".length, -1).trim();
      if (spec) imports.push({ fromFile: filePath, specifier: spec, evidence: "ast" });
    }
    const typeMatch =
      /^(?:public\s+|private\s+|protected\s+)?(?:abstract\s+)?(?:class|interface|enum|record)\s+(\w+)/.exec(
        trimmed,
      );
    if (typeMatch) {
      const kind = trimmed.includes("interface")
        ? "interface"
        : trimmed.includes("enum")
          ? "enum"
          : "class";
      symbols.push({
        id: `java:${kind}:${filePath}:${typeMatch[1]}`,
        name: typeMatch[1]!,
        kind,
        file: filePath,
        line: i + 1,
        evidence: "ast",
      });
    }
    const methodMatch =
      /^(?:public|private|protected|static|\s)+[\w<>,[\].?\s]+\s+(\w+)\s*\([^;]*\)\s*(?:throws\s+[\w\s,]+)?\s*\{?\s*$/.exec(
        trimmed,
      );
    if (methodMatch && !trimmed.startsWith("if ") && !trimmed.startsWith("for ")) {
      symbols.push({
        id: `java:method:${filePath}:${methodMatch[1]}`,
        name: methodMatch[1]!,
        kind: "method",
        file: filePath,
        line: i + 1,
        evidence: "ast",
      });
    }
  }

  return { packageName, imports, symbols, limitations };
}

const JAVA_CAPABILITIES = (): ReturnType<LanguageAdapter["capabilities"]> => ({
  parse: "supported",
  symbols: "supported",
  definitions: "unsupported",
  references: "unsupported",
  imports: "supported",
  calls: "partial",
  diagnostics: "unsupported",
  types: "partial",
});

export const javaAdapter: LanguageAdapter = {
  id: "java",
  extensions: [".java"],
  capabilities: JAVA_CAPABILITIES,
  async parse(filePath, source): Promise<ParseResult> {
    const summary = parseJavaSource(filePath, source);
    const ok = Boolean(summary.packageName || summary.symbols.length > 0);
    return {
      language: "java",
      file: filePath,
      ok,
      capabilities: javaAdapter.capabilities(),
      symbols: summary.symbols,
      imports: summary.imports,
      calls: [],
      diagnostics: ok ? [] : ["no package or type declarations detected"],
      limitations: summary.limitations,
    };
  },
};
