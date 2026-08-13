export { ProjectModelBuilder, buildProjectModel } from "./builder.js";
export { serializeProjectModel, parseProjectModel } from "./serializer.js";
export { validateProjectModel } from "./validator.js";
export { PROJECT_MODEL_SCHEMA } from "./schema.js";
export { PROJECT_MODEL_SCHEMA_VERSION, UNDERSTANDING_COMPILER_VERSION } from "./version.js";
export { stableModelId, clampModelConfidence } from "./ids.js";
export type {
  CompilerMetadata,
  CompilerPassId,
  ProjectArchitecture,
  ProjectDependency,
  ProjectDomain,
  ProjectEntrypoint,
  ProjectModel,
  ProjectModelBuilderInput,
  ProjectModelValidationResult,
  ProjectRelationship,
  ProjectSummary,
} from "./types.js";
