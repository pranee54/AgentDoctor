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

function evaluateRepository(ctx: PatternRuleContext): PatternRuleResult {
  const result = emptyRuleResult();
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
  if (serviceRepo.length > 0) {
    result.matchedRules.push("Services depend on repositories");
    result.evidence.push(...relationshipEvidenceLines(serviceRepo));
    result.supportScore += 1.4;
  }
  if (repoDb.length > 0) {
    result.matchedRules.push("Repositories encapsulate persistence");
    result.evidence.push(...relationshipEvidenceLines(repoDb));
    result.supportScore += 1.2;
  }
  const leak = findRelationships(ctx.input, {
    relationship: "USES",
    sourceIncludes: "Controller",
    targetIncludes: ["Database", "Entity"],
  });
  if (leak.length > 0) {
    result.conflictingEvidence.push("Controllers bypass repositories to persistence");
    result.conflictScore += 1;
  }
  if (result.matchedRules.length > 0 && repoDb.length === 0) {
    result.unknowns.push("Repository present without clear persistence target");
  }
  return result;
}

function evaluateServiceLayer(ctx: PatternRuleContext): PatternRuleResult {
  const result = emptyRuleResult();
  const controllerService = findRelationships(ctx.input, {
    relationship: ["USES", "CALLS"],
    sourceIncludes: ["Controller", "API", "Route"],
    targetIncludes: "Service",
  });
  const apiService = findRelationships(ctx.input, {
    relationship: "CALLS",
    sourceIncludes: "API",
    targetIncludes: "Service",
  });
  if (controllerService.length > 0) {
    result.matchedRules.push("Application entrypoints delegate to services");
    result.evidence.push(...relationshipEvidenceLines(controllerService));
    result.supportScore += 1.5;
  }
  if (apiService.length > 0) {
    result.matchedRules.push("API layer calls service layer");
    result.evidence.push(...relationshipEvidenceLines(apiService));
    result.supportScore += 1.1;
  }
  if (result.matchedRules.length > 0) {
    const serviceRepo = findRelationships(ctx.input, {
      relationship: "USES",
      sourceIncludes: "Service",
      targetIncludes: "Repository",
    });
    if (serviceRepo.length === 0) {
      result.unknowns.push("Service layer detected without downstream repository edges");
    }
  }
  return result;
}

function evaluateFeatureFirst(ctx: PatternRuleContext): PatternRuleResult {
  const result = emptyRuleResult();
  const contains = findRelationships(ctx.input, { relationship: "CONTAINS" });
  const consumes = findRelationships(ctx.input, { relationship: "CONSUMES" });
  const owns = findRelationships(ctx.input, { relationship: "OWNS" });

  if (contains.length >= 2) {
    result.matchedRules.push("Features contain multiple components");
    result.evidence.push(...relationshipEvidenceLines(contains, 4));
    result.supportScore += 1.3;
  }
  if (consumes.length > 0) {
    result.matchedRules.push("Cross-feature consumption edges");
    result.evidence.push(...relationshipEvidenceLines(consumes));
    result.supportScore += 1.2;
  }
  if (owns.length > 0) {
    result.matchedRules.push("Packages own feature slices");
    result.evidence.push(...relationshipEvidenceLines(owns));
    result.supportScore += 0.8;
  }
  if (result.matchedRules.length > 0 && consumes.length === 0) {
    result.unknowns.push("Feature folders present without cross-feature dependency proof");
  }
  return result;
}

