import { looksLikeSensitiveFilename, redactSecretValue } from "../../../../security/redaction.js";
import type { BrainEvidence } from "./types.js";

const SECRETISH = /(password|secret|token|api[_-]?key|private[_-]?key|credential)/i;

/** Ensure evidence never carries secret plaintext; paths for sensitive files become path-only. */
export function redactEvidence(evidence: BrainEvidence): BrainEvidence {
  const locator = evidence.locator;
  let redaction = evidence.redaction;
  let safeLocator = locator;
  let symbol = evidence.symbol;

  if (looksLikeSensitiveFilename(locator) || SECRETISH.test(locator)) {
    redaction = "path-only";
    // Keep path reference only; never attach contents.
    safeLocator = locator.split(/[/\\]/).slice(0, -1).concat("[REDACTED_NAME]").join("/");
    if (safeLocator === "[REDACTED_NAME]") {
      safeLocator = "[REDACTED_PATH]";
    }
  }
  if (symbol && SECRETISH.test(symbol)) {
    symbol = redactSecretValue(symbol);
    redaction = "redacted";
  }

  const next: BrainEvidence = {
    ...evidence,
    locator: safeLocator,
    redaction,
  };
  if (symbol !== undefined) {
    next.symbol = symbol;
  } else {
    delete (next as { symbol?: string }).symbol;
  }
  return next;
}

export function redactEvidenceList(list: readonly BrainEvidence[]): BrainEvidence[] {
  return list.map(redactEvidence);
}
