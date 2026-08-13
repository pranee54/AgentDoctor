import { ARCHITECTURE_PATTERNS } from "./patterns/index.js";
import type { ArchitecturePatternDefinition } from "./types.js";

/** Ordered pattern rule registry used by the inference engine. */
export const ARCHITECTURE_RULES: readonly ArchitecturePatternDefinition[] = ARCHITECTURE_PATTERNS;

export function listArchitecturePatterns(): string[] {
  return ARCHITECTURE_RULES.map((rule) => rule.pattern);
}
