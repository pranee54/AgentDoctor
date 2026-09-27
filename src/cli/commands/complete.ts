import { EXIT_CODES, type ExitCode } from "../../types/index.js";
import { resolveCliProjectRoot } from "../safe-root.js";
import { runProjectInit } from "../../core/brain-product/init.js";
import { buildIntelligenceGraph } from "../../intelligence/graph/build.js";
import { analyzeGitIntelligence, deadCodeCategory } from "../../intelligence/git/analyze.js";
import { buildC4Views } from "../../architecture/c4.js";
import {
  createKnowledgeRecord,
  listKnowledge,
  retrieveAuthoritative,
  transitionKnowledge,
} from "../../knowledge/store.js";
import { authenticateLocalDev, authorize, registerLocalDevUser } from "../../team/auth.js";
import { runControlledCommand } from "../../enforcement/runner.js";
import {
  analyzeTestImpact,
  analyzeRenameImpact,
  buildRepositoryGraph,
} from "../../platform/index.js";
import { CONTRACTS_VERSION, DEFAULT_FEATURE_FLAGS } from "../../contracts/index.js";
import { platformFindingToContract } from "../../contracts/adapters.js";

function printJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

export async function runInitCommand(options: {
  root?: string;
  json?: boolean;
  name?: string;
  domain?: string;
}): Promise<ExitCode> {
  const gated = await resolveCliProjectRoot(options.root ?? process.cwd());
  if (!gated.ok) {
    console.error(`Error: ${gated.message}`);
    return gated.code;
  }
  const root = gated.root;
  const result = await runProjectInit(root, {
    ...(options.name ? { projectName: options.name } : {}),
    ...(options.domain ? { businessDomain: options.domain } : {}),
  });
  if (options.json) printJson(result);
  else {
    process.stdout.write(
      `AgentDoctor init wrote ${result.artifacts.length} PROPOSED artifacts under .agentdoctor/repository-brain/proposals/\nNone are approved facts until: agentdoctor brain review --artifact <id> --decision approved\n`,
    );
  }
  return EXIT_CODES.SUCCESS;
}

