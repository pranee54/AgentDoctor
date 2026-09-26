# AgentDoctor 2.0 — Phase 0 Baseline Assessment

**Date:** 2026-09-21
**Package:** `@praneeth_54/agentdoctor@1.1.1`
**Scope:** Inspect-only baseline before any master-prompt product expansion
**Git:** working tree has substantial unreleased 2.0 platform work; **no** commit/push/tag/publish in this phase
**Verify (this run):** `npm run verify` → **PASS** — 45 files / 365 tests

---

## 1. Executive verdict

The repository is **not** a blank slate. It already contains three overlapping product layers:

| Layer                                                           | Status                                     | Honesty                           |
| --------------------------------------------------------------- | ------------------------------------------ | --------------------------------- |
| **Safety** (scan / fix / verify / policy / CI Action)           | Production-grade for agent-config auditing | Strong                            |
| **Project Brain + MCP** (`src/core/understanding`, `brain-mcp`) | Real local deterministic intelligence MVP  | Strong (explicit limitations)     |
| **Platform 2.0** (`src/platform`, `agentdoctor platform …`)     | Hardened local MVP after deep audit        | Strong as MVP; **not** enterprise |

The master prompt’s full vision (AST intelligence, governed knowledge workflows, real team auth/RBAC, enforcement adapters, SQLite/Postgres, C4, multi-repo collaboration, accuracy 5/5 matrices) is **largely unimplemented**. Much of it must be built **on top of** existing Brain/Platform/Safety — not by deleting them.

**Phase 0 rule satisfied:** no product rewrite in this step. Baseline only.

---

## 2. What was inspected

1. `package.json` (version, scripts, minimal deps: commander, picocolors, MCP SDK)
2. `src/**` trees: agents, cli, core (safety + understanding + brain-cli + v2 helpers), platform, mcp, dashboard, plugins, integrations
3. CLI registration in `src/cli/program.ts`
4. Dashboard `src/dashboard/server.ts`
5. Tests under `tests/**` (+ understanding/MCP validation scripts)
6. Architecture/docs: `docs/reference/architecture.md`, `docs/features/project-brain.md`, `docs/features/v2-features.md`, `docs/features/dashboard.md`, prior `AGENTDOCTOR_2.0_*` reports
7. Full `npm run verify`

Inventory assistance: [Map existing capabilities](dc338e64-6597-4326-9560-7676088f52a8).

---

## 3. Exact verify results (baseline)

```text
npm run typecheck     PASS
npm run lint          PASS
npm run format:check  PASS
npm test              PASS
npm run build         PASS
npm run verify        PASS

Test Files  45 passed (45)
Tests       365 passed (365)
Package     1.1.1
```

Related optional suites (not required by `verify`, exist in scripts):

- `npm run test:understanding` / `verify:project-brain`
- `npm run test:mcp` / `verify:mcp`
- validation runners under `validation/`

---

## 4. Architecture map (current)

```text
┌─────────────────────────────────────────────────────────────────┐
│ CLI (commander)  agentdoctor …                                  │
│  scan/fix/verify │ brain* │ platform* │ dashboard │ brain-mcp │
└────────────┬───────────────────┬───────────────────┬────────────┘
             │                   │                   │
     ┌───────▼────────┐  ┌───────▼────────┐  ┌───────▼────────┐
     │ Safety pipeline│  │ Project Brain  │  │ Platform 2.0   │
     │ discovery→     │  │ understand→    │  │ graph/health/  │
     │ agents→rules→  │  │ claims/store   │  │ policy/sessions│
     │ scores/fix    │  │ MCP tools      │  │ reports/API    │
     └───────┬────────┘  └───────┬────────┘  └───────┬────────┘
             │                   │                   │
             └─────────┬─────────┴─────────┬─────────┘
                       ▼                   ▼
              .agentdoctor/         agentdoctor-report.json
              project-brain/        (verify baselines)
              platform/
              fix-audit/
              baselines/
              plugins/
```

