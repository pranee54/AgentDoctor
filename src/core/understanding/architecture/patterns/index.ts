import { distributionPatterns } from "./distribution.js";
import { layeredPatterns } from "./layered.js";
import { structuralPatterns } from "./structural.js";
import type { ArchitecturePatternDefinition } from "../types.js";

export const ARCHITECTURE_PATTERNS: readonly ArchitecturePatternDefinition[] = [
  ...layeredPatterns,
  ...structuralPatterns,
  ...distributionPatterns,
];
