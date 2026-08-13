import {
  emptyRuleResult,
  findRelationships,
  hasRelationship,
  relationshipEvidenceLines,
} from "../models.js";
import type {
  ArchitecturePatternDefinition,
  PatternRuleContext,
  PatternRuleResult,
} from "../types.js";

function evaluateMvc(ctx: PatternRuleContext): PatternRuleResult {
  const result = emptyRuleResult();
  const routeToController = findRelationships(ctx.input, {
    relationship: "EXPOSES",
    targetIncludes: "Controller",
  });
  const controllerToService = findRelationships(ctx.input, {
    relationship: ["USES", "CALLS"],
    sourceIncludes: "Controller",
    targetIncludes: "Service",
  });

  if (routeToController.length > 0) {
    result.matchedRules.push("Route -> Controller");
    result.evidence.push(...relationshipEvidenceLines(routeToController));
    result.supportScore += 1.2;
  }
  if (controllerToService.length > 0) {
    result.matchedRules.push("Controller -> Service");
    result.evidence.push(...relationshipEvidenceLines(controllerToService));
    result.supportScore += 1.4;
  }

  const widgetBloc = findRelationships(ctx.input, {
    relationship: "USES",
    sourceIncludes: "Widget",
    targetIncludes: "Bloc",
  });
  if (widgetBloc.length > 0) {
    result.conflictingEvidence.push(
      ...relationshipEvidenceLines(widgetBloc).map(
        (e) => `BLoC-style edge conflicts with MVC: ${e}`,
      ),
    );
    result.conflictScore += 1.1;
  }

  if (result.matchedRules.length > 0 && !hasRelationship(ctx.input, { evidenceIncludes: "View" })) {
    result.unknowns.push("No View layer evidence");
  }
  return result;
}

function evaluateMvvm(ctx: PatternRuleContext): PatternRuleResult {
  const result = emptyRuleResult(["No explicit ViewModel role in relationship graph"]);
  const viewModelish = findRelationships(ctx.input, {
    evidenceIncludes: ["viewmodel", "view-model", "ViewModel"],
  });
  const widgetToService = findRelationships(ctx.input, {
    relationship: "USES",
    sourceIncludes: ["Widget", "View"],
    targetIncludes: ["Service", "ViewModel", "Model"],
  });

  if (viewModelish.length > 0) {
    result.matchedRules.push("ViewModel naming in relationships");
    result.evidence.push(...relationshipEvidenceLines(viewModelish));
    result.supportScore += 1.5;
    result.unknowns = [];
  }
  if (widgetToService.length > 0 && viewModelish.length > 0) {
    result.matchedRules.push("View/Widget binds to model layer");
    result.evidence.push(...relationshipEvidenceLines(widgetToService));
    result.supportScore += 1;
  }

  const controllerService = findRelationships(ctx.input, {
    relationship: "USES",
    sourceIncludes: "Controller",
    targetIncludes: "Service",
  });
  if (controllerService.length > 0 && viewModelish.length === 0) {
    result.conflictingEvidence.push("Controller -> Service edges look like MVC, not MVVM");
    result.conflictScore += 0.8;
  }
  return result;
}

