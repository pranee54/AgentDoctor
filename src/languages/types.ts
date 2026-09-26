/**
 * Language adapter contract — real parsers only.
 * Unsupported capabilities must be reported as unsupported, never as inferred AST.
 */

export type LanguageId =
  | "typescript"
  | "javascript"
  | "python"
  | "java"
  | "kotlin"
  | "go"
  | "rust"
  | "php"
  | "dart"
  | "unknown";

export type AdapterCapability =
  | "parse"
  | "symbols"
  | "definitions"
  | "references"
  | "imports"
  | "calls"
  | "diagnostics"
  | "types";

export interface LanguageSymbol {
  id: string;
  name: string;
  kind: string;
  file: string;
  line?: number;
  evidence: "ast" | "unsupported";
}

export interface LanguageImport {
  fromFile: string;
  specifier: string;
  evidence: "ast" | "unsupported";
}

export interface LanguageCall {
  fromFile: string;
  callee: string;
  evidence: "ast" | "unsupported";
}

export type AdapterCapabilityLevel = "supported" | "unsupported" | "partial";

export interface ParseResult {
  language: LanguageId;
  file: string;
  ok: boolean;
  capabilities: Partial<Record<AdapterCapability, AdapterCapabilityLevel>>;
  symbols: LanguageSymbol[];
  imports: LanguageImport[];
  calls: LanguageCall[];
  diagnostics: string[];
  limitations: string[];
}

export interface LanguageAdapter {
  id: LanguageId;
  extensions: string[];
  capabilities(): Partial<Record<AdapterCapability, AdapterCapabilityLevel>>;
  parse(filePath: string, source: string): Promise<ParseResult>;
}

export function detectLanguage(filePath: string): LanguageId {
  const lower = filePath.toLowerCase();
  if (/\.tsx?$/.test(lower) || /\.mts$/.test(lower) || /\.cts$/.test(lower)) return "typescript";
  if (/\.jsx?$/.test(lower) || /\.mjs$/.test(lower) || /\.cjs$/.test(lower)) return "javascript";
  if (/\.py$/.test(lower)) return "python";
  if (/\.java$/.test(lower)) return "java";
  if (/\.kt$/.test(lower) || /\.kts$/.test(lower)) return "kotlin";
  if (/\.go$/.test(lower)) return "go";
  if (/\.rs$/.test(lower)) return "rust";
  if (/\.php$/.test(lower)) return "php";
  if (/\.dart$/.test(lower)) return "dart";
  return "unknown";
}
