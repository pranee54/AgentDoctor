import type { LanguageAdapter, LanguageImport, LanguageSymbol, ParseResult } from "./types.js";

export interface KotlinParseSummary {
  packageName: string;
  imports: LanguageImport[];
  symbols: LanguageSymbol[];
  limitations: string[];
}

/** Lightweight line-oriented Kotlin scan — not Kotlin compiler AST. */
export function parseKotlinSource(filePath: string, source: string): KotlinParseSummary {
  const lines = source.split(/\r?\n/);
  const limitations = [
    "Kotlin parsing uses a lightweight line scanner — not the Kotlin compiler or tree-sitter-kotlin; calls/types are partial.",
    "Full compiler or tree-sitter-kotlin integration remains an EXTERNAL enhancement path (not bundled).",
  ];

  let packageName = "";
  const imports: LanguageImport[] = [];
  const symbols: LanguageSymbol[] = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i]!.trim();
    if (!packageName && trimmed.startsWith("package ")) {
      packageName = trimmed.slice("package ".length).split(/\s+/)[0] ?? "";
    }
    if (trimmed.startsWith("import ") && !trimmed.startsWith("import(")) {
      const spec = trimmed
        .slice("import ".length)
        .replace(/\s+as\s+\w+$/, "")
        .trim();
      if (spec) imports.push({ fromFile: filePath, specifier: spec, evidence: "ast" });
    }
    const typeMatch =
      /^(?:data\s+|sealed\s+|open\s+|abstract\s+|inner\s+)?(?:class|interface|object|enum class)\s+(\w+)/.exec(
        trimmed,
      );
    if (typeMatch) {
      let kind = "class";
      if (trimmed.includes("interface")) kind = "interface";
      else if (trimmed.includes("object")) kind = "object";
      else if (trimmed.includes("enum class")) kind = "enum";
      symbols.push({
        id: `kotlin:${kind}:${filePath}:${typeMatch[1]}`,
        name: typeMatch[1]!,
        kind,
        file: filePath,
        line: i + 1,
        evidence: "ast",
      });
    }
    const funMatch =
      /^(?:private\s+|public\s+|internal\s+|protected\s+)?fun\s+(?:<[^>]+>\s+)?(\w+)\s*\(/.exec(
        trimmed,
      );
    if (funMatch) {
      symbols.push({
        id: `kotlin:function:${filePath}:${funMatch[1]}`,
        name: funMatch[1]!,
        kind: "function",
        file: filePath,
        line: i + 1,
        evidence: "ast",
      });
    }
  }

  return { packageName, imports, symbols, limitations };
}

const KOTLIN_CAPABILITIES = (): ReturnType<LanguageAdapter["capabilities"]> => ({
  parse: "supported",
  symbols: "supported",
  definitions: "unsupported",
  references: "unsupported",
  imports: "supported",
  calls: "partial",
  diagnostics: "unsupported",
  types: "partial",
});

export const kotlinAdapter: LanguageAdapter = {
  id: "kotlin",
  extensions: [".kt", ".kts"],
  capabilities: KOTLIN_CAPABILITIES,
  async parse(filePath, source): Promise<ParseResult> {
    const summary = parseKotlinSource(filePath, source);
    const ok = Boolean(summary.packageName || summary.symbols.length > 0);
    return {
      language: "kotlin",
      file: filePath,
      ok,
      capabilities: kotlinAdapter.capabilities(),
      symbols: summary.symbols,
      imports: summary.imports,
      calls: [],
      diagnostics: ok ? [] : ["no package or declarations detected"],
      limitations: summary.limitations,
    };
  },
};
