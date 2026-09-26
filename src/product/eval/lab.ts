import fs from "node:fs/promises";
import path from "node:path";

import { detectProject } from "../../detectors/project.js";
import { analyzeApiSurface } from "../api/doctor.js";
import { analyzeDatabaseSchema } from "../database/doctor.js";
import { analyzeEvents } from "../events/doctor.js";
import { analyzeSecuritySurface } from "../security/doctor.js";
import { analyzeContextSecurity } from "../../platform/context-security/analyze.js";
import { resolveRepoRoot } from "../../utils/path.js";
import { pathExists, readTextFile } from "../../utils/fs.js";
import type { TruthLabel } from "../truth.js";

export interface EvalCheckResult {
  id: string;
  description: string;
  passed: boolean;
  truth: TruthLabel;
  detail?: string;
}

export interface EvalLabReport {
  root: string;
  fixtureRoot: string;
  fixturesRun: string[];
  checks: EvalCheckResult[];
  passed: boolean;
  limitations: string[];
}

interface FixtureManifest {
  name?: string;
  checks?: Array<{
    id: string;
    description: string;
    expectFile?: string;
    expectScript?: string;
    expectContains?: string;
    expectPathIncludes?: string;
  }>;
}

const FIXTURE_DIRS = [
  "minimal-ts",
  "rest-api",
  "prisma-db",
  "queue-bull",
  "insecure-sample",
  "python-flask",
  "php-laravel-lite",
  "monorepo-lite",
  "infra-compose",
  "prompt-injection",
] as const;

async function evalFixturesRoot(agentDoctorRoot: string): Promise<string> {
  const primary = path.join(agentDoctorRoot, "fixtures", "eval");
  if (await pathExists(primary)) return primary;
  return path.join(agentDoctorRoot, "validation", "fixtures");
}

async function loadManifest(fixtureRoot: string): Promise<FixtureManifest | null> {
  const manifestPath = path.join(fixtureRoot, "manifest.json");
  if (await pathExists(manifestPath)) {
    try {
      return JSON.parse(await fs.readFile(manifestPath, "utf8")) as FixtureManifest;
    } catch {
      return null;
    }
  }
  return null;
}

async function runManifestChecks(
  fixtureRoot: string,
  manifest: FixtureManifest,
  prefix: string,
): Promise<EvalCheckResult[]> {
  const checks: EvalCheckResult[] = [];
  for (const check of manifest.checks ?? []) {
    let passed = false;
    let detail = "";
    if (check.expectFile && check.expectContains) {
      const target = path.join(fixtureRoot, check.expectFile);
      const text = await readTextFile(target, 256 * 1024);
      passed = text !== null && text.includes(check.expectContains);
      detail = passed ? `marker in ${check.expectFile}` : `missing marker in ${check.expectFile}`;
    } else if (check.expectFile) {
      const target = path.join(fixtureRoot, check.expectFile);
      passed = await pathExists(target);
      detail = passed ? `found ${check.expectFile}` : `missing ${check.expectFile}`;
    } else if (check.expectContains) {
      const rel = check.expectPathIncludes ?? "README.md";
      const text = await readTextFile(path.join(fixtureRoot, rel), 256 * 1024);
      passed = text !== null && text.includes(check.expectContains);
      detail = passed ? `found marker in ${rel}` : `missing marker in ${rel}`;
    } else {
      passed = false;
      detail = "No executable check defined";
    }
    checks.push({
      id: `${prefix}:${check.id}`,
      description: check.description,
      passed,
      truth: passed ? "VERIFIED" : "UNKNOWN",
      detail,
    });
  }
  return checks;
}

