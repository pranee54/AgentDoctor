import type { ComponentRole, RelationshipKind, RelationshipStrength } from "./types.js";

export interface RolePairRule {
  source: ComponentRole;
  target: ComponentRole;
  relationship: RelationshipKind;
  baseConfidence: number;
  strength: RelationshipStrength;
}

/**
 * Deterministic semantic layer rules. Only applied when both roles are evidenced.
 */
export const ROLE_PAIR_RULES: readonly RolePairRule[] = [
  {
    source: "Controller",
    target: "Service",
    relationship: "USES",
    baseConfidence: 0.96,
    strength: "medium",
  },
  {
    source: "Service",
    target: "Repository",
    relationship: "USES",
    baseConfidence: 0.95,
    strength: "medium",
  },
  {
    source: "Repository",
    target: "Database",
    relationship: "USES",
    baseConfidence: 0.94,
    strength: "medium",
  },
  {
    source: "Route",
    target: "Controller",
    relationship: "EXPOSES",
    baseConfidence: 0.93,
    strength: "medium",
  },
  {
    source: "Widget",
    target: "Bloc",
    relationship: "USES",
    baseConfidence: 0.92,
    strength: "medium",
  },
  {
    source: "Bloc",
    target: "Repository",
    relationship: "USES",
    baseConfidence: 0.91,
    strength: "medium",
  },
  {
    source: "API",
    target: "Service",
    relationship: "CALLS",
    baseConfidence: 0.9,
    strength: "medium",
  },
  {
    source: "Module",
    target: "Configuration",
    relationship: "CONFIGURES",
    baseConfidence: 0.9,
    strength: "medium",
  },
  {
    source: "Module",
    target: "Controller",
    relationship: "PROVIDES",
    baseConfidence: 0.88,
    strength: "medium",
  },
  {
    source: "Module",
    target: "Service",
    relationship: "PROVIDES",
    baseConfidence: 0.88,
    strength: "medium",
  },
  {
    source: "EntryPoint",
    target: "Feature",
    relationship: "ENTERS",
    baseConfidence: 0.9,
    strength: "medium",
  },
  {
    source: "Package",
    target: "Module",
    relationship: "CONTAINS",
    baseConfidence: 0.9,
    strength: "strong",
  },
  {
    source: "Package",
    target: "Feature",
    relationship: "OWNS",
    baseConfidence: 0.88,
    strength: "strong",
  },
  {
    source: "Feature",
    target: "Domain",
    relationship: "PROVIDES",
    baseConfidence: 0.85,
    strength: "medium",
  },
  {
    source: "Feature",
    target: "Controller",
    relationship: "CONTAINS",
    baseConfidence: 0.86,
    strength: "strong",
  },
  {
    source: "Feature",
    target: "Service",
    relationship: "CONTAINS",
    baseConfidence: 0.86,
    strength: "strong",
  },
  {
    source: "Service",
    target: "Service",
    relationship: "CALLS",
    baseConfidence: 0.8,
    strength: "weak",
  },
  {
    source: "Controller",
    target: "Repository",
    relationship: "USES",
    baseConfidence: 0.84,
    strength: "weak",
  },
];

export const ROLE_PATH_PATTERNS: ReadonlyArray<{ role: ComponentRole; pattern: RegExp }> = [
  // Filename-specific roles first (win over directory names like apps/api/)
  { role: "Module", pattern: /\.module\.(t|j)sx?$/i },
  { role: "Configuration", pattern: /(^|\/|[-_.])config(uration)?([-_.]|$)/i },
  { role: "Controller", pattern: /(^|\/|[-_.])controllers?([-_.]|$)|controller\.(t|j)sx?$/i },
  { role: "Service", pattern: /(^|\/|[-_.])services?([-_.]|$)|service\.(t|j)sx?$/i },
  { role: "Repository", pattern: /(^|\/|[-_.])repositor(y|ies)([-_.]|$)|repository\.(t|j)sx?$/i },
  {
    role: "Database",
    pattern: /(^|\/|[-_.])(entity|entities|schema|models?|prisma|migration)([-_.]|$)/i,
  },
  {
    role: "Route",
    pattern: /(^|\/)routes?\/|(^|\/|[-_.])router([-_.]|$)|routes?\.(t|j)sx?$|web\.php$/i,
  },
  { role: "Widget", pattern: /widget\.(dart|tsx?|jsx?)$|_widget\.dart$/i },
  { role: "Bloc", pattern: /bloc\.(dart|tsx?)$|cubit\.dart$/i },
  {
    role: "EntryPoint",
    pattern: /(^|\/)main\.(t|j)sx?$|(^|\/)main\.dart$|(^|\/)index\.(t|j)sx?$/i,
  },
  // Broad directory heuristics last
  { role: "API", pattern: /(^|\/)api\/[^/]+$|api\.(t|j)sx?$/i },
];

export const STRENGTH_BOOST: Readonly<Record<RelationshipStrength, number>> = {
  strong: 0.03,
  medium: 0,
  weak: -0.05,
};

export function clampConfidence(value: number): number {
  if (value < 0) {
    return 0;
  }
  if (value > 0.99) {
    return 0.99;
  }
  return Math.round(value * 100) / 100;
}

export function strengthRank(strength: RelationshipStrength): number {
  switch (strength) {
    case "strong":
      return 3;
    case "medium":
      return 2;
    case "weak":
      return 1;
  }
}

export function maxStrength(
  a: RelationshipStrength,
  b: RelationshipStrength,
): RelationshipStrength {
  return strengthRank(a) >= strengthRank(b) ? a : b;
}

export function findRolePairRule(
  source: ComponentRole,
  target: ComponentRole,
): RolePairRule | undefined {
  return ROLE_PAIR_RULES.find((rule) => rule.source === source && rule.target === target);
}
