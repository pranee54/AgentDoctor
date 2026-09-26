# AgentDoctor 2.0.1 — Complete Implementation Audit

**Date:** 2026-09-23  
**Package:** `@praneeth_54/agentdoctor@2.0.1`  
**Method:** Code + tests + `npm run verify` (passed: typecheck, lint, format, 63 files / 424 tests, build).  
**Rule Zero:** Do **not** claim zero PARTIALs. Fake completion is forbidden.

---

## RELEASE STATUS

**RELEASE STATUS: NOT READY** for a “complete every capability” claim.

**RELEASE STATUS: READY** for shipping **incremental 2.0.1+ hardening** _if a human authorizes commit / push / publish separately._

This cut hardens 2.0.0 and adds real surfaces (change assurance, evidence, optional coverage-backed impact, architecture contract, controlled run, SQLite when `node:sqlite` exists, change-proof integrity, Python AST adapter). It does **not** close every historical limitation.

Authorization gates (this session): **no** commit, push, tag, or `npm publish`.

---

## Status vocabulary

| Label       | Meaning                                                                |
| ----------- | ---------------------------------------------------------------------- |
| IMPLEMENTED | Shipped, used for intended purpose, covered by tests where noted       |
| PARTIAL     | Present but incomplete, heuristic, evaluate-only, or honesty-labeled   |
| UNSUPPORTED | Explicitly out of scope or requires external platform/parsers/backends |

---

## Capability board (user brief + known-limitations)

### Core Safety & Brain

| Capability                                       | Status          | Evidence                                                                                                                                                             |
| ------------------------------------------------ | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Safety `scan` / `fix` / `verify` + GitHub Action | **IMPLEMENTED** | `src/core/scanner`, `src/core/fix`, `src/core/verify`, `action.yml`; tests: `tests/integration/scan.test.ts`, `tests/unit/verify/verify.test.ts`, `tests/unit/fix/*` |
| Project Brain + `brain-mcp`                      | **IMPLEMENTED** | `src/core/understanding`, `src/mcp/brain`; tests: `tests/unit/mcp/brain-mcp*.test.ts`                                                                                |
| Combined MCP intelligence tools                  | **PARTIAL**     | Tools exist (`src/mcp/intelligence`); maturity below Brain MCP; tests: `tests/unit/mcp/intelligence-mcp.test.ts`, `combined-mcp-stdio.test.ts`                       |

### Change assurance & evidence

| Capability                                                    | Status                                       | Evidence                                                                                          |
| ------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `change analyze` / `change verify`                            | **IMPLEMENTED** (assessment + evidence only) | `src/assurance/change.ts`, CLI `change *`; tests: `tests/unit/assurance/change-assurance.test.ts` |
| Evidence inspect / hash verify                                | **IMPLEMENTED**                              | `inspectEvidence` / `verifyEvidence`; `verified` = hash integrity only                            |
| Change Proof (integrity)                                      | **PARTIAL**                                  | `src/assurance/proof.ts` + `proof inspect                                                         | verify | export`; `correctnessStatus`always`ENGINEERING_CORRECTNESS_NOT_CLAIMED`; tests: `tests/unit/assurance/change-proof.test.ts` |
| Full “Change Proof product vision” (correctness / compliance) | **UNSUPPORTED** / deferred                   | Integrity ≠ engineering correctness; honesty labels enforce this                                  |

### Test impact & coverage

| Capability                                     | Status          | Evidence                                                                                                                                                                                    |
| ---------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Heuristic test impact                          | **IMPLEMENTED** | `src/platform/test-impact/analyze.ts` (`mode: heuristic` default)                                                                                                                           |
| Coverage loaders (LCOV / Istanbul / Cobertura) | **IMPLEMENTED** | `src/coverage/{load,lcov,istanbul,cobertura,types}.ts`; exported from `src/index.ts`; tests: `tests/unit/coverage/parsers.test.ts`                                                          |
| Coverage-backed test impact                    | **PARTIAL**     | Optional `--coverage` / `coveragePath`; line hits from coverage; test attribution often hybrid-heuristic when no test→source map; tests: `tests/unit/platform/test-impact-coverage.test.ts` |
| Coverage as ground truth in all assessments    | **UNSUPPORTED** | Without a coverage file, assessments stay heuristic; never claim verified tests                                                                                                             |

