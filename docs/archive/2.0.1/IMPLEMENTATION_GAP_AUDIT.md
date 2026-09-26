# AgentDoctor 2.0.1 — Implementation Gap Audit

**Audit date:** 2026-09-23  
**Baseline HEAD:** `dd102b6` (`fix: resolve CodeQL high alerts…`)  
**Package at audit:** `@praneeth_54/agentdoctor@2.0.0`  
**Method:** Read-only inspection of `package.json`, CLI, `src/**`, `docs/2.0/**`, Action/CI. No files modified during the audit pass.

Classification: `IMPLEMENTED` · `PARTIAL` · `BROKEN` · `MISSING` · `INTENTIONALLY UNSUPPORTED`  
Release disposition: `SAFE TO RELEASE as-is` · `MUST FIX BEFORE 2.0.1` · `MUST IMPLEMENT FOR 2.0.1 SCOPE` · `DOCUMENT AS NOT IMPLEMENTED` · `NICE TO HAVE`

---

## Product baseline

| Item           | Evidence                                                                    |
| -------------- | --------------------------------------------------------------------------- |
| Version        | `package.json` + `PACKAGE_VERSION` = **2.0.0**                              |
| Description    | Codebase intelligence, repository analysis, safety controls, and MCP tools… |
| Packaging      | Option B — tarball: `dist` + README + LICENSE + CHANGELOG                   |
| Engines        | Node `>=20`                                                                 |
| Action default | `action.yml` → `version: 2.0.0`                                             |
| Verify gate    | `npm run verify` (typecheck, lint, format, unit, build)                     |

---

## Capability board

| Area                                        | Status                            | 2.0.1 disposition                                             |
| ------------------------------------------- | --------------------------------- | ------------------------------------------------------------- |
| Safety scan / fix / verify / Action         | IMPLEMENTED                       | SAFE TO RELEASE as-is                                         |
| Project Brain + `brain-mcp`                 | IMPLEMENTED                       | SAFE TO RELEASE as-is                                         |
| Combined MCP intelligence                   | PARTIAL                           | SAFE TO RELEASE + document limits                             |
| TS/JS AST graph (`graph`)                   | PARTIAL                           | Harden labels; keep honest AST vs regex                       |
| C4 (`c4`)                                   | PARTIAL / EXPERIMENTAL            | Document inferred                                             |
| `impact` / `test-impact`                    | PARTIAL (heuristic)               | Add optional coverage mode or explicit heuristic label        |
| Policy firewall / `enforce`                 | PARTIAL (evaluate-only)           | Keep evaluate-only; no fake execution                         |
| Dashboard                                   | PARTIAL                           | Loopback; no fake auth                                        |
| Team auth                                   | PARTIAL (local-dev)               | DOCUMENT SSO as NOT IMPLEMENTED                               |
| Secrets                                     | PARTIAL                           | SAFE TO RELEASE as-is                                         |
| Platform reports (JSON/MD/CSV/HTML/SARIF)   | IMPLEMENTED                       | SAFE TO RELEASE as-is                                         |
| Filesystem storage                          | IMPLEMENTED                       | SAFE TO RELEASE as-is                                         |
| SQLite / Postgres / vector                  | INTENTIONALLY UNSUPPORTED         | DOCUMENT AS NOT IMPLEMENTED                                   |
| Change Proof / evidence bundles             | MISSING                           | **MUST IMPLEMENT FOR 2.0.1 SCOPE** (compose existing signals) |
| `change analyze` / `change verify`          | MISSING                           | **MUST IMPLEMENT FOR 2.0.1 SCOPE**                            |
| Coverage-backed test impact                 | MISSING                           | PARTIAL deliverable if LCOV parse lands; else DOCUMENT        |
| Architecture `check` rules                  | PARTIAL                           | Harden if present; else DOCUMENT                              |
| Controlled `run` execution                  | MISSING / intentional non-execute | Prefer evaluate-only over unsafe shell                        |
| OIDC / enterprise SSO                       | INTENTIONALLY UNSUPPORTED         | DOCUMENT                                                      |
| Multi-lang AST / IDE intercept / cloud SaaS | INTENTIONALLY UNSUPPORTED         | DOCUMENT                                                      |

**No broken core Safety/Brain path found on `main`.** Gaps are missing product surfaces and honesty/maturity.

---

## CLI inventory (top-level)

`scan`, `fix`, `fix-undo`, `fix-history`, `brain`, `init`, `graph`, `health`, `impact`, `test-impact`, `refactor-impact`, `session`, `report`, `c4`, `knowledge`, `knowledge-create`, `knowledge-approve`, `enforce`, `team-register`, `team-login`, `changes`, `context-health`, `secrets`, `baseline`, `packages`, `pr-review`, `dashboard`, `plugins`, `local-ai`, `platform`, `verify`, `explain`, `doctor`, `brain-mcp`, `mcp`.

Absent today: `change analyze`, `change verify`, `evidence inspect`, `evidence verify`, `architecture analyze|check|graph` (only `c4`), `policy check|explain|enforce` as a group (have `enforce` / `platform policy-check`), `run`.

---

## Must fix / must implement before calling 2.0.1 complete

1. Version bump set: `package.json`, lockfile, `PACKAGE_VERSION`, Action default, CI pins → **2.0.1**
2. Change assurance CLI composing existing git/graph/impact/policy/knowledge/security signals → durable evidence under `.agentdoctor/evidence/<id>/`
3. Honest status labels everywhere (never heuristic → verified)
4. README / docs/2.0.1 product contract + limitations
5. `npm run verify` + pack + clean-install smoke

## Explicitly out of 2.0.1 (document, do not fake)

- Enterprise SSO / OIDC production provider
- Production SQLite/Postgres/vector backends (unless a minimal SQLite path is fully tested)
- IDE interception / runtime agent hooks as enforcement
- Autonomous unsafe shell execution
- Multi-language AST parity
- Hosted multi-tenant SaaS
- Invented performance/scalability claims

## Recommended 2.0.1 product statement

> AgentDoctor 2.0.1 hardens 2.0.0 and adds **change assurance + evidence bundles** that assemble existing repository signals into an explainable assessment. Safety and Brain MCP remain the supported core. Coverage-backed impact, SSO, and runtime enforcement remain disclosed gaps unless implemented and verified in this cut.
