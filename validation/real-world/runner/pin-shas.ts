import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { RepositoryCatalogEntry } from "../types.js";
import { REAL_WORLD_SUITE_VERSION } from "../version.js";
import { resolveCommitSha } from "./clone.js";

const labRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalogPath = path.join(labRoot, "repositories", "catalog.json");

async function main(): Promise<void> {
  const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8")) as {
    suiteVersion: string;
    selectionRules: string[];
    repositories: RepositoryCatalogEntry[];
  };
  if (catalog.suiteVersion !== REAL_WORLD_SUITE_VERSION) {
    throw new Error("suiteVersion mismatch");
  }

  for (const repo of catalog.repositories) {
    process.stdout.write(`Resolving ${repo.id}... `);
    const sha = await resolveCommitSha(repo.url);
    repo.commitSha = sha;
    console.log(sha.slice(0, 12));
  }

  fs.writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
  console.log(`Pinned ${catalog.repositories.length} repositories.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