### Architecture

| Capability                                         | Status                             | Evidence                                                                                                |
| -------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------- |
| C4 views                                           | **PARTIAL**                        | Inferred from graph (`src/architecture/c4.ts`); not approved architecture truth                         |
| Architecture contract `check` / `init` / `explain` | **IMPLEMENTED** (local rules file) | `src/architecture/contract.ts`, CLI `architecture *`; tests: `tests/unit/architecture/contract.test.ts` |
| Approved enterprise architecture source of truth   | **UNSUPPORTED**                    | Contract is repo-local JSON/YAML, not org-wide governance                                               |

### Languages / AST / graph

| Capability                                                       | Status                                       | Evidence                                                                                                                                                   |
| ---------------------------------------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript / JavaScript AST adapters                             | **IMPLEMENTED**                              | `src/languages/typescript.ts`; graph builder uses TS AST when available                                                                                    |
| Python AST adapter                                               | **IMPLEMENTED** (requires `python3` on PATH) | `src/languages/python.ts` via CPython `ast`; tests: `tests/unit/languages/adapters.test.ts`                                                                |
| Language adapter registry / `detectLanguage` / `parseSourceFile` | **IMPLEMENTED**                              | `src/languages/index.ts`; exported from `src/index.ts`                                                                                                     |
| Java / Kotlin / Go / Rust / PHP / Dart AST                       | **UNSUPPORTED**                              | Adapters return `capabilities.parse: unsupported` — no bundled parsers; would need external tree-sitter / toolchain bridges                                |
| Call/import resolution                                           | **PARTIAL**                                  | Best-effort; dynamic requires / reflection under-detected                                                                                                  |
| Incremental graph index                                          | **PARTIAL**                                  | `src/intelligence/graph/incremental.ts`; tests: `tests/unit/intelligence/graph-incremental.test.ts` — not a full production indexer / multi-repo workspace |

### Policy & enforcement

| Capability                                    | Status                                     | Evidence                                                                                                                                                                                        |
| --------------------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Policy evaluate (firewall)                    | **IMPLEMENTED** (evaluate-only by default) | `src/platform/firewall/evaluate.ts`; `executionResult: not-executed`                                                                                                                            |
| Controlled `run` (AgentDoctor-owned boundary) | **PARTIAL**                                | `src/enforcement/runner.ts` can execute when `executeIfAllowed===true` **and** decision is allow; default paths remain evaluate-only; tests: `tests/unit/enforcement/controlled-runner.test.ts` |
| IDE / third-party agent interception          | **UNSUPPORTED**                            | Impossible without host platform APIs (Cursor/VS Code/agent process hooks) — not in this package                                                                                                |
| Autonomous unsafe shell                       | **UNSUPPORTED**                            | Blocked by design; runner path-safety + allowlist                                                                                                                                               |

### Auth, storage, SaaS

| Capability                   | Status          | Evidence                                                                                                                                              |
| ---------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Local-dev team auth (scrypt) | **PARTIAL**     | `src/team/auth.ts` — not enterprise SSO                                                                                                               |
| OIDC / enterprise IdP        | **UNSUPPORTED** | Not implemented                                                                                                                                       |
| Filesystem / memory storage  | **IMPLEMENTED** | `src/storage/provider.ts`                                                                                                                             |
| SQLite storage               | **PARTIAL**     | `src/storage/sqlite.ts` via `node:sqlite` (Node 22+); fails closed with error when unavailable; tests: `tests/unit/storage/storage-providers.test.ts` |
| Postgres storage             | **UNSUPPORTED** | Not implemented                                                                                                                                       |
| Vector search backend        | **UNSUPPORTED** | Feature flag / production path not shipped                                                                                                            |
| Hosted multi-tenant SaaS     | **UNSUPPORTED** | Not in this npm package                                                                                                                               |
| Dashboard                    | **PARTIAL**     | Loopback local API; `?user=` is not authentication                                                                                                    |

