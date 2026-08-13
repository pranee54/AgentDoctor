import {
  BRAIN_STORAGE_FORMAT_VERSION,
  PROJECT_BRAIN_SCHEMA_VERSION,
  type BrainStorageFormatVersion,
  type ProjectBrainSchemaVersion,
} from "./version.js";
import type { ProjectBrain } from "./types.js";
import { BrainStorageError } from "./storage/store.js";

export interface CompatibilityResult {
  compatible: boolean;
  reason?: string;
}

/** Reject incompatible brain / storage versions safely. */
export function checkBrainCompatibility(options: {
  schemaVersion: string;
  storageFormatVersion?: string;
}): CompatibilityResult {
  if (options.schemaVersion !== PROJECT_BRAIN_SCHEMA_VERSION) {
    return {
      compatible: false,
      reason: `incompatible ProjectBrain schema ${options.schemaVersion}; expected ${PROJECT_BRAIN_SCHEMA_VERSION}`,
    };
  }
  if (
    options.storageFormatVersion !== undefined &&
    options.storageFormatVersion !== BRAIN_STORAGE_FORMAT_VERSION
  ) {
    return {
      compatible: false,
      reason: `incompatible storage format ${options.storageFormatVersion}; expected ${BRAIN_STORAGE_FORMAT_VERSION}`,
    };
  }
  return { compatible: true };
}

export type MigrationFn = (brain: ProjectBrain) => ProjectBrain;

const MIGRATIONS: Record<string, MigrationFn> = {
  // V1: identity. Future versions register here keyed by from→to.
  "1.0.0": (brain) => brain,
};

/**
 * Migrate a loaded brain payload to the current schema when possible.
 * Unknown versions are rejected (no silent best-effort parse).
 */
export function migrateBrain(
  brain: ProjectBrain,
  fromVersion: string = brain.metadata.schemaVersion,
): ProjectBrain {
  if (fromVersion === PROJECT_BRAIN_SCHEMA_VERSION) {
    return brain;
  }
  const migrate = MIGRATIONS[fromVersion];
  if (!migrate) {
    throw new BrainStorageError(
      `no migration path from schema ${fromVersion} to ${PROJECT_BRAIN_SCHEMA_VERSION}`,
    );
  }
  const next = migrate(brain);
  if (next.metadata.schemaVersion !== PROJECT_BRAIN_SCHEMA_VERSION) {
    throw new BrainStorageError(
      `migration from ${fromVersion} did not reach ${PROJECT_BRAIN_SCHEMA_VERSION}`,
    );
  }
  return next;
}

export function currentVersions(): {
  projectBrain: ProjectBrainSchemaVersion;
  storage: BrainStorageFormatVersion;
} {
  return {
    projectBrain: PROJECT_BRAIN_SCHEMA_VERSION,
    storage: BRAIN_STORAGE_FORMAT_VERSION,
  };
}
