import { looksLikeSensitiveFilename, redactSecretValue } from "../../../security/redaction.js";
import type { BrainClaim } from "./claims/types.js";
import { redactEvidenceList } from "./evidence/index.js";
import type { ProjectBrain } from "./types.js";

const SECRETISH =
  /(password|secret|token|api[_-]?key|private[_-]?key|BEGIN [A-Z ]*PRIVATE KEY|credential)/i;

function scrubString(value: string): string {
  if (SECRETISH.test(value)) {
    return redactSecretValue(value);
  }
  return value;
}

function scrubClaim(claim: BrainClaim): BrainClaim {
  return {
    ...claim,
    subject: looksLikeSensitiveFilename(claim.subject)
      ? "[REDACTED_PATH]"
      : scrubString(claim.subject),
    object: scrubString(claim.object),
  };
}

/** Deep-safe Brain for disk/export: redact evidence and secret-like claim strings. */
export function redactBrainForStorage(brain: ProjectBrain): ProjectBrain {
  return {
    ...brain,
    claims: brain.claims.map(scrubClaim),
    evidence: redactEvidenceList(brain.evidence),
    ownership: {
      ...brain.ownership,
      // timingMs is wall-clock and must not affect durable identity.
      timingMs: 0,
      ownerships: brain.ownership.ownerships.map((o) => ({
        ...o,
        evidence: o.evidence.map((e) =>
          looksLikeSensitiveFilename(e) ? e.replace(/[^/\\]+$/, "[REDACTED_NAME]") : e,
        ),
      })),
    },
    risks: {
      ...brain.risks,
      timingMs: 0,
      risks: brain.risks.risks.map((r) => ({
        ...r,
        evidence: r.evidence.map((e) => scrubString(e)),
      })),
    },
  };
}