function evaluateClean(ctx: PatternRuleContext): PatternRuleResult {
  const result = emptyRuleResult();
  const controllerService = findRelationships(ctx.input, {
    relationship: ["USES", "CALLS"],
    sourceIncludes: "Controller",
    targetIncludes: "Service",
  });
  const serviceRepo = findRelationships(ctx.input, {
    relationship: "USES",
    sourceIncludes: "Service",
    targetIncludes: "Repository",
  });
  const repoDb = findRelationships(ctx.input, {
    relationship: "USES",
    sourceIncludes: "Repository",
    targetIncludes: ["Database", "Entity"],
  });
  const implementsPort = findRelationships(ctx.input, {
    relationship: "IMPLEMENTS",
  });

  if (controllerService.length && serviceRepo.length && repoDb.length) {
    result.matchedRules.push("Presentation -> Application -> Domain -> Infrastructure");
    result.evidence.push(
      ...relationshipEvidenceLines(controllerService),
      ...relationshipEvidenceLines(serviceRepo),
      ...relationshipEvidenceLines(repoDb),
    );
    result.supportScore += 2.2;
  } else {
    if (controllerService.length) {
      result.matchedRules.push("Presentation calls application services");
      result.evidence.push(...relationshipEvidenceLines(controllerService));
      result.supportScore += 0.7;
    }
    if (serviceRepo.length) {
      result.matchedRules.push("Application depends on repositories");
      result.evidence.push(...relationshipEvidenceLines(serviceRepo));
      result.supportScore += 0.8;
    }
    if (repoDb.length) {
      result.matchedRules.push("Repositories touch infrastructure/persistence");
      result.evidence.push(...relationshipEvidenceLines(repoDb));
      result.supportScore += 0.8;
    }
  }

  if (implementsPort.length > 0) {
    result.matchedRules.push("Repositories behind interfaces");
    result.evidence.push(...relationshipEvidenceLines(implementsPort));
    result.supportScore += 1.3;
  } else if (result.matchedRules.length > 0) {
    result.unknowns.push("No dependency inversion metadata");
  }

  const controllerRepo = findRelationships(ctx.input, {
    relationship: "USES",
    sourceIncludes: "Controller",
    targetIncludes: ["Repository", "Database", "Entity"],
  });
  if (controllerRepo.length > 0) {
    result.conflictingEvidence.push(
      `Infrastructure accessed directly in ${controllerRepo.length} module(s)`,
    );
    result.conflictScore += 1.2 * Math.min(controllerRepo.length, 3);
  }
  return result;
}

function evaluateLayered(ctx: PatternRuleContext): PatternRuleResult {
  const result = emptyRuleResult();
  const layers = [
    findRelationships(ctx.input, {
      relationship: ["USES", "CALLS", "EXPOSES"],
      evidenceIncludes: "Controller → Service",
    }),
    findRelationships(ctx.input, {
      relationship: "USES",
      evidenceIncludes: "Service → Repository",
    }),
    findRelationships(ctx.input, {
      relationship: "USES",
      evidenceIncludes: "Repository → Database",
    }),
  ];
  let depth = 0;
  if (layers[0]?.length) {
    depth += 1;
    result.matchedRules.push("Controller layer above Service layer");
    result.evidence.push(...relationshipEvidenceLines(layers[0]));
  }
  if (layers[1]?.length) {
    depth += 1;
    result.matchedRules.push("Service layer above Repository layer");
    result.evidence.push(...relationshipEvidenceLines(layers[1]));
  }
  if (layers[2]?.length) {
    depth += 1;
    result.matchedRules.push("Repository layer above persistence");
    result.evidence.push(...relationshipEvidenceLines(layers[2]));
  }
  if (depth >= 2) {
    result.supportScore += depth * 0.9;
  }
  if (depth >= 2 && findRelationships(ctx.input, { relationship: "IMPLEMENTS" }).length === 0) {
    result.unknowns.push("Layering observed without explicit ports/interfaces");
  }
  return result;
}

function evaluateHexagonal(ctx: PatternRuleContext): PatternRuleResult {
  const result = emptyRuleResult();
  const ports = findRelationships(ctx.input, { relationship: "IMPLEMENTS" });
  const moduleProvides = findRelationships(ctx.input, {
    relationship: "PROVIDES",
    sourceIncludes: "Module",
  });
  const configures = findRelationships(ctx.input, { relationship: "CONFIGURES" });

  if (ports.length > 0) {
    result.matchedRules.push("Port interfaces implemented by adapters");
    result.evidence.push(...relationshipEvidenceLines(ports));
    result.supportScore += 1.4;
  }
  if (moduleProvides.length > 0) {
    result.matchedRules.push("Composition root wires application ports");
    result.evidence.push(...relationshipEvidenceLines(moduleProvides));
    result.supportScore += 1;
  }
  if (configures.length > 0) {
    result.matchedRules.push("Adapters configured at boundaries");
    result.evidence.push(...relationshipEvidenceLines(configures));
    result.supportScore += 0.8;
  }
  if (result.matchedRules.length > 0 && ports.length === 0) {
    result.unknowns.push("No explicit port/adapter naming beyond module wiring");
  }
  const leak = findRelationships(ctx.input, {
    relationship: "USES",
    sourceIncludes: "Controller",
    targetIncludes: ["Database", "Entity"],
  });
  if (leak.length > 0) {
    result.conflictingEvidence.push("Controllers depend on infrastructure entities");
    result.conflictScore += 1;
  }
  return result;
}

