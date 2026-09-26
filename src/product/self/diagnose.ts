import fs from "node:fs/promises";
import path from "node:path";

import { detectProject } from "../../detectors/project.js";
import { resolveRepoRoot } from "../../utils/path.js";
import { pathExists } from "../../utils/fs.js";
import type { TruthLabel } from "../truth.js";

export interface SelfDiagnoseFinding {
  id: string;
  label: string;
  ok: boolean;
  truth: TruthLabel;
  evidence: string;
}

export interface SelfDiagnoseReport {
  root: string;
  ok: boolean;
  findings: SelfDiagnoseFinding[];
  limitations: string[];
}

const REQUIRED_MODULES = [
  "src/security/paths.ts",
  "src/enforcement/runner.ts",
  "src/assurance/change.ts",
  "src/intelligence/graph/build.ts",
];

export async function diagnoseAgentDoctorSelf(rootInput?: string): Promise<SelfDiagnoseReport> {
  const root = resolveRepoRoot(rootInput ?? process.cwd());
  const limitations = [
    "Self-check reports VERIFIED findings only when files/signals are present on disk.",
    "Does not validate npm publish or CI status.",
  ];

  const findings: SelfDiagnoseFinding[] = [];

  try {
    const detection = await detectProject(root);
    const langs = detection.repository.languages ?? [];
    findings.push({
      id: "detect-project",
      label: "detectProject completes",
      ok: true,
      truth: "VERIFIED",
      evidence: `languages=${langs.join(",") || "none"}`,
    });
  } catch (error) {
    findings.push({
      id: "detect-project",
      label: "detectProject completes",
      ok: false,
      truth: "VERIFIED",
      evidence: error instanceof Error ? error.message : String(error),
    });
  }

  const testsDir = path.join(root, "tests");
  const testsExists = await pathExists(testsDir);
  findings.push({
    id: "tests-dir",
    label: "tests/ directory exists",
    ok: testsExists,
    truth: testsExists ? "VERIFIED" : "VERIFIED",
    evidence: testsExists ? "tests/" : "missing tests/",
  });

  const pkgPath = path.join(root, "package.json");
  let scriptsOk = false;
  let scriptEvidence = "no package.json";
  if (await pathExists(pkgPath)) {
    try {
      const pkg = JSON.parse(await fs.readFile(pkgPath, "utf8")) as {
        scripts?: Record<string, string>;
      };
      const scripts = pkg.scripts ?? {};
      scriptsOk = typeof scripts.test === "string";
      scriptEvidence = scriptsOk ? `test script present` : "test script missing";
    } catch {
      scriptEvidence = "package.json unreadable";
    }
  }
  findings.push({
    id: "package-test-script",
    label: "package.json defines test script",
    ok: scriptsOk,
    truth: "VERIFIED",
    evidence: scriptEvidence,
  });

  for (const rel of REQUIRED_MODULES) {
    const abs = path.join(root, rel);
    const ok = await pathExists(abs);
    findings.push({
      id: `module-${rel.replace(/[^\w]/g, "-")}`,
      label: `Required module ${rel}`,
      ok,
      truth: "VERIFIED",
      evidence: ok ? "present" : "missing",
    });
  }

  const ok = findings.every((f) => f.ok);
  return { root, ok, findings, limitations };
}
