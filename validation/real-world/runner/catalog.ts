import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { GroundTruth, RepositoryCatalogEntry } from "../types.js";
import { REAL_WORLD_SUITE_VERSION } from "../version.js";
import { computeExpectationLock } from "../metrics/scoring.js";

const labRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function getLabRoot(): string {
  return labRoot;
}

export function getCheckoutsRoot(): string {
  return path.join(labRoot, "repositories", "checkouts");
}

export function loadCatalog(): RepositoryCatalogEntry[] {
  const catalogPath = path.join(labRoot, "repositories", "catalog.json");
  const raw = JSON.parse(fs.readFileSync(catalogPath, "utf8")) as {
    suiteVersion: string;
    repositories: RepositoryCatalogEntry[];
  };
  if (raw.suiteVersion !== REAL_WORLD_SUITE_VERSION) {
    throw new Error(
      `Catalog suiteVersion ${raw.suiteVersion} != lab ${REAL_WORLD_SUITE_VERSION}`,
    );
  }
  return raw.repositories;
}

export function loadGroundTruth(id: string): GroundTruth {
  const truthPath = path.join(labRoot, "ground-truth", `${id}.json`);
  if (!fs.existsSync(truthPath)) {
    throw new Error(`Missing ground truth: ${truthPath}`);
  }
  const truth = JSON.parse(fs.readFileSync(truthPath, "utf8")) as GroundTruth;
  if (truth.id !== id) {
    throw new Error(`Ground truth id mismatch: file=${id} body=${truth.id}`);
  }
  const { expectationLock, ...body } = truth;
  const expectedLock = computeExpectationLock(body);
  if (expectationLock !== expectedLock) {
    throw new Error(
      `Ground truth lock mismatch for ${id}. Expectations changed without bumping expectationVersion / regenerating lock. expected=${expectedLock} actual=${expectationLock}`,
    );
  }
  return truth;
}

export function checkoutPath(id: string): string {
  return path.join(getCheckoutsRoot(), id);
}
