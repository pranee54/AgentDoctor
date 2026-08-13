export type UnderstandingConfidence = number;

export interface UnderstandingEvidence {
  path: string;
}

export interface DomainMatch {
  name: string;
  confidence: UnderstandingConfidence;
  evidence: string[];
}

export interface DomainDiscoveryResult {
  domains: DomainMatch[];
  timingMs: number;
  filesConsidered: number;
}

export interface DomainDiscoveryOptions {
  /** Repository root. Defaults to process.cwd(). */
  cwd?: string;
  /** Minimum confidence to include a domain (0–1). Default 0.5. */
  minConfidence?: number;
  /** Minimum distinct evidence paths required. Default 1. */
  minEvidence?: number;
}
