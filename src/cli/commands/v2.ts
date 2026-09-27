import { EXIT_CODES, type ExitCode } from "../../types/index.js";
import { resolveCliProjectRoot } from "../safe-root.js";
import { analyzeChanges } from "../../core/changes/analyze.js";
import { analyzeContextHealth } from "../../core/context-health/analyze.js";
import { scanSecrets } from "../../core/secrets/scan.js";
import { listFixAudits, undoFix } from "../../core/fix/backup.js";
import {
  baselineFromScan,
  compareToBaseline,
  computeBaselineTrends,
  deleteNamedBaseline,
  listNamedBaselines,
  loadNamedBaseline,
  saveNamedBaseline,
} from "../../core/baseline/store.js";
import { detectMonorepo } from "../../core/monorepo/detect.js";
import { analyzePullRequest } from "../../integrations/github/pr-analyze.js";
import { startDashboardServer } from "../../dashboard/server.js";
import { discoverPlugins } from "../../plugins/sdk.js";
import { runPluginAnalyzers } from "../../plugins/runtime.js";
import {
  createLocalAiProvider,
  type LocalAiProviderId,
} from "../../integrations/local-ai/provider.js";
import { scan } from "../../core/scanner/scan.js";

function printJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

export async function runChangesCommand(options: {
  root?: string;
  since?: string;
  impact?: boolean;
  json?: boolean;
}): Promise<ExitCode> {
  const gated = await resolveCliProjectRoot(options.root ?? process.cwd());
  if (!gated.ok) {
    console.error(`Error: ${gated.message}`);
    return gated.code;
  }
  const root = gated.root;
  const report = await analyzeChanges({
    root,
    ...(options.since ? { since: options.since } : {}),
    impact: options.impact === true,
  });
  if (options.json) {
    printJson(report);
  } else {
    process.stdout.write(
      `Changes (${report.gitAvailable ? "git" : "no-git"})\n  files: ${report.files.length}\n  added: ${report.summary.added} modified: ${report.summary.modified} deleted: ${report.summary.deleted}\n`,
    );
    for (const f of report.files.slice(0, 40)) {
      const mods = f.modules?.length ? `  modules=${f.modules.join(",")}` : "";
      process.stdout.write(`  ${f.staged ? "S" : " "} ${f.kind.padEnd(10)} ${f.path}${mods}\n`);
    }
    if (report.impact) {
      process.stdout.write(
        `Impact: ${report.impact.status} — ${report.impact.reason}\n  edges: ${report.impact.edges.length}\n`,
      );
    }
  }
  return EXIT_CODES.SUCCESS;
}

export async function runContextHealthCommand(options: {
  root?: string;
  json?: boolean;
}): Promise<ExitCode> {
  const gated = await resolveCliProjectRoot(options.root ?? process.cwd());
  if (!gated.ok) {
    console.error(`Error: ${gated.message}`);
    return gated.code;
  }
  const root = gated.root;
  const report = await analyzeContextHealth(root);
  if (options.json) printJson(report);
  else {
    process.stdout.write(
      `Context health\n  instruction files: ${report.instructionFiles.length}\n  conflicts: ${report.conflicts.length}\n`,
    );
    for (const c of report.conflicts) {
      process.stdout.write(`  [${c.severity}] ${c.kind}: ${c.message}\n`);
    }
  }
  return EXIT_CODES.SUCCESS;
}

export async function runSecretsCommand(options: {
  root?: string;
  json?: boolean;
}): Promise<ExitCode> {
  const gated = await resolveCliProjectRoot(options.root ?? process.cwd());
  if (!gated.ok) {
    console.error(`Error: ${gated.message}`);
    return gated.code;
  }
  const root = gated.root;
  const report = await scanSecrets({ root, enabled: true });
  if (options.json) printJson(report);
  else {
    process.stdout.write(
      `Secret scan (opt-in)\n  files: ${report.filesScanned}\n  findings: ${report.findings.length}\n`,
    );
    for (const f of report.findings.slice(0, 30)) {
      process.stdout.write(
        `  [${f.severity}] ${f.ruleId} ${f.file}:${f.line} ${f.redactedSnippet}\n`,
      );
    }
  }
  return report.findings.some((f) => f.severity === "critical")
    ? EXIT_CODES.ISSUES_OR_THRESHOLD
    : EXIT_CODES.SUCCESS;
}

export async function runFixUndoCommand(options: {
  root?: string;
  auditId: string;
}): Promise<ExitCode> {
  try {
    const gated = await resolveCliProjectRoot(options.root);
    if (!gated.ok) {
      console.error(`Error: ${gated.message}`);
      return gated.code;
    }
    const record = await undoFix({
      root: gated.root,
      auditId: options.auditId,
    });
    process.stdout.write(`Undid Safe Fix audit ${options.auditId} → undo audit ${record.id}\n`);
    return EXIT_CODES.SUCCESS;
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    return EXIT_CODES.INTERNAL_ERROR;
  }
}

