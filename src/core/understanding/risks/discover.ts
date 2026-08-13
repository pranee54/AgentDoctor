import type { ProjectModel } from "../model/types.js";
import { ownersForPath, type OwnershipDiscoveryResult } from "../ownership/index.js";
import type { RiskDiscoveryOptions, RiskDiscoveryResult, RiskMatch } from "./types.js";

function clampConfidence(value: number): number {
  if (value < 0) {
    return 0;
  }
  if (value > 1) {
    return 1;
  }
  return Math.round(value * 100) / 100;
}

function countFanIn(model: ProjectModel): Map<string, { count: number; evidence: string[] }> {
  const fanIn = new Map<string, { count: number; evidence: string[] }>();
  for (const dep of model.dependencies) {
    const bucket = fanIn.get(dep.to) ?? { count: 0, evidence: [] };
    bucket.count += 1;
    bucket.evidence.push(...dep.evidence);
    fanIn.set(dep.to, bucket);
  }
  return fanIn;
}

function countCoupling(model: ProjectModel): Map<string, { count: number; evidence: string[] }> {
  const coupling = new Map<string, { count: number; evidence: string[] }>();
  const bump = (key: string, evidence: readonly string[]): void => {
    const bucket = coupling.get(key) ?? { count: 0, evidence: [] };
    bucket.count += 1;
    bucket.evidence.push(...evidence);
    coupling.set(key, bucket);
  };
  for (const rel of model.relationships) {
    bump(rel.source, rel.evidence);
    bump(rel.target, rel.evidence);
  }
  return coupling;
}

/**
 * Discover change-danger risks from ProjectModel (+ optional ownership).
 * Deterministic; evidence-required; never invents vulnerability claims.
 */
export function discoverRisks(
  model: ProjectModel,
  ownership?: OwnershipDiscoveryResult,
  options: RiskDiscoveryOptions = {},
): RiskDiscoveryResult {
  const started = performance.now();
  const centralityThreshold = options.centralityThreshold ?? 3;
  const couplingThreshold = options.couplingThreshold ?? 4;
  const minConfidence = options.minConfidence ?? 0.5;
  const risks: RiskMatch[] = [];
  const unknowns: string[] = [];

  for (const entry of model.entrypoints) {
    risks.push({
      kind: "critical-entrypoint",
      target: entry.file,
      severity: "high",
      confidence: clampConfidence(Math.min(0.9, 0.55 + entry.confidence * 0.35)),
      evidence: [...entry.evidence, `entrypoint:${entry.framework}`],
      rationale: "Entrypoints are high-blast-radius change surfaces",
    });
  }

  const fanIn = countFanIn(model);
  for (const [target, bucket] of fanIn) {
    if (bucket.count < centralityThreshold) {
      continue;
    }
    risks.push({
      kind: "dependency-centrality",
      target,
      severity: bucket.count >= centralityThreshold * 2 ? "high" : "medium",
      confidence: clampConfidence(Math.min(0.92, 0.5 + bucket.count * 0.08)),
      evidence: [...new Set(bucket.evidence)].sort((a, b) => a.localeCompare(b)).slice(0, 12),
      rationale: `${bucket.count} inbound dependencies — changes here fan out`,
    });
  }

  const coupling = countCoupling(model);
  for (const [target, bucket] of coupling) {
    if (bucket.count < couplingThreshold) {
      continue;
    }
    risks.push({
      kind: "high-coupling",
      target,
      severity: bucket.count >= couplingThreshold * 2 ? "high" : "medium",
      confidence: clampConfidence(Math.min(0.9, 0.48 + bucket.count * 0.07)),
      evidence: [...new Set(bucket.evidence)].sort((a, b) => a.localeCompare(b)).slice(0, 12),
      rationale: `${bucket.count} relationship edges — tightly coupled change surface`,
    });
  }

  for (const arch of model.architectures) {
    if (arch.conflictingEvidence.length === 0) {
      continue;
    }
    risks.push({
      kind: "architecture-conflict",
      target: arch.pattern,
      severity: "medium",
      confidence: clampConfidence(Math.min(0.85, 0.4 + arch.conflictingEvidence.length * 0.1)),
      evidence: [...arch.conflictingEvidence, ...arch.evidence].slice(0, 12),
      rationale: "Architecture hypothesis has conflicting evidence — change guidance is weaker",
    });
  }

  if (ownership) {
    const candidates = [
      ...model.entrypoints.map((e) => e.file),
      ...model.domains.flatMap((d) => d.paths.slice(0, 3)),
    ];
    const seen = new Set<string>();
    for (const candidate of candidates) {
      const key = candidate.replace(/\\/g, "/");
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      const owner = ownersForPath(key, ownership.ownerships);
      if (owner) {
        continue;
      }
      risks.push({
        kind: "unclear-ownership",
        target: key,
        severity: "medium",
        confidence: 0.7,
        evidence: [`path:${key}`, "ownership:none"],
        rationale: "No CODEOWNERS / MAINTAINERS / package maintainers evidence covers this path",
      });
    }
    if (ownership.unknowns.length > 0 && ownership.ownerships.length === 0) {
      unknowns.push(...ownership.unknowns);
    }
  } else {
    unknowns.push("Ownership input omitted — unclear-ownership risks not evaluated");
  }

  if (model.dependencies.length === 0) {
    unknowns.push("No dependencies modeled — centrality risks unavailable");
  }

  const filtered = risks
    .filter((risk) => risk.confidence >= minConfidence)
    .sort(
      (a, b) =>
        severityRank(b.severity) - severityRank(a.severity) ||
        b.confidence - a.confidence ||
        a.kind.localeCompare(b.kind) ||
        a.target.localeCompare(b.target),
    );

  return {
    risks: filtered,
    timingMs: Math.max(0, Math.round(performance.now() - started)),
    unknowns: [...new Set(unknowns)].sort((a, b) => a.localeCompare(b)),
  };
}

function severityRank(severity: RiskMatch["severity"]): number {
  switch (severity) {
    case "high":
      return 3;
    case "medium":
      return 2;
    case "low":
      return 1;
    default:
      return 0;
  }
}
