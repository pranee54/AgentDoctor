import type { LanguageAdapter, ParseResult } from "./types.js";
import { detectLanguage } from "./types.js";
import { javascriptAdapter, typescriptAdapter } from "./typescript.js";
import { pythonAdapter } from "./python.js";
import { phpAdapter } from "./php.js";
import { goAdapter } from "./go.js";
import { javaAdapter } from "./java.js";
import { kotlinAdapter } from "./kotlin.js";
import { rustAdapter } from "./rust.js";
import { dartAdapter } from "./dart.js";

/** Languages with real parsers (compiler AST or lightweight line scanners). */
export const languageAdapters: LanguageAdapter[] = [
  typescriptAdapter,
  javascriptAdapter,
  pythonAdapter,
  phpAdapter,
  goAdapter,
  javaAdapter,
  kotlinAdapter,
  rustAdapter,
  dartAdapter,
];

export function getAdapterForFile(filePath: string): LanguageAdapter | null {
  const lang = detectLanguage(filePath);
  if (lang === "unknown") return null;
  return languageAdapters.find((a) => a.id === lang) ?? null;
}

export async function parseSourceFile(filePath: string, source: string): Promise<ParseResult> {
  const adapter = getAdapterForFile(filePath);
  if (!adapter) {
    return {
      language: "unknown",
      file: filePath,
      ok: false,
      capabilities: {},
      symbols: [],
      imports: [],
      calls: [],
      diagnostics: ["unknown language"],
      limitations: ["No language adapter for this file extension"],
    };
  }
  return adapter.parse(filePath, source);
}

export { detectLanguage } from "./types.js";
export { typescriptAdapter, javascriptAdapter } from "./typescript.js";
export { pythonAdapter, pythonAvailable } from "./python.js";
export { phpAdapter, phpAvailable } from "./php.js";
export { goAdapter, goAvailable } from "./go.js";
export { javaAdapter, parseJavaSource } from "./java.js";
export { kotlinAdapter, parseKotlinSource } from "./kotlin.js";
export { rustAdapter, parseRustSource } from "./rust.js";
export { dartAdapter, parseDartSource } from "./dart.js";
export type { LanguageAdapter, ParseResult, LanguageId } from "./types.js";