function evaluateBloc(ctx: PatternRuleContext): PatternRuleResult {
  const result = emptyRuleResult();
  const widgetBloc = findRelationships(ctx.input, {
    relationship: "USES",
    sourceIncludes: "Widget",
    targetIncludes: "Bloc",
  });
  const blocRepo = findRelationships(ctx.input, {
    relationship: "USES",
    sourceIncludes: "Bloc",
    targetIncludes: "Repository",
  });
  const flutter = findEntrypoints(ctx.input, { framework: "Flutter" });

  if (widgetBloc.length > 0) {
    result.matchedRules.push("Widget -> Bloc");
    result.evidence.push(...relationshipEvidenceLines(widgetBloc));
    result.supportScore += 1.6;
  }
  if (blocRepo.length > 0) {
    result.matchedRules.push("Bloc -> Repository");
    result.evidence.push(...relationshipEvidenceLines(blocRepo));
    result.supportScore += 1.3;
  }
  if (flutter.length > 0 && result.matchedRules.length > 0) {
    result.matchedRules.push("Flutter entrypoint accompanies BLoC edges");
    result.evidence.push(...flutter.slice(0, 2).map((e) => `entrypoint:${e.file}`));
    result.supportScore += 0.7;
  }
  const mvc = findRelationships(ctx.input, {
    relationship: "USES",
    sourceIncludes: "Controller",
    targetIncludes: "Service",
  });
  if (mvc.length > 0 && widgetBloc.length > 0) {
    result.conflictingEvidence.push("Controller/Service MVC edges coexist with BLoC UI edges");
    result.conflictScore += 0.4;
  }
  if (widgetBloc.length > 0 && blocRepo.length === 0) {
    result.unknowns.push("BLoC UI wiring without repository edge evidence");
  }
  return result;
}

function evaluateRiverpod(ctx: PatternRuleContext): PatternRuleResult {
  const result = emptyRuleResult(["No Riverpod-specific provider graph metadata"]);
  const providerish = [
    ...findRelationships(ctx.input, { evidenceIncludes: ["riverpod", "Provider", "ref.watch"] }),
    ...findDependencies(ctx.input, { evidenceIncludes: ["riverpod"] }),
    ...findEntrypoints(ctx.input, { evidenceIncludes: ["riverpod", "Provider"] }),
  ];
  if (providerish.length === 0) {
    return result;
  }
  result.unknowns = [];
  result.matchedRules.push("Riverpod/Provider evidence in discovery outputs");
  result.evidence.push(
    ...providerish.slice(0, 4).map((item) => {
      if ("relationship" in item) {
        return `${item.source} ${item.relationship} ${item.target}`;
      }
      if ("framework" in item) {
        return `entrypoint:${item.file}`;
      }
      return `dependency:${item.from}->${item.to}`;
    }),
  );
  result.supportScore += 1.5;
  const flutter = findEntrypoints(ctx.input, { framework: "Flutter" });
  if (flutter.length === 0) {
    result.conflictingEvidence.push("Riverpod signals without Flutter entrypoints");
    result.conflictScore += 0.6;
  }
  return result;
}

function evaluateRedux(ctx: PatternRuleContext): PatternRuleResult {
  const result = emptyRuleResult(["No reducer/store relationship metadata"]);
  const reduxish = [
    ...findRelationships(ctx.input, {
      evidenceIncludes: ["redux", "reducer", "createStore", "useSelector", "dispatch"],
    }),
    ...findDependencies(ctx.input, { evidenceIncludes: ["redux", "reducer", "store"] }),
  ];
  if (reduxish.length === 0) {
    return result;
  }
  result.unknowns = [];
  result.matchedRules.push("Redux store/reducer evidence in discovery outputs");
  result.evidence.push(
    ...reduxish.slice(0, 4).map((item) => {
      if ("relationship" in item) {
        return `${item.source} ${item.relationship} ${item.target}`;
      }
      return `dependency:${item.from}->${item.to}`;
    }),
  );
  result.supportScore += 1.5;
  return result;
}

export const structuralPatterns: ArchitecturePatternDefinition[] = [
  { pattern: "Repository Pattern", evaluate: evaluateRepository },
  { pattern: "Service Layer", evaluate: evaluateServiceLayer },
  { pattern: "Feature-first", evaluate: evaluateFeatureFirst },
  { pattern: "BLoC", evaluate: evaluateBloc },
  { pattern: "Riverpod", evaluate: evaluateRiverpod },
  { pattern: "Redux", evaluate: evaluateRedux },
];
