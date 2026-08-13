export { discoverRelationships, scoreRelationshipConfidence } from "./discover.js";
export {
  classifyComponent,
  classifyRoleFromPath,
  extractSemanticSignals,
  pascalCaseName,
} from "./extract.js";
export { ROLE_PAIR_RULES, findRolePairRule } from "./models.js";
export type {
  ClassifiedComponent,
  ComponentRole,
  RelationshipDiscoveryOptions,
  RelationshipDiscoveryResult,
  RelationshipKind,
  RelationshipMatch,
  RelationshipStrength,
  SemanticSignal,
} from "./types.js";
