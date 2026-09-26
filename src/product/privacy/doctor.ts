import { loadLatestBrain, searchBrain } from "../../core/brain-cli/service.js";
import { resolveRepoRoot } from "../../utils/path.js";
import type { ProductEvidence, TruthLabel } from "../truth.js";
import { lineNumberAt, loadProjectSourceFiles } from "../evidence-scan.js";

export interface PrivacyFinding {
  id: string;
  label: string;
  truth: TruthLabel;
  evidence: ProductEvidence[];
}

export interface PrivacyDoctorReport {
  root: string;
  findings: PrivacyFinding[];
  limitations: string[];
}

const PII_PATTERNS: Array<{ id: string; label: string; re: RegExp }> = [
  {
    id: "email-like",
    label: "Email-like string",
    re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
  },
  {
    id: "ssn-like",
    label: "SSN-like digit groups",
    re: /\b\d{3}-\d{2}-\d{4}\b/g,
  },
  {
    id: "credit-card-like",
    label: "Credit-card-like digit groups",
    re: /\b(?:\d[ -]*?){13,19}\b/g,
  },
];

function redactPiiExcerpt(line: string, match: string): string {
  const idx = line.indexOf(match);
  if (idx < 0) return "[REDACTED]";
  const before = line.slice(0, idx).slice(-24);
  const after = line.slice(idx + match.length).slice(0, 12);
  return `${before}[REDACTED]${after}`.trim().slice(0, 120);
}

export async function analyzePrivacySurface(rootInput: string): Promise<PrivacyDoctorReport> {
  const root = resolveRepoRoot(rootInput);
  const limitations = [
    "Privacy doctor is a lightweight PII-ish heuristic scan — not legal/compliance advice (not GDPR/HIPAA/PCI attestation).",
    "Matches are INFERRED; many are fixtures, tests, or placeholders.",
    "Matched values are redacted in excerpts; never export raw PII from this report.",
  ];

  const findings: PrivacyFinding[] = [];
  const { files } = await loadProjectSourceFiles(root, () => true);

  for (const file of files) {
    for (const pattern of PII_PATTERNS) {
      pattern.re.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = pattern.re.exec(file.content)) !== null) {
        const raw = match[0] ?? "";
        if (pattern.id === "credit-card-like" && raw.replace(/\D/g, "").length < 13) continue;
        const line = lineNumberAt(file.content, match.index);
        const lineText = file.content.split(/\r?\n/)[line - 1] ?? "";
        findings.push({
          id: pattern.id,
          label: pattern.label,
          truth: "INFERRED",
          evidence: [
            {
              path: file.relativePath,
              line,
              excerpt: redactPiiExcerpt(lineText, raw),
            },
          ],
        });
        if (findings.length >= 100) break;
      }
      if (findings.length >= 100) break;
    }
    if (findings.length >= 100) {
      limitations.push("PII finding cap reached (100)");
      break;
    }
  }

  const brain = await loadLatestBrain(root);
  if (brain) {
    const brainHits = searchBrain(brain, "email");
    if (brainHits.length > 0) {
      findings.push({
        id: "brain-claim-hint",
        label: "Project brain mentions email-related claims (review manually)",
        truth: "INFERRED",
        evidence: brainHits.slice(0, 3).map((h) => ({
          path: ".agentdoctor/project-brain",
          excerpt: h.text.slice(0, 100),
        })),
      });
    }
  } else {
    limitations.push("Project brain not available for supplemental search.");
  }

  return { root, findings, limitations };
}