**Dependencies:** intentionally minimal (no DB ORM, no auth SDK, no tree-sitter).

**Public contracts to preserve:**

- CLI command names and exit codes for Safety (`scan`, `fix`, `verify`, …)
- Package exports from `src/index.ts`
- Brain store format under `.agentdoctor/project-brain/`
- MCP tool names (`brain_overview`, …)
- Platform evaluate-only semantics (`executionResult: "not-executed"`)
- Loopback dashboard defaults

---

## 5. Existing functionality inventory

### 5.1 Preserved / working (master prompt §1 list)

| Capability                                   | Where                                                    | Maturity                     |
| -------------------------------------------- | -------------------------------------------------------- | ---------------------------- |
| Repository intelligence (Safety + detectors) | `src/core/scanner`, `src/detectors`                      | Strong                       |
| Repository graph                             | `src/platform/graph` (+ Brain relationships)             | MVP heuristic                |
| Code-health heuristics                       | `src/platform/health`                                    | MVP                          |
| Action Policy Evaluator                      | `src/platform/firewall`                                  | Hardened MVP (evaluate-only) |
| Session record/replay                        | `src/platform/sessions`                                  | MVP                          |
| Provenance                                   | `src/platform/provenance`                                | MVP (unknown-safe)           |
| Context-security                             | `src/platform/context-security`                          | Pattern MVP                  |
| Knowledge analysis                           | `src/platform/knowledge`                                 | Thin MVP                     |
| Test-impact                                  | `src/platform/test-impact` + CLI/API                     | Connected MVP                |
| Architecture drift                           | `src/platform/architecture`                              | Policy MVP                   |
| Time-machine                                 | `src/platform/time-machine`                              | Git path diff MVP            |
| Refactor-impact                              | `src/platform/refactor`                                  | Rename heuristic MVP         |
| Token planning                               | `src/platform/tokens`                                    | MVP                          |
| AI-diff quality                              | `src/platform/ai-quality`                                | Thin MVP                     |
| Readiness                                    | `src/platform/readiness`                                 | Coarse scorecard             |
| Reports JSON/CSV/MD/HTML/SARIF               | `src/platform/reports`                                   | MVP + redaction              |
| Local dashboard + platform API               | `src/dashboard/server.ts`                                | Read-only local              |
| Local role matrix                            | `src/platform/auth/local.ts`                             | **Not real auth**            |
| Secret redaction                             | `src/platform/security/redact.ts`, Brain evidence redact | Present                      |
| Path-traversal protection                    | platform store, sessions, paths utils                    | Hardened                     |
| Git-ref validation                           | time-machine                                             | Present                      |
| CLI JSON (`optsWithGlobals`)                 | platform commands                                        | Fixed                        |
| Loopback dashboard                           | dashboard + CLI flag                                     | Present                      |
| Hostile-input tests                          | platform-security + post-audit suites                    | Present                      |

### 5.2 Also present (beyond §1 list)

- Full Safety rule engine + Safe Fix writers (Cursor/Claude/Codex/Gemini/Aider)
- Agent adapters: cursor, claude-code, codex, copilot, windsurf, gemini-cli, aider
- Project Brain claims/evidence/contradictions/deltas + CLI
- Brain MCP (10 tools)
- Changes / context-health / secrets / baselines / packages / pr-review dry-run
- Plugins discovery + optional local-ai probe
- GitHub Action (`action.yml`)

### 5.3 Storage today

| Path                          | Purpose                                                    |
| ----------------------------- | ---------------------------------------------------------- |
| `.agentdoctor/project-brain/` | Brain snapshots                                            |
| `.agentdoctor/platform/`      | Platform snapshots, reports, sessions, policies, auth.json |
| `.agentdoctor/fix-audit/`     | Safe Fix backups                                           |
| `.agentdoctor/baselines/`     | Named Safety baselines                                     |
| `.agentdoctor/plugins/`       | Plugin manifests                                           |

**No** SQLite, PostgreSQL, graph DB, or vector index.

---