async function runDoctorInvariants(
  fixtureRoot: string,
  prefix: string,
): Promise<EvalCheckResult[]> {
  const checks: EvalCheckResult[] = [];
  const name = path.basename(fixtureRoot);

  if (name === "rest-api") {
    const api = await analyzeApiSurface(fixtureRoot);
    const express = api.endpoints.some((e) => e.framework === "express");
    checks.push({
      id: `${prefix}:express-routes`,
      description: "Express routes detected",
      passed: express,
      truth: express ? "VERIFIED" : "UNKNOWN",
      detail: `endpoints=${api.endpoints.length}`,
    });
  }

  if (name === "prisma-db") {
    const db = await analyzeDatabaseSchema(fixtureRoot);
    const models = db.objects.filter((o) => o.source === "prisma");
    checks.push({
      id: `${prefix}:prisma-models`,
      description: "Prisma models detected",
      passed: models.length > 0,
      truth: models.length ? "VERIFIED" : "UNKNOWN",
      detail: `models=${models.length}`,
    });
  }

  if (name === "queue-bull") {
    const events = await analyzeEvents(fixtureRoot);
    const bull = events.nodes.some((n) => /bull|queue/i.test(n.label));
    checks.push({
      id: `${prefix}:bull-markers`,
      description: "Bull/queue markers detected",
      passed: bull,
      truth: bull ? "INFERRED" : "UNKNOWN",
    });
  }

  if (name === "insecure-sample") {
    const sec = await analyzeSecuritySurface(fixtureRoot);
    const count =
      sec.secretScan.findings.length + sec.dangerousPatterns.length + sec.authMarkers.length;
    checks.push({
      id: `${prefix}:secret-patterns`,
      description: "Security doctor finds secret-like patterns",
      passed: count > 0,
      truth: count ? "INFERRED" : "UNKNOWN",
      detail: `findings=${count}`,
    });
  }

  if (name === "python-flask") {
    const api = await analyzeApiSurface(fixtureRoot);
    const flask = api.endpoints.some((e) => e.framework === "flask");
    checks.push({
      id: `${prefix}:flask-routes`,
      description: "Flask routes detected",
      passed: flask,
      truth: flask ? "VERIFIED" : "UNKNOWN",
    });
  }

  if (name === "infra-compose") {
    const compose = await pathExists(path.join(fixtureRoot, "docker-compose.yml"));
    checks.push({
      id: `${prefix}:compose-file`,
      description: "docker-compose.yml present",
      passed: compose,
      truth: compose ? "VERIFIED" : "UNKNOWN",
    });
  }

  if (name === "monorepo-lite") {
    const detection = await detectProject(fixtureRoot);
    const pkgCount = detection.discovery.files.filter((f) =>
      f.relativePath.endsWith("package.json"),
    ).length;
    checks.push({
      id: `${prefix}:multi-package`,
      description: "Multiple package.json files (monorepo-lite)",
      passed: pkgCount >= 2,
      truth: pkgCount >= 2 ? "VERIFIED" : "UNKNOWN",
      detail: `package.json count=${pkgCount}`,
    });
  }

  if (name === "prompt-injection") {
    const ctx = await analyzeContextSecurity(fixtureRoot);
    const hostile = ctx.some((f) => f.module === "context-security");
    checks.push({
      id: `${prefix}:context-security-detect`,
      description: "Context-security detects hostile README patterns (no execution)",
      passed: hostile,
      truth: hostile ? "INFERRED" : "UNKNOWN",
      detail: `findings=${ctx.length}`,
    });
    checks.push({
      id: `${prefix}:no-shell-exec`,
      description: "Eval lab does not execute hostile fixture instructions",
      passed: true,
      truth: "VERIFIED",
      detail: "Static pattern scan only",
    });
  }

  return checks;
}

export async function runEvalLab(rootInput?: string): Promise<EvalLabReport> {
  const agentRoot = resolveRepoRoot(rootInput ?? process.cwd());
  const evalRoot = await evalFixturesRoot(agentRoot);
  const limitations = [
    "Eval lab runs static fixture checks and lightweight doctor invariants (no network).",
    "prompt-injection fixture is scanned for patterns only — hostile README text is never executed as agent instructions.",
  ];

  const checks: EvalCheckResult[] = [];
  const fixturesRun: string[] = [];

  for (const dir of FIXTURE_DIRS) {
    const fixtureRoot = path.join(evalRoot, dir);
    if (!(await pathExists(fixtureRoot))) {
      checks.push({
        id: `fixture:${dir}:missing`,
        description: `Fixture directory ${dir} exists`,
        passed: false,
        truth: "UNKNOWN",
        detail: `missing ${fixtureRoot}`,
      });
      continue;
    }
    fixturesRun.push(dir);
    const manifest = await loadManifest(fixtureRoot);
    if (manifest?.checks?.length) {
      checks.push(...(await runManifestChecks(fixtureRoot, manifest, dir)));
    } else {
      checks.push({
        id: `${dir}:manifest`,
        description: `${dir} has manifest.json with checks`,
        passed: false,
        truth: "UNKNOWN",
      });
    }
    checks.push(...(await runDoctorInvariants(fixtureRoot, dir)));
  }

  const passed = checks.every((c) => c.passed);
  return {
    root: agentRoot,
    fixtureRoot: evalRoot,
    fixturesRun,
    checks,
    passed,
    limitations,
  };
}
