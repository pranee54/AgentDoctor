import { scanSecrets, type SecretFinding } from "../../core/secrets/scan.js";
import { resolveRepoRoot } from "../../utils/path.js";
import type { ProductEvidence, TruthLabel } from "../truth.js";
import { lineNumberAt, loadProjectSourceFiles } from "../evidence-scan.js";

export interface SecurityPatternFinding {
  id: string;
  title: string;
  truth: TruthLabel;
  evidence: ProductEvidence[];
}

export interface SecurityDoctorReport {
  root: string;
  /** Local heuristic rules only — not enterprise SAST. */
  staticAnalysisLabel: "TECHNICAL_STATIC_ANALYSIS_SUPPORTED";
  secretScan: {
    enabled: boolean;
    filesScanned: number;
    findings: SecretFinding[];
    limitations: string[];
  };
  authMarkers: SecurityPatternFinding[];
  dangerousPatterns: SecurityPatternFinding[];
  limitations: string[];
}

const AUTH_MARKERS: Array<{ id: string; title: string; re: RegExp }> = [
  {
    id: "middleware-auth",
    title: "Auth middleware marker",
    re: /\b(?:auth|authenticate|authorize)\s*\(/i,
  },
  { id: "laravel-gate", title: "Laravel Gate/Policy marker", re: /\bGate::|\bPolicy\b|\b@can\b/i },
  { id: "nestjs-guard", title: "NestJS guard/decorator marker", re: /@UseGuards\b|AuthGuard\b/i },
  {
    id: "rbac-role",
    title: "RBAC role/permission marker",
    re: /\b(?:hasPermission|hasRole|@PreAuthorize|@Roles)\b/i,
  },
];

const DANGEROUS_PATTERNS: Array<{ id: string; title: string; re: RegExp }> = [
  { id: "eval-call", title: "Dynamic eval() (CWE-95)", re: /\beval\s*\(/g },
  {
    id: "child-process-exec-string",
    title: "child_process exec with string literal (CWE-78)",
    re: /\b(?:exec|execSync)\s*\(\s*['"`]/g,
  },
  {
    id: "child-process-exec-concat",
    title: "child_process exec with string concatenation (CWE-78)",
    re: /\b(?:exec|execSync)\s*\(\s*[^)]*\+/g,
  },
  {
    id: "innerhtml-assign",
    title: "DOM innerHTML assignment (CWE-79)",
    re: /\.innerHTML\s*=/g,
  },
  {
    id: "path-join-user-input",
    title: "Path join with request/user input pattern (CWE-22)",
    re: /\bpath\.(?:join|resolve)\s*\([^)]*(?:req\.|request\.|params\.|query\.|user[A-Z_a-z]*|input)/g,
  },
  { id: "shell-exec", title: "Shell invocation helper", re: /\bshell\s*:\s*true\b/g },
];

function redactExcerpt(line: string): string {
  return line
    .trim()
    .slice(0, 120)
    .replace(/['"][^'"]{8,}['"]/g, "'[REDACTED]'");
}

export async function analyzeSecuritySurface(rootInput: string): Promise<SecurityDoctorReport> {
  const root = resolveRepoRoot(rootInput);
  const limitations = [
    "TECHNICAL STATIC ANALYSIS SUPPORTED locally (regex/heuristic rules with file evidence — not full SAST).",
    "Security doctor uses heuristic pattern scans — not a substitute for SAST/DAST or manual review.",
    "Secret values are never included; only redacted snippets and rule ids.",
  ];

  const secretScan = await scanSecrets({ root, enabled: true, maxFiles: 400 });

  const { files } = await loadProjectSourceFiles(root, (rel) =>
    /\.(ts|tsx|js|jsx|mjs|cjs|py|php|go)$/i.test(rel),
  );

  const authMarkers: SecurityPatternFinding[] = [];
  const dangerousPatterns: SecurityPatternFinding[] = [];

  for (const file of files) {
    for (const marker of AUTH_MARKERS) {
      marker.re.lastIndex = 0;
      if (marker.re.test(file.content)) {
        const idx = file.content.search(marker.re);
        authMarkers.push({
          id: marker.id,
          title: marker.title,
          truth: "INFERRED",
          evidence: [
            {
              path: file.relativePath,
              ...(idx >= 0 ? { line: lineNumberAt(file.content, idx) } : {}),
              excerpt: redactExcerpt(
                file.content.split(/\r?\n/)[
                  Math.max(0, lineNumberAt(file.content, Math.max(idx, 0)) - 1)
                ] ?? "",
              ),
            },
          ],
        });
        break;
      }
    }

    for (const pattern of DANGEROUS_PATTERNS) {
      pattern.re.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = pattern.re.exec(file.content)) !== null) {
        const line = lineNumberAt(file.content, match.index);
        const lineText = file.content.split(/\r?\n/)[line - 1] ?? "";
        dangerousPatterns.push({
          id: pattern.id,
          title: pattern.title,
          truth: "INFERRED",
          evidence: [
            {
              path: file.relativePath,
              line,
              excerpt: redactExcerpt(lineText),
            },
          ],
        });
        if (dangerousPatterns.length >= 80) break;
      }
      if (dangerousPatterns.length >= 80) break;
    }
    if (dangerousPatterns.length >= 80) {
      limitations.push("Dangerous pattern finding cap reached (80)");
      break;
    }
  }

  if (authMarkers.length === 0) {
    limitations.push("No auth/permission file markers matched heuristics (absence is not proof).");
  }

  return {
    root,
    staticAnalysisLabel: "TECHNICAL_STATIC_ANALYSIS_SUPPORTED",
    secretScan: {
      enabled: secretScan.enabled,
      filesScanned: secretScan.filesScanned,
      findings: secretScan.findings,
      limitations: secretScan.limitations,
    },
    authMarkers: authMarkers.slice(0, 40),
    dangerousPatterns,
    limitations,
  };
}
