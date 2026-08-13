import {
  emptyRuleResult,
  findDependencies,
  findEntrypoints,
  findRelationships,
  relationshipEvidenceLines,
} from "../models.js";
import type {
  ArchitecturePatternDefinition,
  PatternRuleContext,
  PatternRuleResult,
} from "../types.js";

function evaluateMicroservice(ctx: PatternRuleContext): PatternRuleResult {
  const result = emptyRuleResult();
  const frameworks = new Set(ctx.input.entrypoints.entrypoints.map((e) => e.framework));
  const packageDeps = findDependencies(ctx.input, { type: "package" });

  if (frameworks.size >= 2) {
    result.matchedRules.push("Multiple runtime entrypoint frameworks");
    result.evidence.push(
      ...ctx.input.entrypoints.entrypoints
        .slice(0, 5)
        .map((e) => `entrypoint:${e.framework}:${e.file}`),
    );
    result.supportScore += frameworks.size * 0.7;
  }
  if (packageDeps.length >= 2) {
    result.matchedRules.push("Multiple independently versioned package boundaries");
    result.evidence.push(
      ...packageDeps.slice(0, 4).map((d) => `${d.from} package-depends ${d.to}`),
    );
    result.supportScore += 0.8;
  }

  const moduleConfig = findRelationships(ctx.input, { relationship: "CONFIGURES" });
  if (frameworks.size >= 2 && moduleConfig.length > 0 && packageDeps.length <= 1) {
    result.conflictingEvidence.push(
      "Shared module configuration suggests modular monolith more than pure microservices",
    );
    result.conflictScore += 0.7;
  }
  if (result.matchedRules.length > 0 && frameworks.size < 2) {
    result.unknowns.push("Package splits without multi-runtime entrypoint proof");
  }
  return result;
}

function evaluateModularMonolith(ctx: PatternRuleContext): PatternRuleResult {
  const result = emptyRuleResult();
  const modules = findRelationships(ctx.input, {
    relationship: ["PROVIDES", "CONFIGURES"],
    sourceIncludes: "Module",
  });
  const nest = findEntrypoints(ctx.input, { framework: "NestJS" });
  const packageDeps = findDependencies(ctx.input, { type: "package" });
  const frameworks = new Set(ctx.input.entrypoints.entrypoints.map((e) => e.framework));

  if (modules.length > 0) {
    result.matchedRules.push("Internal modules provide/configure application parts");
    result.evidence.push(...relationshipEvidenceLines(modules));
    result.supportScore += 1.4;
  }
  if (nest.length > 0 || (frameworks.size === 1 && modules.length > 0)) {
    result.matchedRules.push("Single primary application runtime hosts modules");
    result.evidence.push(
      ...[...frameworks].map((f) => `runtime:${f}`),
      ...nest.slice(0, 2).map((e) => `entrypoint:${e.file}`),
    );
    result.supportScore += 1;
  }
  if (packageDeps.length > 0 && modules.length > 0) {
    result.matchedRules.push("Workspace packages compose one deployable system");
    result.evidence.push(...packageDeps.slice(0, 3).map((d) => `${d.from}->${d.to}`));
    result.supportScore += 0.8;
  }
  if (frameworks.size >= 3) {
    result.conflictingEvidence.push("Many independent runtimes weaken modular-monolith claim");
    result.conflictScore += 0.9;
  }
  if (result.matchedRules.length > 0 && modules.length === 0) {
    result.unknowns.push("Monolith packaging without module wiring evidence");
  }
  return result;
}

function evaluatePlugin(ctx: PatternRuleContext): PatternRuleResult {
  const result = emptyRuleResult();
  const dynamic = findDependencies(ctx.input, { type: "dynamic-import" });
  const moduleProvides = findRelationships(ctx.input, {
    relationship: "PROVIDES",
    sourceIncludes: "Module",
  });

  if (dynamic.length > 0) {
    result.matchedRules.push("Dynamic imports indicate pluggable extension points");
    result.evidence.push(
      ...dynamic.slice(0, 4).map((d) => `dynamic:${d.from}->${d.to} (${d.evidence[0] ?? ""})`),
    );
    result.supportScore += 1.5;
  }
  if (moduleProvides.length > 0 && dynamic.length > 0) {
    result.matchedRules.push("Modules expose extension surfaces");
    result.evidence.push(...relationshipEvidenceLines(moduleProvides));
    result.supportScore += 0.9;
  }
  if (dynamic.length > 0 && moduleProvides.length === 0) {
    result.unknowns.push("Dynamic loading without explicit module/plugin registry evidence");
  }
  return result;
}

function evaluateMonorepo(ctx: PatternRuleContext): PatternRuleResult {
  const result = emptyRuleResult();
  const packageDeps = findDependencies(ctx.input, {
    type: "package",
    evidenceIncludes: ["declares dependency", "package"],
  });
  const owns = findRelationships(ctx.input, { relationship: "OWNS" });
  const depends = findDependencies(ctx.input, { type: "package" });

  if (depends.length > 0) {
    result.matchedRules.push("Workspace package dependency edges");
    result.evidence.push(
      ...depends.slice(0, 5).map((d) => `${d.from} DEPENDS_ON ${d.to}: ${d.evidence[0] ?? d.type}`),
    );
    result.supportScore += Math.min(depends.length, 4) * 0.55;
  }
  if (packageDeps.length > 0) {
    result.matchedRules.push("Manifest-declared workspace references");
    result.supportScore += 0.8;
  }
  if (owns.length > 0) {
    result.matchedRules.push("Packages own feature/module slices");
    result.evidence.push(...relationshipEvidenceLines(owns));
    result.supportScore += 0.7;
  }
  if (result.matchedRules.length > 0 && depends.length < 1) {
    result.unknowns.push("Monorepo layout cues without package dependency edges");
  }
  return result;
}

export const distributionPatterns: ArchitecturePatternDefinition[] = [
  { pattern: "Microservice", evaluate: evaluateMicroservice },
  { pattern: "Modular Monolith", evaluate: evaluateModularMonolith },
  { pattern: "Plugin Architecture", evaluate: evaluatePlugin },
  { pattern: "Monorepo Workspace", evaluate: evaluateMonorepo },
];
