/** Shared deterministic thresholds for context/instruction rules. */
export const THRESHOLDS = {
  /** Instruction file size (bytes) — info */
  instructionInfoBytes: 16 * 1024,
  /** Instruction file size (bytes) — warning */
  instructionWarningBytes: 32 * 1024,
  /** Log / dump file size that may pollute context */
  largeLogBytes: 256 * 1024,
  /** Unusually large lockfile (info only) */
  largeLockfileBytes: 2 * 1024 * 1024,
  /** Minimum content length before duplicate detection applies */
  duplicateMinChars: 80,
} as const;
