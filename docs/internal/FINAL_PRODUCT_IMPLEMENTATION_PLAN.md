# AgentDoctor — Final Product Implementation Plan

**Date:** 2026-09-26  
**Baseline package version:** `2.1.0` (unchanged during this build)  
**Target:** Local final development build covering 2.2 → 3.0 scope  
**Release actions:** NOT PERFORMED (no publish / push / tag / version bump)

**Baseline verification (Phase A):** `npm test` → **548 passed / 81 files** (2026-09-26).

---

## 1. Current architecture (2.1.0 — VERIFIED)

Invariant (unchanged):

> THE MODEL REASONS. AGENTDOCTOR PROVIDES PROJECT CONTEXT. AGENTDOCTOR CONTROLS TOOLS. AGENTDOCTOR VERIFIES RESULTS. The model is never the source of truth for repository facts.

| Layer                                          | Location                                                 | Status                                   |
| ---------------------------------------------- | -------------------------------------------------------- | ---------------------------------------- |
| CLI                                            | `src/cli/program.ts` + commands                          | IMPLEMENTED                              |
| Public API                                     | `src/index.ts`                                           | IMPLEMENTED                              |
| Project Brain                                  | `src/core/understanding/brain/*`                         | IMPLEMENTED (deterministic)              |
| Graph (TS AST + regex)                         | `src/intelligence/graph`, `src/platform/graph`           | PARTIAL                                  |
| Language adapters                              | `src/languages/*`                                        | PARTIAL (not fully wired into graph)     |
| Change / Evidence / Proof                      | `src/assurance/*`                                        | IMPLEMENTED                              |
| Architecture + C4                              | `src/architecture/*`                                     | IMPLEMENTED                              |
| Policy + controlled runner                     | `src/policy`, `src/enforcement`, `src/platform/firewall` | IMPLEMENTED                              |
| Workspace + path safety                        | `src/workspace`, `src/security/paths`                    | IMPLEMENTED                              |
| Secrets + redaction                            | `src/core/secrets`, `src/ai/redact`, platform redact     | IMPLEMENTED                              |
| AgentRuntime + coding loop                     | `src/agent/*`                                            | IMPLEMENTED (loop); runtime turn PARTIAL |
| Modes (LEARN / BUILD_* / DEVELOPER / AI_AGENT) | `src/agent/modes.ts`                                     | IMPLEMENTED                              |
| Student                                        | `src/agent/student.ts`, `learn` CLI                      | PARTIAL→SUPPORTED for core flows         |
| ModelProvider                                  | `none` / `mock` / `openai-compatible` / `ollama`         | IMPLEMENTED                              |
| MCP (brain + intelligence + agent + combined)  | `src/mcp/*`                                              | IMPLEMENTED                              |
| Dashboard                                      | `src/dashboard/server.ts`                                | PARTIAL (functional, not SPA)            |
| Git intelligence                               | `src/intelligence/git/analyze.ts`                        | PARTIAL                                  |
| Discovery (file walk only)                     | `src/discovery/files.ts`                                 | PARTIAL — no project-root `start`        |
| Ops / team / OIDC                              | `src/ops`, `src/team`, `src/auth`                        | PARTIAL                                  |

---

## 2. Implemented capabilities (reuse — do not duplicate)

- Safety scan / fix / verify for AI agent configs
- Project Brain compile / query / MCP
- Intelligence graph build / update / status
- Import resolution + tsconfig paths
- Change analysis, evidence, proof
- Architecture contract + C4 views
- Policy packs + controlled `run`
- Workspace multi-root isolation
- Agent coding loop with approvals + limits
- Project Chat / ask (provider-optional)
- Learn / viva / student explain paths
- Combined MCP tool surface
- Storage providers (FS / memory / optional SQLite / Postgres)

---

## 3. Incomplete / missing vs final target

### 2.2 Project Intelligence

| Capability                                   | Status         | Notes                                            |
| -------------------------------------------- | -------------- | ------------------------------------------------ |
| `agentdoctor start` / safe project discovery | MISSING        | File walker exists; no root picker / scope guard |
| Project DNA                                  | MISSING        | Need deterministic fingerprint                   |
| AST depth + adapter wiring into graph        | PARTIAL        | Adapters exist; graph barely uses them           |
| Unified code graph (richer nodes/edges)      | PARTIAL        | Extend intelligence graph                        |
| Dependency intelligence                      | PARTIAL        | packages CLI exists; need graph/impact depth     |
| Git intelligence (history Q&A-ready)         | PARTIAL        | Hotspots/co-change; deepen archaeology           |
| Architecture intelligence                    | PARTIAL        | Soften gaps: drift/diff/explanation UX           |
| Project Chat evidence quality                | PARTIAL        | Improve retrieval + truth labels                 |
| Visual software map                          | MISSING        | Navigable map + evidence links                   |
| Code health + tech debt foundation           | PARTIAL        | platform/health exists; unify                    |
| Feature intelligence                         | MISSING / thin | Build on product/knowledge                       |

### 2.3 Lifecycle + Learning

| Capability                                   | Status                              |
| -------------------------------------------- | ----------------------------------- |
| Requirements / traceability                  | MISSING                             |
| Product / journey / business rules           | MISSING / EXPERIMENTAL stubs needed |
| API / Database / Event Doctor                | MISSING                             |
| Refactoring / Migration Doctor               | PARTIAL (`refactor-impact`)         |
| Docs intelligence                            | PARTIAL                             |
| Student LEARN / BUILD_WITH_ME / BUILD_FOR_ME | PARTIAL (exists; deepen)            |
| Viva + student docs                          | PARTIAL                             |

### 2.4 AI Agent + Assurance

