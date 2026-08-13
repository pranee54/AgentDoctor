import path from "node:path";

import { inferArchitectures } from "../../core/understanding/architecture/index.js";
import { buildProjectBrain, type ProjectBrain } from "../../core/understanding/brain/index.js";
import { discoverDependencies } from "../../core/understanding/dependencies/index.js";
import { discoverDomains } from "../../core/understanding/domain/index.js";
import { discoverEntrypoints } from "../../core/understanding/entrypoints/index.js";
import { buildProjectModel } from "../../core/understanding/model/index.js";
import { discoverRelationships } from "../../core/understanding/relationships/index.js";

export interface CompileBrainOptions {
  previousClaims?: ProjectBrain["claims"];
  generatedAt?: string;
}

/**
 * Compile discovery passes → ProjectModel → ProjectBrain for an explicit root.
 */
export async function compileProjectBrain(
  projectRoot: string,
  options: CompileBrainOptions = {},
): Promise<ProjectBrain> {
  const domains = await discoverDomains({ cwd: projectRoot });
  const entrypoints = await discoverEntrypoints({ cwd: projectRoot });
  const dependencies = await discoverDependencies({ cwd: projectRoot });
  const relationships = await discoverRelationships({
    cwd: projectRoot,
    domains,
    entrypoints,
    dependencies,
  });
  const architectures = inferArchitectures({
    domains,
    entrypoints,
    dependencies,
    relationships,
  });
  const model = buildProjectModel({
    domains,
    entrypoints,
    dependencies,
    relationships,
    architectures,
    projectName: path.basename(projectRoot),
    ...(options.generatedAt !== undefined ? { generatedAt: options.generatedAt } : {}),
  });

  return buildProjectBrain(model, {
    cwd: projectRoot,
    ...(options.previousClaims !== undefined ? { previousClaims: options.previousClaims } : {}),
    ...(options.generatedAt !== undefined ? { generatedAt: options.generatedAt } : {}),
  });
}
