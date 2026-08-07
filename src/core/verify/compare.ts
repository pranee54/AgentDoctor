import type { Finding, FindingEvidence, Severity } from "../../types/index.js";

/** Stable subset of a finding for verify reports. */
export interface VerifyFindingRef {
  id: string;
  ruleId: string;
  severity: Severity;
  title: string;
  message: string;
  evidence?: FindingEvidence;
}

export interface FindingCompareResult {
  fixed: VerifyFindingRef[];
  remaining: VerifyFindingRef[];
  new: VerifyFindingRef[];
  unchanged: VerifyFindingRef[];
  summary: {
    fixed: number;
    remaining: number;
    new: number;
    unchanged: number;
    before: number;
    after: number;
  };
}

export function toVerifyFindingRef(finding: Finding): VerifyFindingRef {
  const ref: VerifyFindingRef = {
    id: finding.id,
    ruleId: finding.ruleId,
    severity: finding.severity,
    title: finding.title,
    message: finding.message,
  };
  if (finding.evidence !== undefined) {
    ref.evidence = { ...finding.evidence };
  }
  return ref;
}

function sortRefs(refs: VerifyFindingRef[]): VerifyFindingRef[] {
  return [...refs].sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Deterministic finding set comparison keyed by stable `Finding.id`.
 */
export function compareFindings(
  before: readonly Finding[],
  after: readonly Finding[],
): FindingCompareResult {
  const beforeById = new Map(before.map((f) => [f.id, f]));
  const afterById = new Map(after.map((f) => [f.id, f]));

  const fixed: VerifyFindingRef[] = [];
  const remaining: VerifyFindingRef[] = [];
  const newly: VerifyFindingRef[] = [];

  for (const [id, finding] of beforeById) {
    if (!afterById.has(id)) {
      fixed.push(toVerifyFindingRef(finding));
    } else {
      remaining.push(toVerifyFindingRef(afterById.get(id)!));
    }
  }

  for (const [id, finding] of afterById) {
    if (!beforeById.has(id)) {
      newly.push(toVerifyFindingRef(finding));
    }
  }

  const fixedSorted = sortRefs(fixed);
  const remainingSorted = sortRefs(remaining);
  const newSorted = sortRefs(newly);

  return {
    fixed: fixedSorted,
    remaining: remainingSorted,
    new: newSorted,
    unchanged: remainingSorted,
    summary: {
      fixed: fixedSorted.length,
      remaining: remainingSorted.length,
      new: newSorted.length,
      unchanged: remainingSorted.length,
      before: before.length,
      after: after.length,
    },
  };
}