## 6. Master-prompt gap matrix (vision vs reality)

Legend: **I** = implemented MVP · **P** = partial · **E** = experimental/thin · **N** = not implemented · **U** = unsupported / must not claim

| Vision area                                  | Status  | Notes                                                                                       |
| -------------------------------------------- | ------- | ------------------------------------------------------------------------------------------- |
| Repository Brain (facts/proposals/approvals) | **P**   | Claims lifecycle exists; no `init` wizard, no human approval UX, no ADR generation pipeline |
| `agentdoctor init` product wizard            | **N**   | `brain init` only creates store dirs                                                        |
| `brain snapshot/update/review` naming        | **P**   | `rebuild`/`history`/`inspect` exist; review workflow absent                                 |
| AST parsing / call graphs                    | **N**   | Regex heuristics only                                                                       |
| Language-aware symbol/import resolution      | **E/P** | Heuristic extractors                                                                        |
| Framework adapters (routes→handlers)         | **E**   | Limited pattern inference                                                                   |
| Explainable Q&A with abstention              | **P**   | Brain queries + confidence; not NL Q&A product                                              |
| Git hotspots / bus factor / co-change        | **N/E** | Time-machine + changes only                                                                 |
| Dead-code tiers (confirmed vs possible)      | **N**   | Not present                                                                                 |
| Architecture-first domain→ADR workflow       | **N**   | Drift rules only                                                                            |
| C4 diagrams                                  | **N**   |                                                                                             |
| MCP task tools (impact/health/policy)        | **P**   | Brain tools only; not full platform MCP surface                                             |
| Agent session comparison / provenance links  | **P**   | Sessions + provenance separate                                                              |
| Runtime enforcement adapters                 | **U/N** | Explicitly evaluate-only                                                                    |
| Governed knowledge (draft/publish/approve)   | **N**   | Doc inventory ≠ governance                                                                  |
| Real auth + server RBAC + multi-user         | **N**   | Local `?user=` only                                                                         |
| Multi-repo workspaces                        | **N**   | Monorepo package detect only                                                                |
| Coverage-backed test impact                  | **N**   | Heuristic only (honestly labeled)                                                           |
| SQLite/Postgres + migrations                 | **N**   |                                                                                             |
| Vector search                                | **N**   |                                                                                             |
| Container/self-host team deploy              | **N**   | Local CLI process only                                                                      |
| Accuracy/perf 5/5 matrices                   | **N**   | Tests exist; not capability-scored 5/5                                                      |

---

## 7. Known limitations (carry forward)

From Project Brain docs, platform audit/hardening, and code:

1. Dependencies/relationships/graphs are **not AST-true**.
2. Action Policy Evaluator does **not** intercept Cursor/Claude/IDE agents.
3. Local dashboard roles are **not authentication**.
4. Test-impact is **not** coverage-backed.
5. Knowledge module does **not** provide approval workflows.
6. Ownership without CODEOWNERS → UNKNOWN.
7. Brain risks are change-danger, **not** SAST.
8. No cloud SSO, multi-tenant RBAC, or shared team DB.
9. Package version remains **1.1.1** until an explicit release cut.
10. Large parts of the master prompt are **greenfield** relative to this tree.

---

## 8. Trust boundaries (current)

| Boundary                       | Trust model                                               |
| ------------------------------ | --------------------------------------------------------- |
| Local CLI on developer machine | User who can run the CLI can read the repo                |
| Dashboard loopback             | Same; `?user=` is cosmetic permission matrix              |
| Non-loopback dashboard         | Refused unless `--allow-non-loopback` (unsafe)            |
| Brain MCP STDIO                | Caller must supply `--root`; path confinement + redaction |
| Policy evaluator               | Advice only unless an external runner honors verdicts     |
| CI Action                      | Exit codes / annotations — not runtime agent firewall     |

---

## 9. Public contracts — do not break without migration

