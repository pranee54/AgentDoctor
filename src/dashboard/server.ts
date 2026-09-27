import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";

import { getBrainStatus } from "../core/brain-cli/service.js";
import { listFixAudits } from "../core/fix/backup.js";
import { listNamedBaselines } from "../core/baseline/store.js";
import { detectMonorepo } from "../core/monorepo/detect.js";
import { scan } from "../core/scanner/scan.js";
import { resolveRepoRoot } from "../utils/path.js";
import { agentRegistry } from "../agents/registry.js";
import { listSessions } from "../platform/sessions/store.js";
import { platformDir, readJsonIfExists } from "../platform/store.js";
import type { PlatformSnapshot } from "../platform/types.js";
import { canAccess, loadLocalAuthConfig, resolveRole } from "../platform/auth/local.js";
import { EVALUATE_ONLY } from "../platform/firewall/evaluate.js";
import { redactSecrets, sanitizeFindingsForExport } from "../platform/security/redact.js";
import { buildIntelligenceGraph } from "../intelligence/graph/build.js";
import { analyzeGitIntelligence } from "../intelligence/git/analyze.js";
import { buildC4Views } from "../architecture/c4.js";
import { listKnowledge } from "../knowledge/store.js";
import { CONTRACTS_VERSION } from "../contracts/index.js";
import { collectOpsHealth } from "../ops/health.js";
import { listPolicyPacks } from "../policy/packs.js";
import { sanitizeForOutput } from "../utils/path.js";
import { createModelProvider, loadAiConfig } from "../ai/index.js";
import type { ModelProvider } from "../ai/types.js";
import { ChatService } from "../agent/chat/service.js";
import { formatChatResponseForCli } from "../agent/chat/response.js";
import { buildProjectDna } from "../product/dna/build.js";
import { buildSoftwareMap } from "../product/map/software-map.js";
import { buildSoftwareDigitalTwin } from "../product/twin/store.js";
import { analyzeCodeHealth } from "../product/health/code-health.js";
import { traceRequirements } from "../product/requirements/trace.js";
import { analyzeApiSurface } from "../product/api/doctor.js";
import { analyzeDatabaseSchema } from "../product/database/doctor.js";
import { analyzeEvents } from "../product/events/doctor.js";
import { analyzeDependencies } from "../product/deps/analyze.js";
import { analyzeSecuritySurface } from "../product/security/doctor.js";
import { searchSymbolsAndConcepts } from "../product/search/software-search.js";
import { analyzeWhatIf } from "../product/whatif/engine.js";
import { runForensicAnalysis } from "../product/forensic/mode.js";
import { buildIncidentHypotheses } from "../product/ops/incident.js";
import { analyzeInfra } from "../product/ops/infra.js";
import { analyzeFeatureIntelligence } from "../product/features/intelligence.js";
import { buildSoftwareEvolutionTimeline } from "../product/evolution/timeline.js";
import { queryMemory } from "../product/memory/institutional.js";
import { loadDecisionLedger } from "../product/decisions/ledger.js";
import { htmlPage } from "./page.js";

function safeJsonError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  const { text } = redactSecrets(sanitizeForOutput(raw));
  return text.slice(0, 240);
}

function pathnameLooksHostile(pathname: string): boolean {
  const lower = pathname.toLowerCase();
  const decoded = (() => {
    try {
      return decodeURIComponent(pathname);
    } catch {
      return pathname;
    }
  })();
  return (
    pathname.includes("\0") ||
    decoded.includes("\0") ||
    pathname.includes("..") ||
    decoded.includes("..") ||
    lower.includes("%2e%2e") ||
    lower.includes("%2e.") ||
    lower.includes(".%2e") ||
    pathname.includes("\\") ||
    decoded.includes("\\")
  );
}

function redactGraphSamples<T extends { label?: string; path?: string }>(nodes: T[]): T[] {
  return nodes.map((n) => {
    const next = { ...n };
    if (typeof next.label === "string") {
      next.label = redactSecrets(next.label).text;
    }
    if (typeof next.path === "string") {
      next.path = redactSecrets(next.path).text;
    }
    return next;
  });
}

export interface DashboardServerOptions {
  root: string;
  host?: string;
  port?: number;
  /** Read-only by default; mutating routes are never registered. */
  readOnly?: boolean;
  /**
   * Unsafe opt-in to bind outside loopback. Not an enterprise security boundary.
   * Query ?user= is a localDevIdentityHint only; role elevation requires AGENTDOCTOR_ALLOW_LOCAL_IDENTITY_HINT=1.
   */
  allowNonLoopback?: boolean;
  /**
   * Optional provider override (tests). Production uses loadAiConfig().
   * When unset and provider resolves to none, /api/chat fails closed.
   */
  chatProvider?: ModelProvider;
}

