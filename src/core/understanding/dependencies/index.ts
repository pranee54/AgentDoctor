export { discoverDependencies, scoreDependencyConfidence } from "./discover.js";
export { extractReferences, refineRelationType } from "./extract.js";
export { RELATION_CONFIDENCE } from "./models.js";
export type {
  DependencyDiscoveryOptions,
  DependencyDiscoveryResult,
  DependencyMatch,
  DependencyRelationType,
  ExtractedReference,
} from "./types.js";
