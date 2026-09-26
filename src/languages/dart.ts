import type { LanguageAdapter, LanguageImport, LanguageSymbol, ParseResult } from "./types.js";

export interface DartParseSummary {
  libraryName: string;
  imports: LanguageImport[];
  symbols: LanguageSymbol[];
  limitations: string[];
}

/** Lightweight line-oriented Dart scan — not Dart analyzer APIs. */
export function parseDartSource(filePath: string, source: string): DartParseSummary {
  const lines = source.split(/\r?\n/);
  const limitations = [
    "Dart parsing uses a lightweight line scanner — not the Dart analyzer; calls/types are partial.",
    "Full Dart analyzer or tree-sitter-dart integration remains an EXTERNAL enhancement path (not bundled).",
  ];

  let libraryName = "";
  const imports: LanguageImport[] = [];
  const symbols: LanguageSymbol[] = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i]!.trim();
    if (!libraryName && trimmed.startsWith("library ")) {
      libraryName = trimmed.slice("library ".length).replace(/;$/, "").trim();
    }
    if (trimmed.startsWith("import ") && trimmed.endsWith(";")) {
      const spec = trimmed
        .slice("import ".length, -1)
        .replace(/^['"]|['"]$/g, "")
        .trim();
      if (spec) imports.push({ fromFile: filePath, specifier: spec, evidence: "ast" });
    }
    if (trimmed.startsWith("export ") && trimmed.endsWith(";")) {
      const spec = trimmed
        .slice("export ".length, -1)
        .replace(/^['"]|['"]$/g, "")
        .trim();
      if (spec) imports.push({ fromFile: filePath, specifier: spec, evidence: "ast" });
    }
    const typeMatch = /^(?:abstract\s+)?(?:class|mixin|extension)\s+(\w+)/.exec(trimmed);
    if (typeMatch) {
      let kind = "class";
      if (trimmed.includes("mixin")) kind = "mixin";
      else if (trimmed.includes("extension")) kind = "extension";
      symbols.push({
        id: `dart:${kind}:${filePath}:${typeMatch[1]}`,
        name: typeMatch[1]!,
        kind,
        file: filePath,
        line: i + 1,
        evidence: "ast",
      });
    }
    const fnMatch = /^(?:\w+\s+)?(\w+)\s*\([^)]*\)\s*(?:async\s*)?\{?\s*$/.exec(trimmed);
    if (
      fnMatch &&
      !trimmed.startsWith("if ") &&
      !trimmed.startsWith("for ") &&
      !trimmed.startsWith("while ") &&
      !trimmed.startsWith("class ") &&
      !trimmed.startsWith("return ")
    ) {
      const name = fnMatch[1]!;
      if (!["void", "final", "const", "var", "late"].includes(name)) {
        symbols.push({
          id: `dart:function:${filePath}:${name}`,
          name,
          kind: "function",
          file: filePath,
          line: i + 1,
          evidence: "ast",
        });
      }
    }
  }

  return { libraryName, imports, symbols, limitations };
}

const DART_CAPABILITIES = (): ReturnType<LanguageAdapter["capabilities"]> => ({
  parse: "supported",
  symbols: "supported",
  definitions: "unsupported",
  references: "unsupported",
  imports: "supported",
  calls: "partial",
  diagnostics: "unsupported",
  types: "partial",
});

export const dartAdapter: LanguageAdapter = {
  id: "dart",
  extensions: [".dart"],
  capabilities: DART_CAPABILITIES,
  async parse(filePath, source): Promise<ParseResult> {
    const summary = parseDartSource(filePath, source);
    const ok = Boolean(
      summary.libraryName || summary.symbols.length > 0 || summary.imports.length > 0,
    );
    return {
      language: "dart",
      file: filePath,
      ok,
      capabilities: dartAdapter.capabilities(),
      symbols: summary.symbols,
      imports: summary.imports,
      calls: [],
      diagnostics: ok ? [] : ["no library, import, or declarations detected"],
      limitations: summary.limitations,
    };
  },
};
