export type OwnershipSource = "codeowners" | "package-maintainers" | "maintainers-file";

export interface OwnershipMatch {
  /** Repository-relative path or glob covered by this ownership claim. */
  path: string;
  /** Owner handles / emails / team refs as written in evidence. */
  owners: readonly string[];
  confidence: number;
  evidence: readonly string[];
  source: OwnershipSource;
}

export interface OwnershipDiscoveryResult {
  ownerships: OwnershipMatch[];
  timingMs: number;
  filesConsidered: number;
  /** Explicit unknowns — never invent owners. */
  unknowns: string[];
}

export interface OwnershipDiscoveryOptions {
  cwd?: string;
  /** Optional file list (repo-relative). When omitted, discovery walks the tree. */
  relativePaths?: readonly string[];
  minConfidence?: number;
}