export async function runFixHistoryCommand(options: {
  root?: string;
  json?: boolean;
}): Promise<ExitCode> {
  const gated = await resolveCliProjectRoot(options.root);
  if (!gated.ok) {
    console.error(`Error: ${gated.message}`);
    return gated.code;
  }
  const audits = await listFixAudits(gated.root);
  if (options.json) printJson({ audits });
  else if (audits.length === 0) process.stdout.write("No Safe Fix audits yet.\n");
  else {
    for (const a of audits) {
      process.stdout.write(`${a.id}  ${a.mode}  ${a.createdAt}  entries=${a.entries.length}\n`);
    }
  }
  return EXIT_CODES.SUCCESS;
}

export async function runBaselineCommand(options: {
  action: "save" | "list" | "diff" | "delete" | "trends";
  name?: string;
  root?: string;
  json?: boolean;
}): Promise<ExitCode> {
  const gated = await resolveCliProjectRoot(options.root ?? process.cwd());
  if (!gated.ok) {
    console.error(`Error: ${gated.message}`);
    return gated.code;
  }
  const root = gated.root;
  try {
    if (options.action === "list") {
      const names = await listNamedBaselines(root);
      if (options.json) printJson({ baselines: names });
      else process.stdout.write(names.length ? `${names.join("\n")}\n` : "No named baselines.\n");
      return EXIT_CODES.SUCCESS;
    }
    if (options.action === "trends") {
      const trends = await computeBaselineTrends(root);
      if (options.json) printJson(trends);
      else if (trends.points.length === 0) {
        process.stdout.write("No baselines for trends.\n");
      } else {
        for (const p of trends.points) {
          process.stdout.write(
            `${p.createdAt}  ${p.name}  total=${p.counts.total} critical=${p.counts.critical}\n`,
          );
        }
        for (const d of trends.deltas) {
          process.stdout.write(
            `  Δ ${d.from}→${d.to}: total ${d.totalDelta >= 0 ? "+" : ""}${d.totalDelta}, critical ${d.criticalDelta >= 0 ? "+" : ""}${d.criticalDelta}\n`,
          );
        }
      }
      return EXIT_CODES.SUCCESS;
    }
    if (options.action === "save") {
      if (!options.name) {
        console.error("Error: --name required");
        return EXIT_CODES.USAGE_ERROR;
      }
      const result = await scan({ cwd: root });
      const baseline = baselineFromScan(options.name, result);
      const file = await saveNamedBaseline(root, baseline);
      process.stdout.write(`Saved baseline ${options.name} → ${file}\n`);
      return EXIT_CODES.SUCCESS;
    }
    if (options.action === "delete") {
      if (!options.name) {
        console.error("Error: --name required");
        return EXIT_CODES.USAGE_ERROR;
      }
      await deleteNamedBaseline(root, options.name);
      process.stdout.write(`Deleted baseline ${options.name}\n`);
      return EXIT_CODES.SUCCESS;
    }
    if (options.action === "diff") {
      if (!options.name) {
        console.error("Error: --name required");
        return EXIT_CODES.USAGE_ERROR;
      }
      const baseline = await loadNamedBaseline(root, options.name);
      if (!baseline) {
        console.error(`Error: baseline not found: ${options.name}`);
        return EXIT_CODES.USAGE_ERROR;
      }
      const result = await scan({ cwd: root });
      const diff = compareToBaseline(baseline, result.findings);
      if (options.json) printJson(diff);
      else {
        process.stdout.write(
          `Baseline ${diff.name}\n  added: ${diff.added.length}\n  removed: ${diff.removed.length}\n  recurring: ${diff.recurring.length}\n  unchanged: ${diff.unchanged}\n`,
        );
      }
      return EXIT_CODES.SUCCESS;
    }
    return EXIT_CODES.USAGE_ERROR;
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    return EXIT_CODES.USAGE_ERROR;
  }
}