| Capability                            | Status                                 |
| ------------------------------------- | -------------------------------------- |
| Full coding agent loop                | IMPLEMENTED                            |
| Specialized role agents (shared core) | MISSING                                |
| Test Brain                            | PARTIAL (`test-impact`)                |
| Security / Privacy Doctor             | PARTIAL (secrets + rules)              |
| AI security hardening suite           | PARTIAL (RC suite exists; expand)      |
| Change Proof + AI Change Ledger       | PARTIAL (proof exists; ledger missing) |
| MCP mature agent tools                | PARTIAL                                |

### 2.5 Operations + Organization

| Capability                           | Status                      |
| ------------------------------------ | --------------------------- |
| Infra / deployment / artifacts       | MISSING / thin              |
| Runtime adapters                     | MISSING (architecture only) |
| Performance / Incident / Failure sim | MISSING                     |
| Org model / service catalog          | MISSING                     |
| Enterprise RBAC / SSO architecture   | PARTIAL (OIDC library path) |

### 3.0 Final

| Capability                       | Status                     |
| -------------------------------- | -------------------------- |
| Software Digital Twin unify      | MISSING (compose existing) |
| What-if engine                   | MISSING                    |
| Decision intelligence / ledger   | MISSING                    |
| Evolution / institutional memory | PARTIAL (Brain + history)  |
| Forensic mode                    | MISSING                    |
| Multi-repo safe relations        | PARTIAL (workspace)        |
| Evaluation Lab + fixtures        | PARTIAL (validation/)      |
| Self-diagnosis                   | PARTIAL (`doctor`)         |

---

## 4. Duplicated / overlapping systems (do not fork)

1. **Brain vs Mind** — prefer Brain; keep Mind as legacy export only.
2. **Two graph builders** — intelligence (primary) + platform/regex; unify via facade, do not add a third.
3. **Three policy surfaces** — scan policy, firewall, packs; document roles, share types.
4. **Two AI stacks** — `src/ai` (canonical for agent/chat) vs `integrations/local-ai` (legacy CLI probe).
5. **Multiple redactors** — keep specialized; share patterns via `src/ai/redact` where possible.
6. **Auth surfaces** — team password, dashboard role map, OIDC; keep adapters, add org facade later.
7. **Language adapters unwired** — foundation fix: enrich graph from adapters.
8. **Naming** — `src/agent` (runtime) vs `src/agents` (IDE detectors) — leave names; document.

---

## 5. Technical debt

- `AgentRuntime.runTurn` does not execute tools (coding loop does) — bridge or clarify API.
- Language adapters unused by graph pipeline.
- Dashboard is embedded HTML, not a full SPA.
- Anthropic/Gemini native providers absent (openai-compatible covers many).
- Go/Java/Kotlin/Rust/Dart AST honestly unsupported.
- Release workflow on tag `v2.1.0` failed quality gates historically; not in scope of this local build.

---

## 6. Final target architecture

```
USER → CLI / Dashboard / MCP / API
  → Project Experience (Chat / Learn / Developer / AI Agent / Team / Production)
  → Question / Task Router
  → Project Brain (+ DNA / Graph / AST / Arch / Deps / Git / Requirements / …)
  → Context Engine → Reasoning (optional ModelProvider)
  → Plan → Risk → Approval → Controlled Tools
  → Change → Tests → Security → Impact → Architecture → Policy
  → Evidence → Proof → Response → Audit
```

New product modules live under **`src/product/`** (orchestration) and extend existing engines — not parallel engines.

---

## 7. Implementation order

| Phase | Focus                                                                              |
| ----- | ---------------------------------------------------------------------------------- |
| A     | Reconnaissance + baseline tests ✅                                                 |
| B     | Foundation: wire AST→graph; agent API clarity; discovery primitives                |
| C     | 2.2 Project Intelligence (start, DNA, graph, deps, git, map, health, search, chat) |
| D     | 2.3 Lifecycle + Learning (requirements, API/DB/events, student deepen)             |
| E     | 2.4 Agent roles, Test Brain, Security/Privacy Doctor, Change Ledger                |
| F     | 2.5 Ops + org adapters                                                             |
| G     | 3.0 Twin, what-if, decisions, forensic, eval lab, self-diagnosis                   |
| H–K   | Integration, security regression, performance, evaluation                          |
| L–M   | Docs matrix + final verification                                                   |

---

## 8. Test strategy

- Unit tests per service (Vitest).
- Integration tests for CLI/MCP/dashboard paths.
- Fixture repos under `fixtures/` / `validation/fixtures/` for golden tasks.
- Security regression suite expansion under `tests/unit/security/`.
- Do not weaken assertions; mark EXTERNAL LIMITATION where host tools missing.

---

## 9. Security strategy

Preserve path safety, workspace isolation, policy, controlled runner, redaction, approval abstraction. Expand injection / fake-approval / symlink / secret tests. Never store API keys in Brain. Repository content remains DATA.

---

## 10. Final acceptance matrix (summary)

See evolving `docs/FINAL_CAPABILITY_MATRIX.md` (created in Phase L; interim tracking in this plan §3). Full 58 acceptance items from master prompt must be demonstrable before **READY FOR FORMAL AUDIT**.

---

## 11. Release independence

Package version stays **2.1.0**. Incremental publish plan documented later in `docs/FINAL_RELEASE_PLAN.md` (2.2 → 3.0). No npm publish / git push / tags during this program.

---

## 12. Immediate next actions

1. Implement safe project discovery + `agentdoctor start`.
2. Implement Project DNA (deterministic).
3. Wire language adapters into intelligence graph enrichment.
4. Add dependency + git + software-map + code-health modules.
5. Continue through 2.3–3.0 without stopping between version labels.
