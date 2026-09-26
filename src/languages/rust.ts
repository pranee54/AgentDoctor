import type { LanguageAdapter, LanguageImport, LanguageSymbol, ParseResult } from "./types.js";

export interface RustParseSummary {
  moduleName: string;
  imports: LanguageImport[];
  symbols: LanguageSymbol[];
  limitations: string[];
}

/** Lightweight line-oriented Rust scan — not syn/rustc AST. */
export function parseRustSource(filePath: string, source: string): RustParseSummary {
  const lines = source.split(/\r?\n/);
  const limitations = [
    "Rust parsing uses a lightweight line scanner — not syn or tree-sitter-rust; calls/types are partial.",
    "Full rustc/syn or tree-sitter-rust integration remains an EXTERNAL enhancement path (not bundled).",
  ];

  let moduleName = "";
  const imports: LanguageImport[] = [];
  const symbols: LanguageSymbol[] = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i]!.trim();
    if (!moduleName && trimmed.startsWith("mod ") && !trimmed.includes("{")) {
      moduleName = trimmed.slice("mod ".length).split(/\s+/)[0]?.replace(";", "") ?? "";
    }
    if (trimmed.startsWith("use ") && trimmed.endsWith(";")) {
      const spec = trimmed.slice("use ".length, -1).trim();
      if (spec) imports.push({ fromFile: filePath, specifier: spec, evidence: "ast" });
    }
    const structMatch = /^(?:pub\s+)?(?:struct|enum|trait|type)\s+(\w+)/.exec(trimmed);
    if (structMatch) {
      let kind = "struct";
      if (trimmed.includes("enum")) kind = "enum";
      else if (trimmed.includes("trait")) kind = "trait";
      else if (trimmed.includes("type")) kind = "type";
      symbols.push({
        id: `rust:${kind}:${filePath}:${structMatch[1]}`,
        name: structMatch[1]!,
        kind,
        file: filePath,
        line: i + 1,
        evidence: "ast",
      });
    }
    const fnMatch = /^(?:pub\s+)?(?:async\s+)?fn\s+(\w+)/.exec(trimmed);
    if (fnMatch) {
      symbols.push({
        id: `rust:function:${filePath}:${fnMatch[1]}`,
        name: fnMatch[1]!,
        kind: "function",
        file: filePath,
        line: i + 1,
        evidence: "ast",
      });
    }
    const implMatch = /^impl(?:<[^>]+>)?\s+(?:\w+::)*(\w+)/.exec(trimmed);
    if (implMatch) {
      symbols.push({
        id: `rust:impl:${filePath}:${implMatch[1]}`,
        name: implMatch[1]!,
        kind: "impl",
        file: filePath,
        line: i + 1,
        evidence: "ast",
      });
    }
  }

  return { moduleName, imports, symbols, limitations };
}

const RUST_CAPABILITIES = (): ReturnType<LanguageAdapter["capabilities"]> => ({
  parse: "supported",
  symbols: "supported",
  definitions: "unsupported",
  references: "unsupported",
  imports: "supported",
  calls: "partial",
  diagnostics: "unsupported",
  types: "partial",
});

export const rustAdapter: LanguageAdapter = {
  id: "rust",
  extensions: [".rs"],
  capabilities: RUST_CAPABILITIES,
  async parse(filePath, source): Promise<ParseResult> {
    const summary = parseRustSource(filePath, source);
    const ok = Boolean(
      summary.moduleName || summary.symbols.length > 0 || summary.imports.length > 0,
    );
    return {
      language: "rust",
      file: filePath,
      ok,
      capabilities: rustAdapter.capabilities(),
      symbols: summary.symbols,
      imports: summary.imports,
      calls: [],
      diagnostics: ok ? [] : ["no mod, use, or declarations detected"],
      limitations: summary.limitations,
    };
  },
};
