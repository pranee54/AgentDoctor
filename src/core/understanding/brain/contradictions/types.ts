export interface BrainContradiction {
  id: string;
  snapshotId: string;
  claimIds: readonly string[];
  subject: string;
  predicate: string;
  values: readonly string[];
  evidenceIds: readonly string[];
  confidence: number;
  rationale: string;
}

export function createContradictionId(
  subject: string,
  predicate: string,
  values: readonly string[],
): string {
  const key = `${subject}\0${predicate}\0${[...values].sort().join("|")}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return `contra_${hash.toString(16).padStart(8, "0")}`;
}
