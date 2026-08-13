/**
 * Honest ground-truth definitions for real-world repositories.
 * Expectations describe the software as humans understand it —
 * never rewritten to match Compiler v0.1 output.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { withExpectationLock } from "../metrics/scoring.js";
import type { GroundTruth } from "../types.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "ground-truth");

type Body = Omit<GroundTruth, "expectationLock">;

function gt(partial: Body): GroundTruth {
  return withExpectationLock(partial);
}

const definitions: Body[] = [
  {
    id: "flutter-gallery",
    expectationVersion: "1.0.0",
    domains: { required: ["Analytics"], forbidden: [] },
    entrypoints: {
      required: [{ framework: "Flutter", fileSuffix: "lib/main.dart" }],
      forbiddenFrameworks: ["Laravel", "Django"],
    },
    dependencies: { required: [], minCount: 20, characteristic: "dense" },
    relationships: { required: [], minCount: 5 },
    architectures: {
      requiredPatterns: ["Feature-first"],
      forbiddenPatterns: ["Microservice"],
    },
    projectModel: {
      minDomains: 0,
      minEntrypoints: 1,
      minDependencies: 10,
      minRelationships: 1,
      minArchitectures: 0,
    },
    query: { minListDomains: 0, minListEntrypoints: 1 },
    understand: { mustContain: ["Entrypoints"] },
  },
  {
    id: "flutter-bloc",
    expectationVersion: "1.0.0",
    domains: { required: [], forbidden: ["Payments"] },
    entrypoints: {
      required: [{ framework: "Flutter", fileSuffix: "main.dart" }],
      forbiddenFrameworks: ["Laravel"],
    },
    dependencies: { required: [], minCount: 10, characteristic: "moderate" },
    relationships: { required: [], minCount: 3 },
    architectures: {
      requiredPatterns: ["BLoC"],
      forbiddenPatterns: ["MVC"],
    },
    projectModel: {
      minDomains: 0,
      minEntrypoints: 1,
      minDependencies: 5,
      minRelationships: 1,
      minArchitectures: 0,
    },
    query: { minListDomains: 0, minListEntrypoints: 1 },
    understand: { mustContain: ["Entrypoints"] },
  },
  {
    id: "laravel-laravel",
    expectationVersion: "1.0.0",
    domains: { required: [], forbidden: [] },
    entrypoints: {
      required: [
        { framework: "Laravel", fileSuffix: "routes/web.php" },
        { framework: "Laravel", fileSuffix: "artisan" },
      ],
      forbiddenFrameworks: ["Flutter", "Django"],
    },
    dependencies: { required: [], minCount: 5, characteristic: "moderate" },
    relationships: { required: [], minCount: 1 },
    architectures: {
      requiredPatterns: ["MVC"],
      forbiddenPatterns: ["BLoC", "Microservice"],
    },
    projectModel: {
      minDomains: 0,
      minEntrypoints: 2,
      minDependencies: 1,
      minRelationships: 0,
      minArchitectures: 0,
    },
    query: { minListDomains: 0, minListEntrypoints: 2 },
    understand: { mustContain: ["Entrypoints"] },
  },
  {
    id: "filament",
    expectationVersion: "1.0.0",
    domains: { required: ["Admin"], forbidden: [] },
    entrypoints: {
      required: [],
      forbiddenFrameworks: ["Flutter"],
    },
    dependencies: { required: [], minCount: 30, characteristic: "dense" },
    relationships: { required: [], minCount: 10 },
    architectures: {
      requiredPatterns: ["Plugin Architecture", "Monorepo Workspace"],
      forbiddenPatterns: [],
    },
    projectModel: {
      minDomains: 1,
      minEntrypoints: 0,
      minDependencies: 10,
      minRelationships: 5,
      minArchitectures: 0,
    },
    query: { mustFindDomain: "Admin", minListDomains: 1, minListEntrypoints: 0 },
    understand: { mustContain: ["Domains"] },
  },
  {
    id: "livewire",
    expectationVersion: "1.0.0",
    domains: { required: [], forbidden: [] },
    entrypoints: {
      required: [],
      forbiddenFrameworks: ["Flutter", "Go"],
    },
    dependencies: { required: [], minCount: 20, characteristic: "dense" },
    relationships: { required: [], minCount: 5 },
    architectures: {
      requiredPatterns: [],
      forbiddenPatterns: ["Microservice"],
    },
    projectModel: {
      minDomains: 0,
      minEntrypoints: 0,
      minDependencies: 5,
      minRelationships: 1,
      minArchitectures: 0,
    },
    query: { minListDomains: 0, minListEntrypoints: 0 },
    understand: { mustContain: ["Repository"] },
  },
  {
    id: "react-router",
    expectationVersion: "1.0.0",
    domains: { required: [], forbidden: ["Payments"] },
    entrypoints: {
      required: [],
      forbiddenFrameworks: ["Laravel", "Django"],
    },
    dependencies: { required: [], minCount: 40, characteristic: "dense" },
    relationships: { required: [], minCount: 10 },
    architectures: {
      requiredPatterns: ["Monorepo Workspace"],
      forbiddenPatterns: ["Microservice"],
    },
    projectModel: {
      minDomains: 0,
      minEntrypoints: 0,
      minDependencies: 20,
      minRelationships: 5,
      minArchitectures: 0,
    },
    query: { minListDomains: 0, minListEntrypoints: 0 },
    understand: { mustContain: ["Dependencies"] },
  },
  {
    id: "tanstack-query",
    expectationVersion: "1.0.0",
    domains: { required: [], forbidden: [] },
    entrypoints: {
      required: [],
      forbiddenFrameworks: ["Laravel"],
    },
    dependencies: { required: [], minCount: 40, characteristic: "dense" },
    relationships: { required: [], minCount: 10 },
    architectures: {
      requiredPatterns: ["Monorepo Workspace"],
      forbiddenPatterns: [],
    },
    projectModel: {
      minDomains: 0,
      minEntrypoints: 0,
      minDependencies: 20,
      minRelationships: 5,
      minArchitectures: 0,
    },
    query: { minListDomains: 0, minListEntrypoints: 0 },
    understand: { mustContain: ["Dependencies"] },
  },
  {
    id: "chakra-ui",
    expectationVersion: "1.0.0",
    domains: { required: [], forbidden: [] },
    entrypoints: {
      required: [],
      forbiddenFrameworks: ["Django"],
    },
    dependencies: { required: [], minCount: 50, characteristic: "dense" },
    relationships: { required: [], minCount: 20 },
    architectures: {
      requiredPatterns: ["Monorepo Workspace"],
      forbiddenPatterns: ["Microservice"],
    },
    projectModel: {
      minDomains: 0,
      minEntrypoints: 0,
      minDependencies: 20,
      minRelationships: 5,
      minArchitectures: 0,
    },
    query: { minListDomains: 0, minListEntrypoints: 0 },
    understand: { mustContain: ["Dependencies"] },
  },
  {
    id: "next-auth",
    expectationVersion: "1.0.0",
    domains: { required: ["Auth", "Users"], forbidden: [] },
    entrypoints: {
      required: [],
      forbiddenFrameworks: ["Laravel", "Flutter"],
    },
    dependencies: { required: [], minCount: 30, characteristic: "dense" },
    relationships: { required: [], minCount: 10 },
    architectures: {
      requiredPatterns: ["Monorepo Workspace"],
      forbiddenPatterns: [],
    },
    projectModel: {
      minDomains: 1,
      minEntrypoints: 0,
      minDependencies: 10,
      minRelationships: 5,
      minArchitectures: 0,
    },
    query: { mustFindDomain: "Auth", minListDomains: 1, minListEntrypoints: 0 },
    understand: { mustContain: ["Domains"] },
  },
  {
    id: "swr",
    expectationVersion: "1.0.0",
    domains: { required: [], forbidden: ["Payments", "Shipping"] },
    entrypoints: {
      required: [],
      forbiddenFrameworks: ["Laravel", "Django", "Flutter"],
    },
    dependencies: { required: [], minCount: 10, characteristic: "moderate" },
    relationships: { required: [], minCount: 3 },
    architectures: { requiredPatterns: [], forbiddenPatterns: ["Microservice"] },
    projectModel: {
      minDomains: 0,
      minEntrypoints: 0,
      minDependencies: 5,
      minRelationships: 1,
      minArchitectures: 0,
    },
    query: { minListDomains: 0, minListEntrypoints: 0 },
    understand: { mustContain: ["Dependencies"] },
  },
  {
    id: "express",
    expectationVersion: "1.0.0",
    domains: { required: [], forbidden: ["Payments"] },
    entrypoints: {
      required: [{ framework: "Node", fileSuffix: "lib/express.js" }],
      forbiddenFrameworks: ["Flutter", "Laravel", "Django"],
    },
    dependencies: { required: [], minCount: 5, characteristic: "moderate" },
    relationships: { required: [], minCount: 1 },
    architectures: {
      requiredPatterns: ["Layered Architecture"],
      forbiddenPatterns: ["BLoC", "Microservice"],
    },
    projectModel: {
      minDomains: 0,
      minEntrypoints: 0,
      minDependencies: 1,
      minRelationships: 0,
      minArchitectures: 0,
    },
    query: { minListDomains: 0, minListEntrypoints: 0 },
    understand: { mustContain: ["Repository"] },
  },
  {
    id: "nest",
    expectationVersion: "1.0.0",
    domains: { required: [], forbidden: [] },
    entrypoints: {
      required: [{ framework: "NestJS", fileSuffix: "main.ts" }],
      forbiddenFrameworks: ["Flutter", "Laravel"],
    },
    dependencies: { required: [], minCount: 80, characteristic: "dense" },
    relationships: { required: [], minCount: 30 },
    architectures: {
      requiredPatterns: ["Modular Monolith", "Service Layer", "Monorepo Workspace"],
      forbiddenPatterns: [],
    },
    projectModel: {
      minDomains: 0,
      minEntrypoints: 1,
      minDependencies: 40,
      minRelationships: 10,
      minArchitectures: 0,
    },
    query: { minListDomains: 0, minListEntrypoints: 1 },
    understand: { mustContain: ["Entrypoints"] },
  },
  {
    id: "socket-io",
    expectationVersion: "1.0.0",
    domains: { required: [], forbidden: ["Shipping"] },
    entrypoints: {
      required: [],
      forbiddenFrameworks: ["Flutter", "Laravel"],
    },
    dependencies: { required: [], minCount: 20, characteristic: "dense" },
    relationships: { required: [], minCount: 5 },
    architectures: {
      requiredPatterns: ["Monorepo Workspace"],
      forbiddenPatterns: [],
    },
    projectModel: {
      minDomains: 0,
      minEntrypoints: 0,
      minDependencies: 10,
      minRelationships: 1,
      minArchitectures: 0,
    },
    query: { minListDomains: 0, minListEntrypoints: 0 },
    understand: { mustContain: ["Dependencies"] },
  },
  {
    id: "commander",
    expectationVersion: "1.0.0",
    domains: { required: [], forbidden: ["Payments", "Shipping", "Inventory"] },
    entrypoints: {
      required: [{ framework: "Node", fileSuffix: "index.js" }],
      forbiddenFrameworks: ["Flutter", "Laravel", "Django"],
    },
    dependencies: { required: [], minCount: 1, characteristic: "sparse" },
    relationships: { required: [], minCount: 0 },
    architectures: { requiredPatterns: [], forbiddenPatterns: ["Microservice"] },
    projectModel: {
      minDomains: 0,
      minEntrypoints: 0,
      minDependencies: 0,
      minRelationships: 0,
      minArchitectures: 0,
    },
    query: { minListDomains: 0, minListEntrypoints: 0 },
    understand: { mustContain: ["Repository"] },
  },
  {
    id: "fastapi",
    expectationVersion: "1.0.0",
    domains: { required: ["Auth", "Users"], forbidden: [] },
    entrypoints: {
      required: [{ framework: "Python", fileSuffix: "main.py" }],
      forbiddenFrameworks: ["Flutter", "Laravel"],
    },
    dependencies: { required: [], minCount: 10, characteristic: "moderate" },
    relationships: { required: [], minCount: 3 },
    architectures: {
      requiredPatterns: ["Layered Architecture"],
      forbiddenPatterns: ["BLoC"],
    },
    projectModel: {
      minDomains: 1,
      minEntrypoints: 0,
      minDependencies: 5,
      minRelationships: 1,
      minArchitectures: 0,
    },
    query: { mustFindDomain: "Auth", minListDomains: 1, minListEntrypoints: 0 },
    understand: { mustContain: ["Domains"] },
  },
  {
    id: "flask",
    expectationVersion: "1.0.0",
    domains: { required: [], forbidden: [] },
    entrypoints: {
      required: [{ framework: "Python", fileSuffix: "app.py" }],
      forbiddenFrameworks: ["Flutter", "Laravel"],
    },
    dependencies: { required: [], minCount: 5, characteristic: "moderate" },
    relationships: { required: [], minCount: 1 },
    architectures: {
      requiredPatterns: ["Layered Architecture"],
      forbiddenPatterns: ["Microservice"],
    },
    projectModel: {
      minDomains: 0,
      minEntrypoints: 0,
      minDependencies: 1,
      minRelationships: 0,
      minArchitectures: 0,
    },
    query: { minListDomains: 0, minListEntrypoints: 0 },
    understand: { mustContain: ["Repository"] },
  },
  {
    id: "django-rest",
    expectationVersion: "1.0.0",
    domains: { required: ["Auth", "Users", "Admin"], forbidden: [] },
    entrypoints: {
      required: [],
      forbiddenFrameworks: ["Flutter"],
    },
    dependencies: { required: [], minCount: 20, characteristic: "dense" },
    relationships: { required: [], minCount: 5 },
    architectures: {
      requiredPatterns: ["MVC", "Service Layer"],
      forbiddenPatterns: ["BLoC"],
    },
    projectModel: {
      minDomains: 1,
      minEntrypoints: 0,
      minDependencies: 5,
      minRelationships: 1,
      minArchitectures: 0,
    },
    query: { mustFindDomain: "Auth", minListDomains: 1, minListEntrypoints: 0 },
    understand: { mustContain: ["Domains"] },
  },
  {
    id: "httpx",
    expectationVersion: "1.0.0",
    domains: { required: ["Auth"], forbidden: ["Shipping"] },
    entrypoints: {
      required: [],
      forbiddenFrameworks: ["Flutter", "Laravel", "NestJS"],
    },
    dependencies: { required: [], minCount: 5, characteristic: "moderate" },
    relationships: { required: [], minCount: 1 },
    architectures: { requiredPatterns: [], forbiddenPatterns: ["Microservice"] },
    projectModel: {
      minDomains: 0,
      minEntrypoints: 0,
      minDependencies: 1,
      minRelationships: 0,
      minArchitectures: 0,
    },
    query: { minListDomains: 0, minListEntrypoints: 0 },
    understand: { mustContain: ["Repository"] },
  },
  {
    id: "gin",
    expectationVersion: "1.0.0",
    domains: { required: [], forbidden: ["Payments"] },
    entrypoints: {
      required: [],
      forbiddenFrameworks: ["Flutter", "Laravel", "Django"],
    },
    dependencies: { required: [], minCount: 5, characteristic: "moderate" },
    relationships: { required: [], minCount: 1 },
    architectures: {
      requiredPatterns: ["Layered Architecture"],
      forbiddenPatterns: ["BLoC"],
    },
    projectModel: {
      minDomains: 0,
      minEntrypoints: 0,
      minDependencies: 1,
      minRelationships: 0,
      minArchitectures: 0,
    },
    query: { minListDomains: 0, minListEntrypoints: 0 },
    understand: { mustContain: ["Repository"] },
  },
  {
    id: "cobra",
    expectationVersion: "1.0.0",
    domains: { required: [], forbidden: ["Payments", "Shipping"] },
    entrypoints: {
      required: [],
      forbiddenFrameworks: ["Flutter", "Laravel"],
    },
    dependencies: { required: [], minCount: 1, characteristic: "sparse" },
    relationships: { required: [], minCount: 0 },
    architectures: { requiredPatterns: [], forbiddenPatterns: ["Microservice"] },
    projectModel: {
      minDomains: 0,
      minEntrypoints: 0,
      minDependencies: 0,
      minRelationships: 0,
      minArchitectures: 0,
    },
    query: { minListDomains: 0, minListEntrypoints: 0 },
    understand: { mustContain: ["Repository"] },
  },
  {
    id: "chi",
    expectationVersion: "1.0.0",
    domains: { required: [], forbidden: ["Payments"] },
    entrypoints: {
      required: [],
      forbiddenFrameworks: ["Flutter", "Laravel"],
    },
    dependencies: { required: [], minCount: 1, characteristic: "sparse" },
    relationships: { required: [], minCount: 0 },
    architectures: {
      requiredPatterns: ["Layered Architecture"],
      forbiddenPatterns: ["BLoC"],
    },
    projectModel: {
      minDomains: 0,
      minEntrypoints: 0,
      minDependencies: 0,
      minRelationships: 0,
      minArchitectures: 0,
    },
    query: { minListDomains: 0, minListEntrypoints: 0 },
    understand: { mustContain: ["Repository"] },
  },
  {
    id: "clap",
    expectationVersion: "1.0.0",
    domains: { required: [], forbidden: ["Payments"] },
    entrypoints: {
      required: [{ framework: "Rust", fileSuffix: "main.rs" }],
      forbiddenFrameworks: ["Flutter", "Laravel"],
    },
    dependencies: { required: [], minCount: 10, characteristic: "moderate" },
    relationships: { required: [], minCount: 1 },
    architectures: {
      requiredPatterns: ["Monorepo Workspace"],
      forbiddenPatterns: [],
    },
    projectModel: {
      minDomains: 0,
      minEntrypoints: 0,
      minDependencies: 1,
      minRelationships: 0,
      minArchitectures: 0,
    },
    query: { minListDomains: 0, minListEntrypoints: 0 },
    understand: { mustContain: ["Repository"] },
  },
  {
    id: "serde",
    expectationVersion: "1.0.0",
    domains: { required: [], forbidden: ["Payments", "Shipping"] },
    entrypoints: {
      required: [],
      forbiddenFrameworks: ["Flutter", "Laravel", "Django"],
    },
    dependencies: { required: [], minCount: 5, characteristic: "moderate" },
    relationships: { required: [], minCount: 1 },
    architectures: { requiredPatterns: [], forbiddenPatterns: ["Microservice"] },
    projectModel: {
      minDomains: 0,
      minEntrypoints: 0,
      minDependencies: 1,
      minRelationships: 0,
      minArchitectures: 0,
    },
    query: { minListDomains: 0, minListEntrypoints: 0 },
    understand: { mustContain: ["Repository"] },
  },
  {
    id: "axum",
    expectationVersion: "1.0.0",
    domains: { required: [], forbidden: [] },
    entrypoints: {
      required: [{ framework: "Rust", fileSuffix: "main.rs" }],
      forbiddenFrameworks: ["Laravel", "Flutter"],
    },
    dependencies: { required: [], minCount: 20, characteristic: "dense" },
    relationships: { required: [], minCount: 5 },
    architectures: {
      requiredPatterns: ["Monorepo Workspace", "Layered Architecture"],
      forbiddenPatterns: [],
    },
    projectModel: {
      minDomains: 0,
      minEntrypoints: 0,
      minDependencies: 5,
      minRelationships: 1,
      minArchitectures: 0,
    },
    query: { minListDomains: 0, minListEntrypoints: 0 },
    understand: { mustContain: ["Dependencies"] },
  },
  {
    id: "spring-petclinic",
    expectationVersion: "1.0.0",
    domains: { required: ["Users", "Admin"], forbidden: [] },
    entrypoints: {
      required: [{ framework: "Java", fileSuffix: "PetClinicApplication.java" }],
      forbiddenFrameworks: ["Flutter", "Laravel"],
    },
    dependencies: { required: [], minCount: 10, characteristic: "moderate" },
    relationships: { required: [], minCount: 5 },
    architectures: {
      requiredPatterns: ["MVC", "Service Layer", "Repository Pattern"],
      forbiddenPatterns: ["BLoC", "Microservice"],
    },
    projectModel: {
      minDomains: 1,
      minEntrypoints: 1,
      minDependencies: 5,
      minRelationships: 1,
      minArchitectures: 0,
    },
    query: { mustFindDomain: "Users", minListDomains: 1, minListEntrypoints: 1 },
    understand: { mustContain: ["Entrypoints"] },
  },
  {
    id: "microservices-demo",
    expectationVersion: "1.0.0",
    domains: {
      required: ["Orders", "Shipping", "Payments", "Users", "Inventory"],
      forbidden: [],
    },
    entrypoints: {
      required: [{ framework: "Go", fileSuffix: "main.go" }],
      forbiddenFrameworks: [],
    },
    dependencies: { required: [], minCount: 20, characteristic: "dense" },
    relationships: { required: [], minCount: 10 },
    architectures: {
      requiredPatterns: ["Microservice"],
      forbiddenPatterns: [],
    },
    projectModel: {
      minDomains: 3,
      minEntrypoints: 1,
      minDependencies: 10,
      minRelationships: 5,
      minArchitectures: 0,
    },
    query: { mustFindDomain: "Orders", minListDomains: 3, minListEntrypoints: 1 },
    understand: { mustContain: ["Domains"] },
  },
  {
    id: "turborepo",
    expectationVersion: "1.0.0",
    domains: { required: [], forbidden: [] },
    entrypoints: {
      required: [{ framework: "Rust", fileSuffix: "main.rs" }],
      forbiddenFrameworks: ["Laravel"],
    },
    dependencies: { required: [], minCount: 30, characteristic: "dense" },
    relationships: { required: [], minCount: 10 },
    architectures: {
      requiredPatterns: ["Monorepo Workspace"],
      forbiddenPatterns: [],
    },
    projectModel: {
      minDomains: 0,
      minEntrypoints: 0,
      minDependencies: 10,
      minRelationships: 1,
      minArchitectures: 0,
    },
    query: { minListDomains: 0, minListEntrypoints: 0 },
    understand: { mustContain: ["Dependencies"] },
  },
  {
    id: "gh-cli",
    expectationVersion: "1.0.0",
    domains: { required: ["Auth", "Users", "Admin"], forbidden: [] },
    entrypoints: {
      required: [{ framework: "Go", fileSuffix: "main.go" }],
      forbiddenFrameworks: ["Flutter", "Laravel"],
    },
    dependencies: { required: [], minCount: 40, characteristic: "dense" },
    relationships: { required: [], minCount: 10 },
    architectures: {
      requiredPatterns: ["Feature-first"],
      forbiddenPatterns: [],
    },
    projectModel: {
      minDomains: 1,
      minEntrypoints: 1,
      minDependencies: 10,
      minRelationships: 5,
      minArchitectures: 0,
    },
    query: { mustFindDomain: "Auth", minListDomains: 1, minListEntrypoints: 1 },
    understand: { mustContain: ["Entrypoints"] },
  },
  {
    id: "axios",
    expectationVersion: "1.0.0",
    domains: { required: [], forbidden: ["Payments", "Shipping"] },
    entrypoints: {
      required: [{ framework: "Node", fileSuffix: "index.js" }],
      forbiddenFrameworks: ["Flutter", "Laravel", "Django"],
    },
    dependencies: { required: [], minCount: 5, characteristic: "moderate" },
    relationships: { required: [], minCount: 1 },
    architectures: { requiredPatterns: [], forbiddenPatterns: ["Microservice"] },
    projectModel: {
      minDomains: 0,
      minEntrypoints: 0,
      minDependencies: 1,
      minRelationships: 0,
      minArchitectures: 0,
    },
    query: { minListDomains: 0, minListEntrypoints: 0 },
    understand: { mustContain: ["Repository"] },
  },
  {
    id: "compose",
    expectationVersion: "1.0.0",
    domains: { required: [], forbidden: [] },
    entrypoints: {
      required: [{ framework: "Go", fileSuffix: "main.go" }],
      forbiddenFrameworks: ["Flutter", "Laravel"],
    },
    dependencies: { required: [], minCount: 20, characteristic: "dense" },
    relationships: { required: [], minCount: 5 },
    architectures: {
      requiredPatterns: ["Layered Architecture"],
      forbiddenPatterns: ["BLoC"],
    },
    projectModel: {
      minDomains: 0,
      minEntrypoints: 1,
      minDependencies: 5,
      minRelationships: 1,
      minArchitectures: 0,
    },
    query: { minListDomains: 0, minListEntrypoints: 1 },
    understand: { mustContain: ["Entrypoints"] },
  },
];

function main(): void {
  fs.mkdirSync(outDir, { recursive: true });
  for (const body of definitions) {
    const locked = gt(body);
    const target = path.join(outDir, `${body.id}.json`);
    fs.writeFileSync(target, `${JSON.stringify(locked, null, 2)}\n`, "utf8");
    console.log(`wrote ${body.id} lock=${locked.expectationLock.slice(0, 12)}…`);
  }
  console.log(`Seeded ${definitions.length} ground-truth files.`);
}

main();