### Security & honesty surfaces

| Capability                          | Status          | Evidence                                                    |
| ----------------------------------- | --------------- | ----------------------------------------------------------- |
| Secret scan / redaction             | **PARTIAL**     | Pattern-based; does not prove absence of secrets            |
| Path / symlink hardening            | **PARTIAL**     | Deep tests exist; continued adversarial fuzzing recommended |
| Tamper-evident audits / HSM         | **UNSUPPORTED** | Best-effort hashes only; no HSM                             |
| Benchmark → production scale claims | **UNSUPPORTED** | Synthetic harness only — not a scalability claim            |
| Multi-repo workspaces               | **PARTIAL**     | API-level stubs / incomplete vs full multi-root product     |

### Packaging / distribution

| Capability                                                   | Status                    | Evidence                                                                   |
| ------------------------------------------------------------ | ------------------------- | -------------------------------------------------------------------------- |
| npm Option B tarball (`dist` + README + LICENSE + CHANGELOG) | **IMPLEMENTED**           | `package.json` files field                                                 |
| Full `docs/2.0.1/` inside npm tarball                        | **UNSUPPORTED** by design | Docs live on GitHub                                                        |
| Published `2.0.1` on npm / remote Action pin                 | **PENDING HUMAN**         | Local package is versioned `2.0.1`; publish not authorized in this session |

---

## Explicit PARTIALs (Rule Zero — required honesty)

At least these remain **PARTIAL** in 2.0.1:

1. Coverage-backed test impact (hybrid attribution without test maps)
2. Change Proof correctness (never claimed)
3. Combined MCP intelligence maturity
4. C4 / architecture impact inference
5. Policy default evaluate-only vs full enterprise enforcement
6. Controlled run (opt-in execute only)
7. SQLite (Node/`node:sqlite` dependent)
8. Local-dev auth (not SSO)
9. Dashboard auth posture
10. Incremental graph vs full rebuild product
11. Secret scan completeness
12. Call/import resolution completeness
13. Multi-repo workspace support

Any release note that says “zero gaps” or “complete every capability” is **false**.

---

## Key commands added / extended in this cut

```bash
agentdoctor change analyze [--since <ref>] [--coverage <path>] [--json]
agentdoctor change verify  [--since <ref>] [--change-id <id>] [--coverage <path>] [--json]
agentdoctor change explain|diff|status ...
agentdoctor evidence inspect <id>
agentdoctor evidence verify <id>
agentdoctor proof inspect|verify|export <id>
agentdoctor architecture init|analyze|check|explain
agentdoctor impact|test-impact --coverage <path>
agentdoctor run ...          # controlled runner (execute only when explicitly allowed)
agentdoctor graph build|update|rebuild|status
```

Library exports (selected): `analyzeChange`, coverage parsers, `parseSourceFile` / `languageAdapters` / `detectLanguage`, `buildProofFromEvidence`, `tryCreateSqliteStorage`, `runControlledCommand`.

---

## `npm run verify` (this audit)

**Result: PASSED**

| Step         | Result                             |
| ------------ | ---------------------------------- |
| typecheck    | pass                               |
| lint         | pass                               |
| format:check | pass                               |
| test         | **63** files, **424** tests passed |
| build        | pass                               |

---

## What this audit authorizes

| Action                                | Status             |
| ------------------------------------- | ------------------ |
| Document honesty / local verify green | Done               |
| `git commit` / tag                    | **NOT AUTHORIZED** |
| `git push`                            | **NOT AUTHORIZED** |
| `npm publish`                         | **NOT AUTHORIZED** |

See also: [limitations.md](limitations.md) · [PRODUCT_CONTRACT.md](PRODUCT_CONTRACT.md) · [IMPLEMENTATION_GAP_AUDIT.md](IMPLEMENTATION_GAP_AUDIT.md).
