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

function htmlPage(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AgentDoctor Dashboard</title>
  <style>
    :root { --bg:#0f1419; --fg:#e7ecf1; --muted:#9aa7b5; --accent:#3d9cfd; --card:#1a222c; }
    * { box-sizing: border-box; }
    body { margin:0; font-family: ui-sans-serif, system-ui, sans-serif; background:var(--bg); color:var(--fg); }
    header { padding:1.25rem 1.5rem; border-bottom:1px solid #243040; }
    h1 { margin:0; font-size:1.25rem; letter-spacing:0.02em; }
    p { color:var(--muted); margin:0.35rem 0 0; }
    main { padding:1.5rem; display:grid; gap:1rem; max-width:1100px; margin:0 auto; }
    section { background:var(--card); border-radius:10px; padding:1rem 1.1rem; }
    h2 { margin:0 0 0.75rem; font-size:1rem; }
    pre { white-space:pre-wrap; word-break:break-word; font-size:0.85rem; color:#d5dde6; }
    .muted { color:var(--muted); }
    a { color:var(--accent); }
    .notice { border-left:3px solid var(--accent); padding-left:0.75rem; margin-top:0.75rem; }
  </style>
</head>
<body>
  <header>
    <h1>AgentDoctor 2.0</h1>
    <p>Local read-only dashboard — Safety + Brain + intelligence. No cloud writes.</p>
    <p class="notice muted">Action Policy Evaluator is evaluate-only. Query ?user= is a localDevIdentityHint only (not authentication). Team local-dev auth is separate and not SSO. OIDC JWT validation is a library path — full browser OAuth redirect is experimental.</p>
  </header>
  <main>
    <nav aria-label="Views" style="display:flex;flex-wrap:wrap;gap:0.75rem;font-size:0.9rem">
      <a href="#home">Home</a>
      <a href="#dna">DNA</a>
      <a href="#graph">Graph</a>
      <a href="#chat">Chat</a>
      <a href="#security">Security</a>
      <a href="#twin">Twin</a>
      <a href="#requirements">Requirements</a>
      <a href="#map">Map</a>
      <a href="#features">Features</a>
      <a href="#deps">Deps</a>
      <a href="#search">Search</a>
      <a href="#whatif">What-if</a>
      <a href="#forensic">Forensic</a>
      <a href="#incident">Incident</a>
      <a href="#infra">Infra</a>
      <a href="#evolution">Evolution</a>
      <a href="#memory">Memory</a>
      <a href="#decisions">Decisions</a>
      <a href="#health">Health</a>
      <a href="#agent">Doctors</a>
    </nav>
    <section id="home" data-route="home">
      <h2>Home</h2>
      <pre id="status" class="muted">Loading…</pre>
    </section>
    <section id="dna" data-route="dna" hidden>
      <h2>Project DNA</h2>
      <pre id="dnaBody" class="muted">Loading…</pre>
    </section>
    <section id="graph" data-route="graph" hidden>
      <h2>Graph / Git / C4</h2>
      <pre id="graphBody" class="muted">Loading…</pre>
    </section>
    <section id="security" data-route="security" hidden>
      <h2>Security doctor</h2>
      <pre id="securityBody" class="muted">Loading…</pre>
    </section>
    <section id="twin" data-route="twin" hidden>
      <h2>Digital twin</h2>
      <pre id="twinBody" class="muted">Loading…</pre>
    </section>
    <section id="requirements" data-route="requirements" hidden>
      <h2>Requirements trace</h2>
      <pre id="requirementsBody" class="muted">Loading…</pre>
    </section>
    <section id="map" data-route="map" hidden>
      <h2>Software map</h2>
      <pre id="mapBody" class="muted">Loading…</pre>
    </section>
    <section id="features" data-route="features" hidden>
      <h2>Feature intelligence</h2>
      <pre id="featuresBody" class="muted">Loading…</pre>
    </section>
    <section id="deps" data-route="deps" hidden>
      <h2>Dependencies</h2>
      <pre id="depsBody" class="muted">Loading…</pre>
    </section>
    <section id="search" data-route="search" hidden>
      <h2>Software search</h2>
      <pre id="searchBody" class="muted">Loading…</pre>
    </section>
    <section id="whatif" data-route="whatif" hidden>
      <h2>What-if</h2>
      <pre id="whatifBody" class="muted">Loading…</pre>
    </section>
    <section id="forensic" data-route="forensic" hidden>
      <h2>Forensic</h2>
      <pre id="forensicBody" class="muted">Loading…</pre>
    </section>
    <section id="incident" data-route="incident" hidden>
      <h2>Incident</h2>
      <pre id="incidentBody" class="muted">Loading…</pre>
    </section>
    <section id="infra" data-route="infra" hidden>
      <h2>Infra</h2>
      <pre id="infraBody" class="muted">Loading…</pre>
    </section>
    <section id="evolution" data-route="evolution" hidden>
      <h2>Evolution</h2>
      <pre id="evolutionBody" class="muted">Loading…</pre>
    </section>
    <section id="memory" data-route="memory" hidden>
      <h2>Institutional memory</h2>
      <pre id="memoryBody" class="muted">Loading…</pre>
    </section>
    <section id="decisions" data-route="decisions" hidden>
      <h2>Decisions</h2>
      <pre id="decisionsBody" class="muted">Loading…</pre>
    </section>
    <section id="health" data-route="health" hidden>
      <h2>Code health</h2>
      <pre id="healthBody" class="muted">Loading…</pre>
    </section>
    <section id="agent" data-route="agent" hidden>
      <h2>Product doctors (API, DB, events)</h2>
      <pre id="agentBody" class="muted">Loading…</pre>
    </section>
    <section id="chat" data-route="chat" hidden>
      <h2>Project Chat</h2>
      <p class="muted">Ask about this repository. Answers use evidence + truth labels. No file writes from this panel.</p>
      <div style="display:grid;grid-template-columns:1.4fr 1fr;gap:1rem">
        <div>
          <textarea id="chatInput" rows="3" style="width:100%;background:#0d1520;color:#e8eef5;border:1px solid #243040;border-radius:8px;padding:0.6rem" placeholder="How does authentication work?"></textarea>
          <button id="chatAsk" style="margin-top:0.5rem;background:var(--accent);color:#041018;border:0;border-radius:6px;padding:0.45rem 0.9rem;font-weight:600;cursor:pointer">Ask</button>
          <pre id="chatBody" class="muted" style="margin-top:0.75rem">Ask a question…</pre>
        </div>
        <div>
          <h3 style="margin:0 0 0.5rem;font-size:0.9rem">Evidence</h3>
          <pre id="chatEvidence" class="muted">—</pre>
        </div>
      </div>
    </section>
  </main>
  <script>
    const routes = ['home','dna','graph','chat','security','twin','requirements','map','features','deps','search','whatif','forensic','incident','infra','evolution','memory','decisions','health','agent'];
    function showRoute(name) {
      const r = routes.includes(name) ? name : 'home';
      for (const el of document.querySelectorAll('[data-route]')) {
        el.hidden = el.getAttribute('data-route') !== r;
      }
      location.hash = r;
    }
    window.addEventListener('hashchange', () => showRoute((location.hash || '#home').slice(1)));
    showRoute((location.hash || '#home').slice(1));

    async function loadSection(route) {
      const map = {
        dna: [['dnaBody','/api/dna']],
        graph: [['graphBody','/api/v2/graph']],
        security: [['securityBody','/api/security']],
        twin: [['twinBody','/api/twin']],
        requirements: [['requirementsBody','/api/requirements']],
        map: [['mapBody','/api/map']],
        features: [['featuresBody','/api/features']],
        deps: [['depsBody','/api/deps']],
        search: [['searchBody','/api/search?q=main']],
        whatif: [['whatifBody','/api/what-if?target=src']],
        forensic: [['forensicBody','/api/forensic']],
        incident: [['incidentBody','/api/incident']],
        infra: [['infraBody','/api/infra']],
        evolution: [['evolutionBody','/api/evolution']],
        memory: [['memoryBody','/api/memory?q=change']],
        decisions: [['decisionsBody','/api/decisions']],
        health: [['healthBody','/api/health']],
        agent: [['agentBody','/api/api-doctor']],
      };
      if (route === 'home') {
        const [status, scan, brain, platform] = await Promise.all([
          fetch('/api/status').then(r => r.json()),
          fetch('/api/scan').then(r => r.json()),
          fetch('/api/brain').then(r => r.json()),
          fetch('/api/platform').then(r => r.json()),
        ]);
        document.getElementById('status').textContent = JSON.stringify({ status, scan, brain, platform }, null, 2);
        return;
      }
      if (route === 'agent') {
        const [api, db, events] = await Promise.all([
          fetch('/api/api-doctor').then(r => r.json()),
          fetch('/api/database').then(r => r.json()),
          fetch('/api/events').then(r => r.json()),
        ]);
        document.getElementById('agentBody').textContent = JSON.stringify({ api, db, events }, null, 2);
        return;
      }
      const loaders = map[route] || [];
      for (const [elId, url] of loaders) {
        const data = await fetch(url).then(r => r.json());
        document.getElementById(elId).textContent = JSON.stringify(data, null, 2);
      }
    }
    async function load() {
      const route = (location.hash || '#home').slice(1) || 'home';
      await loadSection(route);
    }
    window.addEventListener('hashchange', () => load().catch(err => console.error(err)));
    load().catch(err => {
      document.getElementById('status').textContent = String(err);
    });
    document.getElementById('chatAsk').addEventListener('click', async () => {
      const question = document.getElementById('chatInput').value.trim();
      if (!question) return;
      document.getElementById('chatBody').textContent = 'Thinking…';
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question }),
        });
        const data = await res.json();
        document.getElementById('chatBody').textContent = data.message || JSON.stringify(data, null, 2);
        document.getElementById('chatEvidence').textContent = JSON.stringify({
          truthClaims: data.truthClaims || [],
          citations: data.citations || [],
          limitations: data.limitations || [],
          status: data.status,
        }, null, 2);
      } catch (err) {
        document.getElementById('chatBody').textContent = String(err);
      }
    });
  </script>
</body>
</html>`;
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
      if (url.pathname === "/api/what-if") {
        const target = url.searchParams.get("target") ?? "";
        if (!target.trim()) {
          sendJson(res, 400, { error: "target query param required" });
          return;
        }
        sendJson(res, 200, await analyzeWhatIf(root, target));
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
