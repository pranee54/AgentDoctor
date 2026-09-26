import { spawnSync } from "node:child_process";

import type { LanguageAdapter, ParseResult, LanguageSymbol, LanguageImport } from "./types.js";

const GO_PROBE_TIMEOUT_MS = 5_000;

export function goAvailable(): boolean {
  const r = spawnSync("go", ["version"], {
    encoding: "utf8",
    timeout: GO_PROBE_TIMEOUT_MS,
    windowsHide: true,
  });
  return r.status === 0 && !r.error;
}

export interface GoSourceRange {
  startLine: number;
  endLine: number;
}

export interface GoParseSummary {
  packageName: string;
  imports: LanguageImport[];
  symbols: LanguageSymbol[];
  limitations: string[];
}

function lineTrimmed(source: string, lineIndex: number): string {
  const lines = source.split(/\r?\n/);
  return lines[lineIndex]?.trim() ?? "";
}

/** Lightweight line-oriented Go scan (not go/ast). Honest partial call resolution. */
export function parseGoSource(filePath: string, source: string): GoParseSummary {
  const lines = source.split(/\r?\n/);
  const limitations = [
    "Go parsing uses a lightweight line scanner — not go/ast; calls are not resolved.",
    goAvailable()
      ? "Go toolchain is present; full go/ast bridge remains EXTERNAL (not bundled)."
      : "Go toolchain not on PATH; same lightweight scanner used.",
  ];

  let packageName = "";
  const imports: LanguageImport[] = [];
  const symbols: LanguageSymbol[] = [];

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]!;
    const trimmed = raw.trim();
    if (!packageName && trimmed.startsWith("package ") && !trimmed.startsWith("package (")) {
      packageName = trimmed.slice("package ".length).split(/\s+/)[0] ?? "";
    }
    if (trimmed.startsWith("import ") || trimmed === "import (") {
      if (trimmed === "import (") {
        for (let j = i + 1; j < lines.length; j++) {
          const inner = lines[j]!.trim();
          if (inner === ")") {
            i = j;
            break;
          }
          const spec = inner.replace(/^"|"$/g, "").replace(/^'|'$/g, "");
          if (spec && spec !== "") {
            imports.push({ fromFile: filePath, specifier: spec, evidence: "ast" });
          }
        }
        continue;
      }
      const spec = trimmed.slice("import ".length).replace(/^"|"$/g, "").trim();
      if (spec) imports.push({ fromFile: filePath, specifier: spec, evidence: "ast" });
    }
    if (trimmed.startsWith("func ")) {
      const nameMatch = /^func\s+(?:\([^)]*\)\s+)?(\w+)/.exec(trimmed);
      if (nameMatch) {
        symbols.push({
          id: `go:func:${filePath}:${nameMatch[1]}`,
          name: nameMatch[1]!,
          kind: "function",
          file: filePath,
          line: i + 1,
          evidence: "ast",
        });
      }
    }
    if (trimmed.startsWith("type ")) {
      const typeMatch = /^type\s+(\w+)/.exec(trimmed);
      if (typeMatch) {
        symbols.push({
          id: `go:type:${filePath}:${typeMatch[1]}`,
          name: typeMatch[1]!,
          kind: "type",
          file: filePath,
          line: i + 1,
          evidence: "ast",
        });
      }
    }
  }

  if (!packageName) {
    limitations.push(`No package clause detected in ${lineTrimmed(source, 0) || "(file)"}`);
  }

  return { packageName, imports, symbols, limitations };
}

export const goAdapter: LanguageAdapter = {
  id: "go",
  extensions: [".go"],
  capabilities: () => ({
    parse: "supported",
    symbols: "supported",
    definitions: "unsupported",
    references: "unsupported",
    imports: "supported",
    calls: "partial",
    diagnostics: "unsupported",
  }),
  async parse(filePath, source): Promise<ParseResult> {
    const summary = parseGoSource(filePath, source);
    return {
      language: "go",
      file: filePath,
      ok: Boolean(summary.packageName),
      capabilities: goAdapter.capabilities(),
      symbols: summary.symbols,
      imports: summary.imports,
      calls: [],
      diagnostics: summary.packageName ? [] : ["missing package clause"],
      limitations: summary.limitations,
    };
  },
};