1. Safety CLI: `scan`, `fix`, `verify`, `explain`, `doctor`, policy flags, exit codes
2. `brain-mcp` tool names and Brain store schema versions
3. Platform evaluate-only: never silently execute agent actions
4. Dashboard GET-only + loopback default
5. Report formats under `.agentdoctor/platform/reports/`
6. npm package name/API surface for library consumers

New master-prompt features should be **additive** (new commands, versioned APIs, feature flags).

---

## 10. Recommended Phase 1 entry (after baseline approval)

Do **not** start with team SaaS or “AST everywhere.” Preserve honesty and local-first:

1. **Core contracts** — shared Evidence / Provenance / Graph / Policy / Knowledge types unifying Brain + Platform (Phase 1 of master prompt).
2. **Repository Brain productization** — map `brain rebuild` → snapshot; add review/approval states for **proposals vs observed facts**; interactive `init` that writes **draft** artifacts only.
3. **Parser adapter interface** — feature-flagged; start with TypeScript via official compiler API or tree-sitter behind a plug-in; keep regex as fallback.
4. **Expand MCP** carefully with impact/test-impact/policy **read** tools (still no arbitrary shell).
5. **Storage abstraction** — filesystem default; optional SQLite behind flag (no forced cloud).
6. Defer real auth/RBAC and enforcement adapters until contracts + Brain + indexing are solid.

Each increment needs tests + updated limitations docs before any “5/5” claim.

---

## 11. Feature-completeness snapshot (honest)

| Bucket                      | Examples                                                                                                                                                           |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Implemented (MVP)**       | Safety scan/fix/verify; Brain snapshots/queries/MCP; platform scan/graph/policy-check/sessions/reports; dashboard; adapters ×7; redaction; loopback; hostile tests |
| **Partial**                 | Deep codebase intelligence; architecture; test/refactor impact; knowledge; agent session intelligence; git history analytics                                       |
| **Experimental**            | Local-ai probe; plugins runtime; AI-diff quality; architecture pattern inference                                                                                   |
| **Planned (master prompt)** | AST engine; governed knowledge; team auth/RBAC; enforcement adapters; C4; DB backends; accuracy benchmarks                                                         |
| **Unsupported today**       | Claiming IDE interception; enterprise SSO; “definitely dead code” without evidence; coverage-backed impact without coverage DB                                     |

---

## 12. Deliverables from Phase 0

| Deliverable                   | Location                                         |
| ----------------------------- | ------------------------------------------------ |
| This baseline assessment      | `AGENTDOCTOR_2.0_PHASE0_BASELINE_ASSESSMENT.md`  |
| Prior deep audit              | `AGENTDOCTOR_2.0_DEEP_AUDIT_REPORT.md`           |
| Prior hardening               | `AGENTDOCTOR_2.0_POST_AUDIT_HARDENING_REPORT.md` |
| Implementation honesty report | `AGENTDOCTOR_2.0_IMPLEMENTATION_REPORT.md`       |
| Verify evidence               | 45/365 PASS @ 1.1.1                              |

**Not produced in Phase 0 (correctly deferred):** new architecture rewrite, accuracy/perf 5/5 matrices, release notes for a fake complete 2.0, DB migrations, team auth.

---

## 13. Explicit non-claims

This baseline does **not** assert that AgentDoctor 2.0 already is:

- A complete codebase-intelligence platform with AST fidelity
- A living Repository Brain with human-approved architecture workflows
- A runtime agent firewall
- An enterprise multi-user collaboration product
- Independently validated at “5/5” on the master-prompt scorecard

It **does** assert that a solid local-first foundation exists and that `npm run verify` is green on that foundation.

---

## 14. Next step gate

**STOP after Phase 0** until you authorize Phase 1 (core contracts) or a narrower vertical slice.

Suggested authorization options:

1. **Phase 1 only** — shared contracts + docs + no user-facing mega-features
2. **Brain productization slice** — `init` drafts + proposal/approval states + tests
3. **TypeScript AST adapter slice** — feature-flagged behind regex fallback

Do not attempt Phases 1–8 of the master prompt in one blind rewrite.
