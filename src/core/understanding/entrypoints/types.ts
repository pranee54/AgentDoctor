export type EntrypointFramework =
  | "Flutter"
  | "Laravel"
  | "React"
  | "Next.js"
  | "Node"
  | "NestJS"
  | "Python"
  | "Django"
  | "Java"
  | "Go"
  | "Rust";

export interface EntrypointMatch {
  framework: EntrypointFramework;
  file: string;
  confidence: number;
  evidence: string[];
}

export interface EntrypointDiscoveryResult {
  entrypoints: EntrypointMatch[];
  timingMs: number;
  filesConsidered: number;
  filesInspected: number;
}

export interface EntrypointDiscoveryOptions {
  cwd?: string;
  /** Minimum confidence to include (0–1). Default 0.55. */
  minConfidence?: number;
  /** Max bytes to read from a candidate file. Default 256 KiB. */
  maxReadBytes?: number;
}
