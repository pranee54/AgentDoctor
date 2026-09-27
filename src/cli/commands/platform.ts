import { randomUUID } from "node:crypto";

import { EXIT_CODES, type ExitCode } from "../../types/index.js";
import { resolveCliProjectRoot } from "../safe-root.js";
import {
  analyzeRenameImpact,
  analyzeTestImpact,
  appendSessionEvent,
  buildProvenance,
  compareCommits,
  createSession,
  endSession,
  evaluateAgentAction,
  exportSessionMarkdown,
  formatTestImpactHuman,
  listSessions,
  loadSession,
  persistTestImpactReport,
  planContext,
  runPlatformScan,
  saveProvenance,
  EVALUATE_ONLY,
} from "../../platform/index.js";
import { buildRepositoryGraph } from "../../platform/graph/build.js";

function printJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

export async function runPlatformCommand(options: {
  action: string;
  root?: string;
  json?: boolean;
  query?: string;
  symbol?: string;
  left?: string;
  right?: string;
  command?: string;
  path?: string;
  actionType?: string;
  sessionId?: string;
  failClosed?: boolean;
  coverage?: string;
  since?: string;
}): Promise<ExitCode> {
  const gated = await resolveCliProjectRoot(options.root ?? process.cwd());
  if (!gated.ok) {
    console.error(`Error: ${gated.message}`);
    return gated.code;
  }
  const root = gated.root;
  try {
    switch (options.action) {
      case "scan": {
        const result = await runPlatformScan(root);
        if (options.json)
          printJson({
            findingCount: result.snapshot.findings.length,
            nodeCount: result.snapshot.graph.nodes.length,
            testImpact: result.snapshot.testImpact,
            readiness: result.snapshot.readiness.categories.map((c) => ({
              id: c.id,
              score: c.score,
            })),
            reports: result.reportPaths,
            limitations: result.snapshot.limitations,
          });
        else {
          process.stdout.write(
            `AgentDoctor 2.0 platform scan\n  findings: ${result.snapshot.findings.length}\n  graph nodes: ${result.snapshot.graph.nodes.length}\n  test-impact recommendations: ${result.testImpact.recommendedTests.length}\n  reports: ${Object.keys(result.reportPaths).join(", ")}\n`,
          );
        }
        return EXIT_CODES.SUCCESS;
      }
      case "graph": {
        const graph = await buildRepositoryGraph(root);
        if (options.json) printJson(graph);
        else
          process.stdout.write(`Graph nodes=${graph.nodes.length} edges=${graph.edges.length}\n`);
        return EXIT_CODES.SUCCESS;
      }
      case "test-impact": {
        const report = await analyzeTestImpact({
          root,
          ...(options.coverage ? { coveragePath: options.coverage } : {}),
          ...(options.since ? { since: options.since } : {}),
        });
        const out = await persistTestImpactReport(root, report);
        if (options.json) printJson({ ...report, reportPath: out });
        else {
          process.stdout.write(formatTestImpactHuman(report));
          process.stdout.write(`  wrote: ${out}\n`);
        }
        return EXIT_CODES.SUCCESS;
      }
      case "firewall-check":
      case "policy-check": {
        const verdict = await evaluateAgentAction(
          root,
          {
            actionId: randomUUID(),
            agentId: "cli",
            timestamp: new Date().toISOString(),
            type: (options.actionType as "shell") ?? "shell",
            params: {
              ...(options.command ? { command: options.command } : {}),
              ...(options.path ? { path: options.path } : {}),
            },
            repositoryRoot: root,
          },
          { failClosed: options.failClosed === true },
        );
        if (options.json) printJson({ ...verdict, notice: EVALUATE_ONLY });
        else
          process.stdout.write(
            `Action Policy Evaluator\n  ${EVALUATE_ONLY}\n  decision=${verdict.decision} risk=${verdict.riskLevel} reason=${verdict.reason} executed=${verdict.executionResult}\n`,
          );
        return EXIT_CODES.SUCCESS;
      }
      case "session-start": {
        const session = await createSession({ root, agentId: "cli" });
        process.stdout.write(`session ${session.id}\n`);
        return EXIT_CODES.SUCCESS;
      }
      case "session-show": {
        if (!options.sessionId) {
          console.error("Error: --session <id> required");
          return EXIT_CODES.USAGE_ERROR;
        }
        const session = await loadSession(root, options.sessionId);
        if (!session) {
          console.error("Error: session not found");
          return EXIT_CODES.USAGE_ERROR;
        }
        if (options.json) printJson(session);
        else process.stdout.write(exportSessionMarkdown(session));
        return EXIT_CODES.SUCCESS;
      }
      case "session-list": {
        const ids = await listSessions(root);
        if (options.json) printJson({ sessions: ids });
        else process.stdout.write(ids.length ? `${ids.join("\n")}\n` : "No sessions.\n");
        return EXIT_CODES.SUCCESS;
      }
      case "provenance": {
        if (!options.path) {
          console.error("Error: --path <file> required");
          return EXIT_CODES.USAGE_ERROR;
        }
        const record = buildProvenance({ root, file: options.path });
        const out = await saveProvenance(root, record);
        if (options.json) printJson(record);
        else process.stdout.write(`Wrote ${out}\n`);
        return EXIT_CODES.SUCCESS;
      }
      case "context": {
        const graph = await buildRepositoryGraph(root);
        const plan = await planContext({
          root,
          graph,
          query: options.query ?? "src",
        });
        if (options.json) printJson(plan);
        else
          process.stdout.write(
            `tokens=${plan.estimatedTokens}/${plan.budgetTokens} selected=${plan.selected.length}\n`,
          );
        return EXIT_CODES.SUCCESS;
      }
      case "refactor": {
        if (!options.symbol) {
          console.error("Error: --symbol required");
          return EXIT_CODES.USAGE_ERROR;
        }
        const graph = await buildRepositoryGraph(root);
        const impact = await analyzeRenameImpact({ root, symbol: options.symbol, graph });
        if (options.json) printJson(impact);
        else
          process.stdout.write(
            `symbol=${impact.symbol} affected=${impact.affectedFiles.length} risk=${impact.risk}\n`,
          );
        return EXIT_CODES.SUCCESS;
      }
      case "time-machine": {
        if (!options.left || !options.right) {
          console.error("Error: --left and --right refs required");
          return EXIT_CODES.USAGE_ERROR;
        }
        const cmp = await compareCommits({
          root,
          left: options.left,
          right: options.right,
        });
        if (options.json) printJson(cmp);
        else process.stdout.write(`${cmp.summary}\n`);
        return EXIT_CODES.SUCCESS;
      }
      case "demo-session": {
        const session = await createSession({ root, agentId: "demo-agent", model: "unknown" });
        await appendSessionEvent(session, {
          type: "tool-call",
          summary: "Proposed shell: npm test",
          detail: { command: "npm test" },
          risk: "low",
        });
        const verdict = await evaluateAgentAction(root, {
          actionId: randomUUID(),
          agentId: "demo-agent",
          timestamp: new Date().toISOString(),
          type: "shell",
          params: { command: "npm test" },
          repositoryRoot: root,
        });
        await appendSessionEvent(session, {
          type: "policy",
          summary: `Action Policy Evaluator ${verdict.decision}: ${verdict.reason}`,
          risk: verdict.riskLevel === "critical" ? "critical" : "low",
        });
        await endSession(session);
        if (options.json) printJson({ sessionId: session.id, verdict, notice: EVALUATE_ONLY });
        else process.stdout.write(`demo session ${session.id} (${EVALUATE_ONLY})\n`);
        return EXIT_CODES.SUCCESS;
      }
      default:
        console.error(`Error: unknown platform action: ${options.action}`);
        return EXIT_CODES.USAGE_ERROR;
    }
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    return EXIT_CODES.INTERNAL_ERROR;
  }
}
