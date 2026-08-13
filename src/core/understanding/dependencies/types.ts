export type DependencyRelationType =
  | "import"
  | "require"
  | "dynamic-import"
  | "export"
  | "package"
  | "module"
  | "route"
  | "service"
  | "repository";

export interface DependencyMatch {
  from: string;
  to: string;
  type: DependencyRelationType;
  confidence: number;
  evidence: string[];
}

export interface DependencyDiscoveryResult {
  dependencies: DependencyMatch[];
  timingMs: number;
  filesConsidered: number;
  filesInspected: number;
}

export interface DependencyDiscoveryOptions {
  /** Repository root. Defaults to process.cwd(). */
  cwd?: string;
  /** Minimum confidence to include (0–1). Default 0.7. */
  minConfidence?: number;
  /** Max bytes to read from a source file. Default 256 KiB. */
  maxReadBytes?: number;
}

export interface ExtractedReference {
  specifier: string;
  type: DependencyRelationType;
  confidence: number;
}
