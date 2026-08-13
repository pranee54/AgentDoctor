import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { parseProjectModel } from "../../../src/core/understanding/model/index.js";
import {
  Queries,
  createQueryEngine,
  listSupportedQueryTypes,
} from "../../../src/core/understanding/query/index.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const modelPath = path.resolve(here, "../../../fixtures/understanding-query/project-model.json");

describe("query engine benchmark", () => {
  it("keeps median latency under 5ms across supported query types on the rich fixture", () => {
    const model = parseProjectModel(fs.readFileSync(modelPath, "utf8"));
    const engine = createQueryEngine(model);
    const domain = model.domains[0]?.name ?? "Payments";
    const entry = model.entrypoints[0];
    const arch = model.architectures[0];
    const rel = model.relationships[0];
    const dep = model.dependencies[0];

    const queries = [
      Queries.repositorySummary(),
      Queries.listDomains(),
      Queries.listEntrypoints(),
      Queries.listArchitectures(),
      Queries.listRelationships(),
      Queries.listDependencies(),
      Queries.findDomain(domain),
      Queries.findEntrypoint(entry ? { file: entry.file } : { file: "missing" }),
      Queries.findArchitecture(arch?.pattern ?? "MVC"),
      Queries.findComponent(rel?.source ?? domain),
      Queries.findRelationship(
        rel
          ? { source: rel.source, target: rel.target, relationship: rel.relationship }
          : { source: "missing" },
      ),
      Queries.findDependency(
        dep ? { from: dep.from, to: dep.to, dependencyType: dep.type } : { from: "missing" },
      ),
      Queries.findEvidence(domain),
      Queries.statistics(),
    ];

    expect(queries).toHaveLength(listSupportedQueryTypes().length);

    // Warmup
    for (const query of queries) {
      engine.execute(query);
    }

    const samples: number[] = [];
    for (let round = 0; round < 5; round += 1) {
      for (const query of queries) {
        const response = engine.execute(query);
        samples.push(response.executionTimeMs);
      }
    }

    const sorted = [...samples].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
    expect(median).toBeLessThan(5);
  });
});