export async function runV2SurfaceCommand(options: {
  action: string;
  root?: string;
  json?: boolean;
  query?: string;
  title?: string;
  content?: string;
  id?: string;
  decision?: string;
  username?: string;
  password?: string;
  token?: string;
  command?: string;
  mode?: string;
  symbol?: string;
}): Promise<ExitCode> {
  const gated = await resolveCliProjectRoot(options.root ?? process.cwd());
  if (!gated.ok) {
    console.error(`Error: ${gated.message}`);
    return gated.code;
  }
  const root = gated.root;
  try {
    switch (options.action) {
      case "graph-ast": {
        const graph = await buildIntelligenceGraph({
          root,
          mode: (options.mode as "auto" | "regex" | "typescript-ast") ?? "auto",
        });
        if (options.json) printJson(graph);
        else
          process.stdout.write(
            `graph builder=${graph.builder} nodes=${graph.nodes.length} edges=${graph.edges.length} astFiles=${graph.astFilesParsed}\n`,
          );
        return EXIT_CODES.SUCCESS;
      }
      case "health":
      case "git-intel": {
        const report = await analyzeGitIntelligence(root);
        if (options.json) printJson(report);
        else
          process.stdout.write(
            `git-intel hotspots=${report.hotspots.length} coChanges=${report.coChanges.length} git=${report.gitAvailable}\n`,
          );
        return EXIT_CODES.SUCCESS;
      }
      case "c4": {
        const graph = await buildIntelligenceGraph({ root, mode: "auto" });
        const views = buildC4Views(graph);
        if (options.json) printJson({ views, featureFlag: DEFAULT_FEATURE_FLAGS.architectureC4 });
        else process.stdout.write(`C4 views: ${views.map((v) => v.level).join(", ")}\n`);
        return EXIT_CODES.SUCCESS;
      }
      case "dead-code-demo": {
        const sample = deadCodeCategory({
          exported: true,
          referenced: false,
          frameworkEntry: false,
          dynamicHint: false,
        });
        if (options.json) printJson(sample);
        else process.stdout.write(`${sample.category} confidence=${sample.confidence}\n`);
        return EXIT_CODES.SUCCESS;
      }
      case "knowledge-create": {
        if (!options.title || !options.content) {
          console.error("Error: --title and --content required");
          return EXIT_CODES.USAGE_ERROR;
        }
        const rec = await createKnowledgeRecord({
          root,
          title: options.title,
          content: options.content,
          status: "draft",
        });
        if (options.json) printJson(rec);
        else process.stdout.write(`Created draft knowledge ${rec.id}\n`);
        return EXIT_CODES.SUCCESS;
      }
      case "knowledge-list": {
        const list = await listKnowledge(root);
        if (options.json) printJson({ records: list });
        else for (const r of list) process.stdout.write(`${r.id} [${r.status}] ${r.title}\n`);
        return EXIT_CODES.SUCCESS;
      }
      case "knowledge-transition": {
        if (!options.id || !options.decision) {
          console.error("Error: --id and --decision required");
          return EXIT_CODES.USAGE_ERROR;
        }
        const rec = await transitionKnowledge({
          root,
          id: options.id,
          to: options.decision as
            "approved" | "rejected" | "pending-review" | "deprecated" | "draft",
        });
        if (options.json) printJson(rec);
        else process.stdout.write(`${rec.id} -> ${rec.status}\n`);
        return EXIT_CODES.SUCCESS;
      }
      case "knowledge-query": {
        const list = await listKnowledge(root);
        const result = retrieveAuthoritative(list, options.query ?? "");
        if (options.json) printJson(result);
        else
          process.stdout.write(
            result.abstain
              ? `ABSTAIN: ${result.reason}\n`
              : `AUTHORITATIVE: ${result.record?.title}\n`,
          );
        return EXIT_CODES.SUCCESS;
      }
      case "team-register": {
        if (!options.username || !options.password) {
          console.error("Error: --username and --password required (local-dev auth only)");
          return EXIT_CODES.USAGE_ERROR;
        }
        const user = await registerLocalDevUser({
          root,
          username: options.username,
          password: options.password,
          role: "admin",
        });
        if (options.json) printJson({ ...user, notice: "local-dev auth — not enterprise SSO" });
        else process.stdout.write(`Registered local-dev user ${user.username} (${user.id})\n`);
        return EXIT_CODES.SUCCESS;
      }
      case "team-login": {
        if (!options.username || !options.password) {
          console.error("Error: --username and --password required");
          return EXIT_CODES.USAGE_ERROR;
        }
        const session = await authenticateLocalDev({
          root,
          username: options.username,
          password: options.password,
        });
        if (options.json)
          printJson({ ...session, notice: "local-dev session — not enterprise SSO" });
        else process.stdout.write(`token=${session.token} expires=${session.expiresAt}\n`);
        return EXIT_CODES.SUCCESS;
      }
      case "team-authorize": {
        if (!options.token) {
          console.error("Error: --token required");
          return EXIT_CODES.USAGE_ERROR;
        }
        const result = await authorize(root, options.token, "member");
        if (options.json) printJson(result);
        else process.stdout.write(`${result.ok ? "OK" : "DENIED"}: ${result.reason}\n`);
        return EXIT_CODES.SUCCESS;
      }
      case "enforce-check": {
        if (!options.command) {
          console.error("Error: --command required");
          return EXIT_CODES.USAGE_ERROR;
        }
        const result = await runControlledCommand({ root, command: options.command });
        if (options.json) printJson(result);
        else
          process.stdout.write(
            `enforced=${result.enforced} status=${result.decision.executionStatus} decision=${result.decision.decision}\n`,
          );
        return EXIT_CODES.SUCCESS;
      }
      case "impact": {
        const impact = await analyzeTestImpact({ root });
        if (options.json)
          printJson({ kind: "test-impact", contractsVersion: CONTRACTS_VERSION, impact });
        else
          process.stdout.write(
            `impact mode=${impact.mode} recommendedTests=${impact.recommendedTests.length}\n`,
          );
        return EXIT_CODES.SUCCESS;
      }
      case "refactor-impact": {
        if (!options.symbol) {
          console.error("Error: --symbol required");
          return EXIT_CODES.USAGE_ERROR;
        }
        const graph = await buildRepositoryGraph(root);
        const impact = await analyzeRenameImpact({ root, symbol: options.symbol, graph });
        if (options.json) printJson(impact);
        else
          process.stdout.write(
            `refactor ${options.symbol} affected=${impact.affectedFiles.length}\n`,
          );
        return EXIT_CODES.SUCCESS;
      }
      case "contracts-demo": {
        const sample = platformFindingToContract({
          id: "demo",
          module: "demo",
          severity: "info",
          title: "demo",
          message: "demo",
          recommendation: "n/a",
          confidence: 1,
          evidence: [{ kind: "verified", detail: "ok" }],
        });
        if (options.json) printJson({ contractsVersion: CONTRACTS_VERSION, sample });
        else process.stdout.write(`contracts ${CONTRACTS_VERSION}\n`);
        return EXIT_CODES.SUCCESS;
      }
      default:
        console.error(`Error: unknown action ${options.action}`);
        return EXIT_CODES.USAGE_ERROR;
    }
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    return EXIT_CODES.INTERNAL_ERROR;
  }
}