export async function runPackagesCommand(options: {
  root?: string;
  json?: boolean;
  scan?: boolean;
}): Promise<ExitCode> {
  const gated = await resolveCliProjectRoot(options.root ?? process.cwd());
  if (!gated.ok) {
    console.error(`Error: ${gated.message}`);
    return gated.code;
  }
  const root = gated.root;
  const mono = await detectMonorepo(root);
  if (!options.scan) {
    if (options.json) printJson(mono);
    else {
      process.stdout.write(
        `Monorepo: ${mono.isMonorepo ? "yes" : "no"} (${mono.tool})\n  packages: ${mono.packages.length}\n`,
      );
      for (const p of mono.packages) {
        process.stdout.write(`  - ${p.name} (${p.relativePath})\n`);
      }
    }
    return EXIT_CODES.SUCCESS;
  }
  const packageScans = [];
  for (const pkg of mono.packages) {
    const result = await scan({ cwd: pkg.absolutePath });
    packageScans.push({
      name: pkg.name,
      path: pkg.relativePath,
      summary: result.summary,
      overall: result.scores?.overall ?? null,
    });
  }
  if (options.json) printJson({ monorepo: mono, packageScans });
  else {
    for (const p of packageScans) {
      process.stdout.write(
        `${p.name}: score=${p.overall} findings=${p.summary.total} (c=${p.summary.critical} w=${p.summary.warning})\n`,
      );
    }
  }
  return EXIT_CODES.SUCCESS;
}

export async function runPrReviewCommand(options: {
  root?: string;
  base?: string;
  json?: boolean;
}): Promise<ExitCode> {
  const gated = await resolveCliProjectRoot(options.root);
  if (!gated.ok) {
    console.error(`Error: ${gated.message}`);
    return gated.code;
  }
  const report = await analyzePullRequest({
    root: gated.root,
    dryRun: true,
    ...(options.base ? { baseRef: options.base } : {}),
  });
  if (options.json) printJson(report);
  else {
    process.stdout.write(report.commentMarkdown);
    process.stdout.write("\n(posted=false; local dry-run only)\n");
  }
  return EXIT_CODES.SUCCESS;
}

export async function runDashboardCommand(options: {
  root?: string;
  host?: string;
  port?: number;
  allowNonLoopback?: boolean;
}): Promise<ExitCode> {
  try {
    const gated = await resolveCliProjectRoot(options.root);
    if (!gated.ok) {
      console.error(`Error: ${gated.message}`);
      return gated.code;
    }
    const server = await startDashboardServer({
      root: gated.root,
      host: options.host ?? "127.0.0.1",
      port: options.port ?? 8787,
      readOnly: true,
      allowNonLoopback: options.allowNonLoopback === true,
    });
    if (options.allowNonLoopback) {
      process.stderr.write(
        "WARNING: dashboard bound outside loopback with --allow-non-loopback. Local ?user= roles are not authentication.\n",
      );
    }
    process.stdout.write(
      `AgentDoctor dashboard (read-only) at http://${server.host}:${server.port}/\nLocal ?user= is not authentication. Press Ctrl+C to stop.\n`,
    );
    await new Promise<void>(() => {
      /* keep process alive until signal */
    });
    return EXIT_CODES.SUCCESS;
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    return EXIT_CODES.USAGE_ERROR;
  }
}

export async function runPluginsCommand(options: {
  root?: string;
  json?: boolean;
  run?: boolean;
}): Promise<ExitCode> {
  const gated = await resolveCliProjectRoot(options.root);
  if (!gated.ok) {
    console.error(`Error: ${gated.message}`);
    return gated.code;
  }
  const root = gated.root;
  const plugins = await discoverPlugins(root);
  const analyzerResults = options.run ? await runPluginAnalyzers(root) : undefined;
  if (options.json) {
    printJson({ plugins, ...(analyzerResults ? { analyzerResults } : {}) });
  } else if (plugins.length === 0) {
    process.stdout.write("No plugins discovered under .agentdoctor/plugins/\n");
  } else {
    for (const p of plugins) {
      process.stdout.write(
        `${p.ok ? "ok" : "ERR"}  ${p.manifest.id}@${p.manifest.version}  caps=${p.manifest.capabilities.join(",")}\n`,
      );
      for (const e of p.errors) process.stdout.write(`    ${e}\n`);
    }
    if (analyzerResults) {
      for (const r of analyzerResults) {
        process.stdout.write(
          `run ${r.ok ? "ok" : "ERR"}  ${r.pluginId}  notes=${r.notes.length}${r.error ? `  ${r.error}` : ""}\n`,
        );
      }
    }
  }
  return EXIT_CODES.SUCCESS;
}

export async function runLocalAiCommand(options: {
  provider?: string;
  prompt?: string;
  json?: boolean;
}): Promise<ExitCode> {
  const id = (options.provider ?? "none") as LocalAiProviderId;
  const provider = createLocalAiProvider(
    id === "mock" || id === "ollama" || id === "none" ? id : "none",
  );
  const response = await provider.generate({
    prompt: options.prompt ?? "Summarize repository agent readiness.",
    context: [],
    maxTokens: 128,
    timeoutMs: 3000,
  });
  if (options.json) printJson(response);
  else {
    process.stdout.write(
      `provider=${response.provider} aiGenerated=${response.aiGenerated}\n${response.text || response.error || "(empty)"}\n`,
    );
  }
  return EXIT_CODES.SUCCESS;
}
