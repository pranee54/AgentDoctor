import fs from "node:fs/promises";
import path from "node:path";

import { decideDirectoryTraversal } from "../../project/ownership.js";
import { readTextFile } from "../../utils/fs.js";
import { resolveRepoRoot, toPosixRelative } from "../../utils/path.js";

export type SecretSeverity = "critical" | "warning";
/** Pattern match confidence — independent from severity impact rating. */
export type SecretConfidence = "low" | "medium" | "high";

export interface SecretFinding {
  file: string;
  line: number;
  ruleId: string;
  /** Always redacted — never contains the secret value */
  redactedSnippet: string;
  /** Impact if the match is a real secret — not the same as confidence. */
  severity: SecretSeverity;
  /** How confident the heuristic is that this match is a secret. */
  confidence: SecretConfidence;
}

export interface SecretScanReport {
  root: string;
  enabled: boolean;
  filesScanned: number;
  findings: SecretFinding[];
  limitations: string[];
}

const SECRET_PATTERNS: Array<{
  id: string;
  re: RegExp;
  severity: SecretSeverity;
  confidence: SecretConfidence;
}> = [
  {
    id: "aws-access-key",
    re: /\bAKIA[0-9A-Z]{16}\b/g,
    severity: "critical",
    confidence: "high",
  },
  {
    id: "generic-api-key",
    re: /\b(?:api[_-]?key|secret[_-]?key|access[_-]?token)\s*[:=]\s*['"]?[A-Za-z0-9_-]{16,}['"]?/gi,
    severity: "warning",
    confidence: "medium",
  },
  {
    id: "private-key-header",
    re: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
    severity: "critical",
    confidence: "high",
  },
  {
    id: "github-pat",
    re: /\bghp_[A-Za-z0-9]{36}\b/g,
    severity: "critical",
    confidence: "high",
  },
];

const SKIP_DIR = new Set([
  "node_modules",
  ".git",
  "dist",
  "coverage",
  ".agentdoctor",
  "vendor",
  ".next",
]);

const TEXT_EXT = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".yml",
  ".yaml",
  ".md",
  ".env",
  ".txt",
  ".toml",
  ".ini",
  ".cfg",
  ".py",
  ".go",
  ".rs",
  ".java",
  ".kt",
  ".php",
  ".rb",
  ".sh",
]);

function redactMatch(line: string, match: string): string {
  const idx = line.indexOf(match);
  if (idx < 0) {
    return "[REDACTED]";
  }
  const before = line.slice(0, idx).slice(-40);
  const after = line.slice(idx + match.length).slice(0, 20);
  return `${before}[REDACTED]${after}`.trim();
}

async function walkFiles(root: string, dir: string, out: string[], limit: number): Promise<void> {
  if (out.length >= limit) return;
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (out.length >= limit) return;
    if (entry.name.startsWith(".") && entry.name !== ".env" && entry.name !== ".env.local") {
      if (SKIP_DIR.has(entry.name)) continue;
    }
    if (SKIP_DIR.has(entry.name)) continue;
    const absolute = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) {
      const relativeDir = toPosixRelative(root, absolute);
      const traversal = await decideDirectoryTraversal({
        projectRoot: root,
        absoluteDir: absolute,
        relativeDir,
      });
      if (!traversal.traverse) continue;
      await walkFiles(root, absolute, out, limit);
      continue;
    }
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (!TEXT_EXT.has(ext) && !entry.name.startsWith(".env")) continue;
    out.push(absolute);
  }
}

/**
 * Opt-in content secret scan. Findings never include raw secret values.
 */
export async function scanSecrets(options: {
  root: string;
  enabled: boolean;
  maxFiles?: number;
}): Promise<SecretScanReport> {
  const root = resolveRepoRoot(options.root);
  if (!options.enabled) {
    return {
      root,
      enabled: false,
      filesScanned: 0,
      findings: [],
      limitations: ["Content secret scanning disabled (pass --secrets to enable)"],
    };
  }

  const maxFiles = options.maxFiles ?? 400;
  const files: string[] = [];
  await walkFiles(root, root, files, maxFiles);
  const findings: SecretFinding[] = [];
  const limitations: string[] = [];

  if (files.length >= maxFiles) {
    limitations.push(`Scan capped at ${maxFiles} files`);
  }

  for (const absolute of files) {
    // open+fstat+read via readTextFile — avoids exists/stat→read TOCTOU
    const content = await readTextFile(absolute, 512 * 1024);
    if (content === null) continue;
    const lines = content.split(/\r?\n/);
    const rel = toPosixRelative(root, absolute);
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i] ?? "";
      for (const pattern of SECRET_PATTERNS) {
        pattern.re.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = pattern.re.exec(line)) !== null) {
          findings.push({
            file: rel,
            line: i + 1,
            ruleId: pattern.id,
            redactedSnippet: redactMatch(line, match[0] ?? ""),
            severity: pattern.severity,
            confidence: pattern.confidence,
          });
          if (findings.length >= 200) {
            limitations.push("Finding cap reached (200)");
            return {
              root,
              enabled: true,
              filesScanned: files.length,
              findings,
              limitations,
            };
          }
        }
      }
    }
  }

  return {
    root,
    enabled: true,
    filesScanned: files.length,
    findings,
    limitations,
  };
}
