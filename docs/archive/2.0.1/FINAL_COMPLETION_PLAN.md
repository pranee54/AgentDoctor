# AgentDoctor 2.0.1 — Final Completion Plan

**Date:** 2026-09-23  
**Constraint:** No commit / tag / push / npm publish until human authorization.  
**Source of truth:** [COMPLETE_IMPLEMENTATION_AUDIT.md](COMPLETE_IMPLEMENTATION_AUDIT.md)

Status targets after this program: **IMPLEMENTED** | **VERIFIED** | **EXPERIMENTAL** | **EXTERNAL LIMITATION**  
(Do not leave internally controllable work as vague PARTIAL.)

---

## Map: current PARTIAL / UNSUPPORTED → work

| Item                                             | Target                                       | Primary files                              | Tests                    | Acceptance                                                                      |
| ------------------------------------------------ | -------------------------------------------- | ------------------------------------------ | ------------------------ | ------------------------------------------------------------------------------- |
| Change assurance depth (symbols/callers/callees) | IMPLEMENTED                                  | `src/assurance/change.ts`, graph edges     | `tests/unit/assurance/*` | Assessment includes callers/callees/renames from graph+git; never filename-only |
| ChangeProof engineering checks vs integrity      | IMPLEMENTED                                  | `src/assurance/proof.ts`                   | tamper + checks tests    | States: NOT_RUN…INTEGRITY_VERIFIED vs ENGINEERING_CHECKS_*; tamper detected     |
| Coverage test attribution                        | IMPLEMENTED (honest hybrid label)            | `src/coverage/*`, `test-impact/analyze.ts` | coverage tests           | Explicit `coverage-backed source impact` vs `heuristic test attribution` fields |
| Architecture declared vs observed                | IMPLEMENTED                                  | `src/architecture/contract.ts`             | contract + drift         | `architecture graph`; circular/undeclared/missing declared                      |
| Call/import resolution                           | IMPLEMENTED (confidence enum)                | `src/intelligence/resolve/*`               | alias/reexport fixtures  | EXACT\|RESOLVED\|INFERRED\|UNRESOLVED; no fake edges                            |
| Incremental graph + query                        | IMPLEMENTED                                  | `src/intelligence/graph/incremental.ts`    | incremental + query      | `graph query`; corrupt→rebuild                                                  |
| Combined MCP maturity                            | IMPLEMENTED                                  | `src/mcp/intelligence/*`                   | STDIO + malicious        | Tools for change/architecture/proof/impact with path safety                     |
| Controlled run + explain                         | IMPLEMENTED                                  | `src/enforcement/runner.ts`                | runner tests             | `run explain`; shell=false default; audit                                       |
| Policy composition                               | IMPLEMENTED                                  | `src/policy/*`                             | conflict tests           | global/repo precedence; fail-closed                                             |
| SQLite                                           | IMPLEMENTED when node:sqlite                 | `src/storage/sqlite.ts`                    | contract + restart       | Persist across reopen                                                           |
| Postgres                                         | IMPLEMENTED when `DATABASE_URL` / CI service | `src/storage/postgres.ts`                  | contract skip-or-run     | Same contract suite; EXTERNAL if no DB in env                                   |
| OIDC + RBAC                                      | IMPLEMENTED library path                     | `src/auth/oidc.ts`, `src/auth/rbac.ts`     | token/role tests         | Real openid-client/jose; remove `?user=` as auth                                |
| Dashboard auth posture                           | IMPLEMENTED                                  | `src/dashboard/server.ts`                  | API auth tests           | Local mode labeled; no spoofable auth                                           |
| Workspace multi-repo                             | IMPLEMENTED                                  | `src/workspace/*`                          | isolation tests          | add/list/status/remove; A!↔B without auth                                       |
| Secret scan severity≠confidence                  | IMPLEMENTED                                  | `src/core/secrets/scan.ts`                 | corpus tests             | Separate fields; redaction                                                      |
| Central path safety                              | IMPLEMENTED                                  | `src/security/paths.ts`                    | traversal suite          | All modules use helper                                                          |
| Language AST Java…Dart                           | EXTERNAL or EXPERIMENTAL                     | `src/languages/*`                          | adapter tests            | Real toolchain/tree-sitter OR capability=unsupported                            |
| IDE interception                                 | EXTERNAL LIMITATION                          | adapters capability map                    | n/a                      | `unsupported_external_capability`                                               |
| HSM / SaaS / vector                              | EXTERNAL / OUT OF BOUNDARY                   | docs                                       | n/a                      | Documented only                                                                 |

---

## Execution order

1. Path safety centralization + change/proof deepening
2. Import resolution + incremental graph query
3. Architecture graph + policy composition + run explain
4. MCP tool expansion
5. Workspace isolation
6. Auth OIDC/RBAC + dashboard
7. Postgres optional + language toolchain bridges
8. Docs sync + FINAL_COMPLETION_AUDIT + verify (no publish)

---

## Out of product boundary (not “fake complete”)

- Hosted multi-tenant SaaS
- HSM-backed evidence
- Claiming engineering correctness from hash integrity alone
- Intercepting Cursor/Claude/Codex process internals without public hooks