function evaluateOnion(ctx: PatternRuleContext): PatternRuleResult {
  const result = emptyRuleResult();
  const domainNames = ctx.input.domains.domains.map((d) => d.name);
  const domainProvides =
    domainNames.length > 0
      ? findRelationships(ctx.input, {
          relationship: "PROVIDES",
          targetIncludes: domainNames,
        })
      : [];
  const featureContains = findRelationships(ctx.input, { relationship: "CONTAINS" });
  const repo = findRelationships(ctx.input, {
    relationship: "USES",
    sourceIncludes: "Service",
    targetIncludes: "Repository",
  });

  if (
    ctx.input.domains.domains.length > 0 &&
    (domainProvides.length > 0 || featureContains.length > 0)
  ) {
    result.matchedRules.push("Domain concepts at the center of feature slices");
    result.evidence.push(
      ...ctx.input.domains.domains.slice(0, 3).map((d) => `domain:${d.name}`),
      ...relationshipEvidenceLines(domainProvides),
    );
    result.supportScore += 1.2;
  }
  if (repo.length > 0) {
    result.matchedRules.push("Outer layers depend inward toward repositories/domain");
    result.evidence.push(...relationshipEvidenceLines(repo));
    result.supportScore += 1;
  }
  if (result.matchedRules.length > 0 && domainProvides.length === 0) {
    result.unknowns.push("Domain labels present but weak inward dependency proof");
  }
  return result;
}

function evaluateDdd(ctx: PatternRuleContext): PatternRuleResult {
  const result = emptyRuleResult();
  if (ctx.input.domains.domains.length >= 1) {
    result.matchedRules.push("Bounded domain vocabulary discovered");
    result.evidence.push(
      ...ctx.input.domains.domains
        .slice(0, 4)
        .map((d) => `domain ${d.name} (confidence ${d.confidence}) via ${d.evidence[0] ?? "path"}`),
    );
    result.supportScore += Math.min(ctx.input.domains.domains.length, 3) * 0.7;
  }
  const provides = findRelationships(ctx.input, {
    relationship: "PROVIDES",
    evidenceIncludes: "domain",
  });
  if (provides.length > 0) {
    result.matchedRules.push("Features provide domain capabilities");
    result.evidence.push(...relationshipEvidenceLines(provides));
    result.supportScore += 1.1;
  }
  const aggregates = findRelationships(ctx.input, {
    relationship: "USES",
    sourceIncludes: "Repository",
    targetIncludes: ["Entity", "Database"],
  });
  if (aggregates.length > 0) {
    result.matchedRules.push("Repositories protect persistence/entity access");
    result.evidence.push(...relationshipEvidenceLines(aggregates));
    result.supportScore += 0.9;
  }
  if (result.matchedRules.length > 0 && provides.length === 0) {
    result.unknowns.push("No explicit aggregate/root relationship metadata");
  }
  return result;
}

export const layeredPatterns: ArchitecturePatternDefinition[] = [
  { pattern: "MVC", evaluate: evaluateMvc },
  { pattern: "MVVM", evaluate: evaluateMvvm },
  { pattern: "Clean Architecture", evaluate: evaluateClean },
  { pattern: "Layered Architecture", evaluate: evaluateLayered },
  { pattern: "Hexagonal", evaluate: evaluateHexagonal },
  { pattern: "Onion", evaluate: evaluateOnion },
  { pattern: "DDD", evaluate: evaluateDdd },
];
