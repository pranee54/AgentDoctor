import type { DependencyMatch } from "../dependencies/types.js";
import type { EntrypointMatch } from "../entrypoints/types.js";
import type { RelationshipMatch } from "../relationships/types.js";
import type {
  ArchitectureInferenceInput,
  ArchitectureMatch,
  PatternRuleResult,
  RelationPredicate,
} from "./types.js";

export function clampConfidence(value: number): number {
  if (value < 0) {
    return 0;
  }
  // Never claim certainty.
  if (value > 0.95) {
    return 0.95;
  }
  return Math.round(value * 100) / 100;
}

export function scorePatternConfidence(options: {
  supportScore: number;
  conflictScore: number;
  matchedRuleCount: number;
}): number {
  const { supportScore, conflictScore, matchedRuleCount } = options;
  if (matchedRuleCount <= 0 || supportScore <= 0) {
    return 0;
  }
  const raw = supportScore / (supportScore + conflictScore * 1.25 + 0.35);
  const ruleBonus = Math.min(matchedRuleCount, 4) * 0.03;
  return clampConfidence(raw + ruleBonus);
}

function asList(value: string | string[] | undefined): string[] {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function includesAny(haystack: string, needles: string[]): boolean {
  if (needles.length === 0) {
    return true;
  }
  const lower = haystack.toLowerCase();
  return needles.some((n) => lower.includes(n.toLowerCase()));
}

export function findRelationships(
  input: ArchitectureInferenceInput,
  predicate: RelationPredicate,
): RelationshipMatch[] {
  const kinds = asList(predicate.relationship as string | string[] | undefined);
  const sources = asList(predicate.sourceIncludes);
  const targets = asList(predicate.targetIncludes);
  const evidenceNeedles = asList(predicate.evidenceIncludes);

  return input.relationships.relationships.filter((rel) => {
    if (kinds.length > 0 && !kinds.includes(rel.relationship)) {
      return false;
    }
    if (sources.length > 0 && !includesAny(rel.source, sources)) {
      return false;
    }
    if (targets.length > 0 && !includesAny(rel.target, targets)) {
      return false;
    }
    if (evidenceNeedles.length > 0) {
      const blob = `${rel.source} ${rel.target} ${rel.evidence.join(" ")}`;
      if (!includesAny(blob, evidenceNeedles)) {
        return false;
      }
    }
    return true;
  });
}

export function hasRelationship(
  input: ArchitectureInferenceInput,
  predicate: RelationPredicate,
): boolean {
  return findRelationships(input, predicate).length > 0;
}

export function relationshipEvidenceLines(rels: RelationshipMatch[], limit = 3): string[] {
  return rels
    .slice(0, limit)
    .flatMap((r) =>
      r.evidence.slice(0, 1).map((e) => `${r.source} ${r.relationship} ${r.target}: ${e}`),
    );
}

export function findDependencies(
  input: ArchitectureInferenceInput,
  options: {
    type?: DependencyMatch["type"] | DependencyMatch["type"][];
    evidenceIncludes?: string | string[];
  } = {},
): DependencyMatch[] {
  const types = asList(options.type as string | string[] | undefined);
  const needles = asList(options.evidenceIncludes);
  return input.dependencies.dependencies.filter((dep) => {
    if (types.length > 0 && !types.includes(dep.type)) {
      return false;
    }
    if (needles.length > 0) {
      const blob = `${dep.from} ${dep.to} ${dep.evidence.join(" ")}`;
      if (!includesAny(blob, needles)) {
        return false;
      }
    }
    return true;
  });
}

export function findEntrypoints(
  input: ArchitectureInferenceInput,
  options: {
    framework?: EntrypointMatch["framework"] | EntrypointMatch["framework"][];
    evidenceIncludes?: string | string[];
  } = {},
): EntrypointMatch[] {
  const frameworks = asList(options.framework as string | string[] | undefined);
  const needles = asList(options.evidenceIncludes);
  return input.entrypoints.entrypoints.filter((entry) => {
    if (frameworks.length > 0 && !frameworks.includes(entry.framework)) {
      return false;
    }
    if (needles.length > 0) {
      const blob = `${entry.file} ${entry.evidence.join(" ")}`;
      if (!includesAny(blob, needles)) {
        return false;
      }
    }
    return true;
  });
}

export function emptyRuleResult(unknowns: string[] = []): PatternRuleResult {
  return {
    matchedRules: [],
    evidence: [],
    conflictingEvidence: [],
    unknowns,
    supportScore: 0,
    conflictScore: 0,
  };
}

export function finalizeMatch(
  pattern: ArchitectureMatch["pattern"],
  result: PatternRuleResult,
): ArchitectureMatch | null {
  if (result.matchedRules.length === 0 || result.supportScore <= 0) {
    return null;
  }
  const confidence = scorePatternConfidence({
    supportScore: result.supportScore,
    conflictScore: result.conflictScore,
    matchedRuleCount: result.matchedRules.length,
  });
  if (confidence <= 0) {
    return null;
  }
  return {
    pattern,
    confidence,
    evidence: [...result.evidence].sort((a, b) => a.localeCompare(b)),
    matchedRules: [...result.matchedRules].sort((a, b) => a.localeCompare(b)),
    conflictingEvidence: [...result.conflictingEvidence].sort((a, b) => a.localeCompare(b)),
    unknowns: [...result.unknowns].sort((a, b) => a.localeCompare(b)),
  };
}
