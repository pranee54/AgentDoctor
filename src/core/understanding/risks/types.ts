export type RiskKind =
  | "critical-entrypoint"
  | "dependency-centrality"
  | "unclear-ownership"
  | "architecture-conflict"
  | "high-coupling";

export type RiskSeverity = "high" | "medium" | "low";

/**
 * Change-danger risk: how dangerous is modifying this part of the software?
 * Not generic SAST.
 */
export interface RiskMatch {
  kind: RiskKind;
  target: string;
  severity: RiskSeverity;
  confidence: number;
  evidence: readonly string[];
  rationale: string;
}

export interface RiskDiscoveryResult {
  risks: RiskMatch[];
  timingMs: number;
  unknowns: string[];
}

export interface RiskDiscoveryOptions {
  /** Minimum fan-in for dependency-centrality. Default 3. */
  centralityThreshold?: number;
  /** Minimum relationship edges for high-coupling. Default 4. */
  couplingThreshold?: number;
  minConfidence?: number;
}