export function isLoopbackHost(host: string): boolean {
  const normalized = host.trim().toLowerCase();
  return (
    normalized === "127.0.0.1" ||
    normalized === "::1" ||
    normalized === "localhost" ||
    normalized === "0:0:0:0:0:0:0:1"
  );
}

function sendJson(res: http.ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body, null, 2);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(payload);
}

/**
 * Local read-only HTTP dashboard. Never applies Safe Fix or mutates the repo.
 * Defaults to loopback binding; non-loopback requires explicit allowNonLoopback.
 */
export async function startDashboardServer(
  options: DashboardServerOptions,
): Promise<{ host: string; port: number; close: () => Promise<void> }> {
  const root = resolveRepoRoot(options.root);
  const host = options.host ?? "127.0.0.1";
  const port = options.port ?? 8787;

  if (!isLoopbackHost(host) && options.allowNonLoopback !== true) {
    throw new Error(
      `Refusing to bind dashboard to non-loopback host "${host}". Pass allowNonLoopback / --allow-non-loopback to override (unsafe; not an enterprise security boundary).`,
    );
  }

  const server = http.createServer(async (req, res) => {
    try {
      const rawUrl = req.url ?? "/";
      if (pathnameLooksHostile(rawUrl.split("?")[0] ?? rawUrl)) {
        sendJson(res, 400, { error: "invalid path" });
        return;
      }
      const url = new URL(rawUrl, `http://${host}:${port}`);
      if (req.method === "POST" && url.pathname === "/api/chat") {
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        let body: { question?: string } = {};
        try {
          body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}") as {
            question?: string;
          };
        } catch {
          sendJson(res, 400, { error: "invalid JSON body" });
          return;
        }
        const question = typeof body.question === "string" ? body.question.trim() : "";
        if (!question) {
          sendJson(res, 400, { error: "question required" });
          return;
        }
        const provider = options.chatProvider ?? createModelProvider(loadAiConfig());
        const chat = new ChatService({
          root,
          provider,
          persistAudit: false,
        });
        try {
          const response = await chat.ask(question);
          sendJson(res, response.status === "ok" ? 200 : 502, {
            ...response,
            cliPreview: formatChatResponseForCli(response),
            note: "Dashboard chat is ask-only; it does not edit files or run commands.",
          });
        } finally {
          await chat.end();
        }
        return;
      }
      if (req.method !== "GET") {
        sendJson(res, 405, {
          error: "dashboard is read-only except POST /api/chat (ask-only; no repo writes)",
        });
        return;
      }
      if (pathnameLooksHostile(url.pathname)) {
        sendJson(res, 400, { error: "invalid path" });
        return;
      }
      if (url.pathname === "/" || url.pathname === "/index.html") {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(htmlPage());
        return;
      }
      if (url.pathname === "/api/status") {
        const mono = await detectMonorepo(root);
        const health = await collectOpsHealth(root);
        sendJson(res, 200, {
          root,
          readOnly: true,
          host,
          loopbackOnly: isLoopbackHost(host),
          contractsVersion: CONTRACTS_VERSION,
          roleNote:
            "Query ?user= is a localDevIdentityHint only — not authentication. Privileged role elevation requires AGENTDOCTOR_ALLOW_LOCAL_IDENTITY_HINT=1",
          actionPolicyNote: EVALUATE_ONLY,
          adapters: agentRegistry.map((a) => a.id),
          policyPacks: listPolicyPacks(),
          ops: health,
          monorepo: {
            isMonorepo: mono.isMonorepo,
            tool: mono.tool,
            packages: mono.packages.length,
          },
        });
        return;
      }
      if (url.pathname === "/api/scan") {
        const result = await scan({ cwd: root });
        sendJson(res, 200, {
          summary: result.summary,
          scores: result.scores,
          findingCount: result.findings.length,
          findings: result.findings.slice(0, 50).map((f) => ({
            id: f.id,
            ruleId: f.ruleId,
            severity: f.severity,
            title: f.title,
            path: f.evidence?.path ?? null,
          })),
        });
        return;
      }
      if (url.pathname === "/api/brain") {
        sendJson(res, 200, await getBrainStatus(root));
        return;
      }
      if (url.pathname === "/api/meta") {
        const audits = await listFixAudits(root);
        const baselines = await listNamedBaselines(root);
        const sessions = await listSessions(root);
        sendJson(res, 200, {
          fixAudits: audits.slice(0, 20).map((a) => ({
            id: a.id,
            mode: a.mode,
            createdAt: a.createdAt,
            entryCount: a.entries.length,
          })),
          baselines,
          sessions: sessions.slice(0, 50),
        });
        return;
      }
      if (url.pathname === "/api/platform") {
        const auth = await loadLocalAuthConfig(root);
        const identityHint = url.searchParams.get("user");
        const allowLocalHint = process.env.AGENTDOCTOR_ALLOW_LOCAL_IDENTITY_HINT === "1";
        // Default: deny privileged elevation. ?user= is a label only unless opt-in env is set.
        let role = auth.defaultRole;
        const localDevIdentityHint =
          identityHint && identityHint.trim() ? identityHint.trim() : null;
        if (localDevIdentityHint && allowLocalHint) {
          role = resolveRole(auth, localDevIdentityHint);
        }
        if (!canAccess(role, "read-findings")) {
          sendJson(res, 403, {
            error: "forbidden",
            localDevIdentityHint,
            notice:
              "?user= is not authentication; privileged ops denied without AGENTDOCTOR_ALLOW_LOCAL_IDENTITY_HINT=1",
          });
          return;
        }
        const snapshot = await readJsonIfExists<PlatformSnapshot>(
          path.join(platformDir(root), "snapshots", "latest.json"),
        );
        const canExport = canAccess(role, "export-reports");
        const safeFindings = snapshot
          ? sanitizeFindingsForExport(snapshot.findings).slice(0, 30)
          : [];
        sendJson(res, 200, {
          role,
          localDevIdentityHint,
          localIdentityHintElevated: Boolean(localDevIdentityHint && allowLocalHint),
          hasSnapshot: snapshot !== null,
          findingCount: snapshot?.findings.length ?? 0,
          graphNodes: snapshot?.graph.nodes.length ?? 0,
          readiness: snapshot?.readiness.categories ?? [],
          testImpact: snapshot?.testImpact
            ? {
                gitAvailable: snapshot.testImpact.gitAvailable,
                changedFiles: snapshot.testImpact.changedFiles.length,
                recommendedTests: snapshot.testImpact.recommendedTests.length,
                missingTestWarnings: snapshot.testImpact.missingTestWarnings.length,
                relatedModules: snapshot.testImpact.relatedModules,
                skipRisk: snapshot.testImpact.skipRisk,
                sampleRecommended: canExport
                  ? snapshot.testImpact.recommendedTests.slice(0, 20)
                  : [],
                sampleMissing: canExport
                  ? snapshot.testImpact.missingTestWarnings.slice(0, 10)
                  : [],
              }
            : null,
          limitations: [
            ...(snapshot?.limitations ?? [
              "No platform snapshot yet — run: agentdoctor platform scan",
            ]),
            "?user= is localDevIdentityHint only — not authentication",
            allowLocalHint
              ? "AGENTDOCTOR_ALLOW_LOCAL_IDENTITY_HINT=1 enabled — hint may elevate local roles (still not SSO)"
              : "Privileged role elevation from ?user= denied unless AGENTDOCTOR_ALLOW_LOCAL_IDENTITY_HINT=1",
            EVALUATE_ONLY,
          ],
          sampleFindings: canExport
            ? safeFindings.map((f) => ({
                id: f.id,
                module: f.module,
                severity: f.severity,
                title: f.title,
              }))
            : [],
        });
        return;
      }
      if (url.pathname === "/api/v2/graph") {
        const graph = await buildIntelligenceGraph({ root, mode: "auto" });
        sendJson(res, 200, {
          contractsVersion: CONTRACTS_VERSION,
          builder: graph.builder,
          nodeCount: graph.nodes.length,
          edgeCount: graph.edges.length,
          sampleNodes: redactGraphSamples(graph.nodes.slice(0, 40)),
          sampleEdges: graph.edges.slice(0, 40),
          limitations: graph.limitations,
        });
        return;
      }
      if (url.pathname === "/api/v2/health") {
        sendJson(res, 200, await analyzeGitIntelligence(root));
        return;
      }
      if (url.pathname === "/api/v2/c4") {
        const graph = await buildIntelligenceGraph({ root, mode: "auto" });
        sendJson(res, 200, {
          views: buildC4Views(graph),
          label: "Inferred/proposed — not approved architecture facts",
        });
        return;
      }
      if (url.pathname === "/api/v2/knowledge") {
        const records = await listKnowledge(root);
        sendJson(res, 200, {
          count: records.length,
          records: records.slice(0, 100).map((r) => ({
            id: r.id,
            title: r.title,
            status: r.status,
            version: r.version,
          })),
        });
        return;
      }
      if (url.pathname === "/api/dna") {
        sendJson(res, 200, await buildProjectDna(root));
        return;
      }
      if (url.pathname === "/api/map") {
        sendJson(res, 200, await buildSoftwareMap(root));
        return;
      }
      if (url.pathname === "/api/twin") {
        sendJson(res, 200, await buildSoftwareDigitalTwin(root));
        return;
      }
      if (url.pathname === "/api/health-code") {
        sendJson(res, 200, await analyzeCodeHealth(root));
        return;
      }
      if (url.pathname === "/api/requirements") {
        sendJson(res, 200, await traceRequirements(root));
        return;
      }
      if (url.pathname === "/api/api-doctor") {
        sendJson(res, 200, await analyzeApiSurface(root));
        return;
      }
      if (url.pathname === "/api/database") {
        sendJson(res, 200, await analyzeDatabaseSchema(root));
        return;
      }
      if (url.pathname === "/api/events") {
        sendJson(res, 200, await analyzeEvents(root));
        return;
      }
      if (url.pathname === "/api/deps") {
        sendJson(res, 200, await analyzeDependencies(root));
        return;
      }
      if (url.pathname === "/api/security") {
        sendJson(res, 200, await analyzeSecuritySurface(root));
        return;
      }
      if (url.pathname === "/api/search") {
        const q = url.searchParams.get("q") ?? "";
        sendJson(res, 200, await searchSymbolsAndConcepts(root, q));
        return;
      }
      if (url.pathname === "/api/what-if" || url.pathname === "/api/whatif") {
        const target = url.searchParams.get("target") ?? "";
        if (!target.trim()) {
          sendJson(res, 400, { error: "target query param required" });
          return;
        }
        try {
          sendJson(res, 200, await analyzeWhatIf(root, target));
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          const ownershipDenied =
            /ownership|escapes|path escape|PROJECT_OWNERSHIP/i.test(message) ||
            (error instanceof Error && error.name === "ProjectOwnershipError");
          // Never return raw Error text to clients (CodeQL js/stack-trace-exposure).
          sendJson(res, ownershipDenied ? 400 : 500, {
            error: ownershipDenied
              ? "path outside project ownership"
              : "what-if analysis failed",
          });
        }
        return;
      }
      if (url.pathname === "/api/forensic") {
        sendJson(res, 200, await runForensicAnalysis(root));
        return;
      }
      if (url.pathname === "/api/incident") {
        sendJson(res, 200, await buildIncidentHypotheses(root));
        return;
      }
      if (url.pathname === "/api/infra") {
        sendJson(res, 200, await analyzeInfra(root));
        return;
      }
      if (url.pathname === "/api/features") {
        sendJson(res, 200, await analyzeFeatureIntelligence(root));
        return;
      }
      if (url.pathname === "/api/evolution") {
        sendJson(res, 200, await buildSoftwareEvolutionTimeline(root));
        return;
      }
      if (url.pathname === "/api/memory") {
        const q = url.searchParams.get("q") ?? "";
        sendJson(res, 200, await queryMemory(root, q));
        return;
      }
      if (url.pathname === "/api/decisions") {
        sendJson(res, 200, await loadDecisionLedger(root));
        return;
      }
      if (url.pathname === "/api/health") {
        sendJson(res, 200, await analyzeCodeHealth(root));
        return;
      }
      if (url.pathname === "/api/v2/projects" || url.pathname === "/api/v2/workspaces") {
        sendJson(res, 200, {
          mode: "local-single-repo",
          root,
          notice:
            "Multi-repo workspaces are partially implemented (storage abstraction). Cloud org workspaces unsupported.",
        });
        return;
      }
      sendJson(res, 404, { error: "not found" });
    } catch (error) {
      sendJson(res, 500, { error: safeJsonError(error) });
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.listen(port, host, () => resolve());
    server.on("error", reject);
  });

  const address = server.address();
  const boundPort =
    typeof address === "object" && address && typeof address.port === "number"
      ? address.port
      : port;

  return {
    host,
    port: boundPort,
    close: async () =>
      new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}

/** Write a static snapshot HTML for offline viewing (optional helper). */
export async function writeDashboardSnapshot(
  rootInput: string,
  outputPath: string,
): Promise<string> {
  const absolute = path.resolve(outputPath);
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  await fs.writeFile(absolute, htmlPage(), "utf8");
  return absolute;
}
