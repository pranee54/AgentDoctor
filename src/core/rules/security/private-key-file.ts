import type { FindingDraft, RuleDefinition } from "../types.js";

const PRIVATE_KEY_PATTERNS: Array<{ test: (base: string) => boolean; label: string }> = [
  { test: (b) => /^id_rsa$/i.test(b), label: "SSH private key" },
  { test: (b) => /^id_ed25519$/i.test(b), label: "SSH private key" },
  { test: (b) => /^id_ecdsa$/i.test(b), label: "SSH private key" },
  {
    test: (b) => /\.pem$/i.test(b) && !/cert|certificate|public|ca-bundle/i.test(b),
    label: "PEM private key",
  },
  {
    test: (b) => /\.der$/i.test(b) && !/cert|certificate|public|ca-bundle/i.test(b),
    label: "DER-encoded key or credential material",
  },
  { test: (b) => /\.p12$/i.test(b), label: "PKCS#12 credential bundle" },
  { test: (b) => /\.pfx$/i.test(b), label: "PKCS#12 credential bundle" },
  { test: (b) => /^credentials\.json$/i.test(b), label: "credentials file" },
  { test: (b) => /service[-_]?account.*\.json$/i.test(b), label: "service account key" },
  {
    test: (b) => /\.key$/i.test(b) && !/public|pub/i.test(b),
    label: "private key file",
  },
];

function classify(base: string): string | null {
  for (const pattern of PRIVATE_KEY_PATTERNS) {
    if (pattern.test(base)) {
      return pattern.label;
    }
  }
  return null;
}

export const privateKeyFileRule: RuleDefinition = {
  id: "security/private-key-file",
  title: "Private key or credential file present in repository",
  description:
    "Detects high-confidence private key / credential filenames inside the repository tree.",
  category: "security",
  severity: "critical",
  fixability: "manual",
  rationale:
    "Private keys and service-account credentials in a repository are high-risk if accessible to agents or collaborators.",
  recommendation:
    "Remove the credential from the repository, rotate it, and store secrets in a secret manager or local-only location excluded from agents.",
  async check(context): Promise<FindingDraft[]> {
    const findings: FindingDraft[] = [];
    const affected = context.agents.filter((a) => a.detected || a.configured).map((a) => a.id);

    for (const file of context.discovery.files) {
      const base = file.relativePath.split("/").pop() ?? file.relativePath;
      const label = classify(base);
      if (!label) {
        continue;
      }

      const agentsPresent = affected.length > 0;
      findings.push({
        ruleId: "security/private-key-file",
        category: "security",
        severity: "critical",
        title: "Private key or credential file present in repository",
        message: `Possible ${label} detected at ${file.relativePath}`,
        whyItMatters: agentsPresent
          ? "Credential material in the working tree can be read by AI coding agents and may leak into model context or logs. Filename heuristics only — contents were not inspected."
          : "Credential material in the working tree is high-risk repository content. No supported coding-agent configuration was detected, so agent-specific exposure was not asserted. Filename heuristics only — contents were not inspected.",
        recommendation:
          "Remove the file from the repository, rotate the credential, add ignore rules, and never commit replacements.",
        affectedAgents: affected,
        evidence: { path: file.relativePath, detail: label },
        fixability: "manual",
      });
    }

    return findings;
  },
};
