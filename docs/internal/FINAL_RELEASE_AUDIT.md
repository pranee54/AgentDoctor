# AgentDoctor 3.0 Final Release Audit

**Date:** 2026-09-26  
**Auditor method:** CODE > `npm run verify` > `npm pack` > clean tarball install > CLI/MCP/dashboard smoke > security/E2E/eval suites > docs/version/git inspection  
**Prior gate:** `docs/FORMAL_3_0_AUDIT.md` → **PASS**  
**Release actions:** **NOT PERFORMED** (no npm publish, git push, tag, GitHub release, version bump, or production deploy)

---

## Release candidate identity

| Field                                  | Value                                   |
| -------------------------------------- | --------------------------------------- |
| Product scope name                     | AgentDoctor **3.0 local core**          |
| npm package name                       | `@praneeth_54/agentdoctor`              |
| Package version (metadata)             | **2.1.0** (unchanged)                   |
| `PACKAGE_VERSION` (`src/constants.ts`) | **2.1.0**                               |
| Git Action default (`action.yml`)      | **2.1.0**                               |
| Latest git tag                         | `v2.1.0` (no `v3.0` tag)                |
| Formal audit                           | PASS (0 core FAIL; 0 dishonest PARTIAL) |
| This audit                             | **RELEASE AUDIT**                       |

**Interpretation:** “3.0” names the **local capability scope**. It is **not** a published npm/git version. Public identity remains **2.1.0** until an explicit future release decision.

---

## Package metadata

| Check                                         | Result                                                                                                                     |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| name                                          | PASS — `@praneeth_54/agentdoctor`                                                                                          |
| version                                       | PASS — `2.1.0` (not bumped in this audit)                                                                                  |
| description                                   | PASS                                                                                                                       |
| `bin.agentdoctor`                             | PASS — `./dist/cli/index.js` (shebang `#!/usr/bin/env node`)                                                               |
| `exports` / `main` / `types`                  | PASS — `./dist/index.js` + `./dist/index.d.ts`                                                                             |
| `files`                                       | PASS — `dist`, `README.md`, `LICENSE`, `CHANGELOG.md` only                                                                 |
| `engines.node`                                | PASS — `>=20`                                                                                                              |
| scripts (`build`, `verify`, `prepublishOnly`) | PASS                                                                                                                       |
| dependencies                                  | PASS — runtime deps only (`@modelcontextprotocol/sdk`, `commander`, `jose`, `pg`, `picocolors`, `typescript`, `@types/pg`) |
| optional/peer deps                            | NOT_APPLICABLE — none declared                                                                                             |
| package manager                               | PASS — npm; clean install resolved 115 transitive packages, 0 vulnerabilities reported                                     |
| no source-only runtime paths                  | PASS — packaged artifact is compiled `dist/`                                                                               |

---

## Build verification

Exact results from this audit run:

| Command                | Result                                           |
| ---------------------- | ------------------------------------------------ |
| `npm run typecheck`    | PASS (via `npm run verify`)                      |
| `npm run lint`         | PASS                                             |
| `npm run format:check` | PASS                                             |
| `npm test`             | **626 / 626** PASS · 128 files · 0 fail · 0 skip |
| `npm run build`        | PASS                                             |
| `npm run verify`       | **PASS** (`VERIFY_EXIT:0`)                       |

---

## Clean installation verification

| Step                            | Result                                                                                                          |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `npm pack --dry-run`            | PASS — 712 files · package size **449.8 kB** · unpacked **1.9 MB**                                              |
| `npm pack` (local tarball only) | PASS — `praneeth_54-agentdoctor-2.1.0.tgz` generated for audit, then **removed** from repo root (not committed) |
| Install into empty temp dir     | PASS — `npm install <tarball>`                                                                                  |
| Binary link                     | PASS — `node_modules/.bin/agentdoctor` → packaged `dist/cli/index.js`                                           |
| Works without source repo       | PASS                                                                                                            |

---

## CLI verification

From **clean install** (not source tree):

| Check                                                                                       | Result                                                                       |
| ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `agentdoctor --help`                                                                        | PASS                                                                         |
| `agentdoctor --version`                                                                     | PASS — prints `2.1.0`                                                        |
| `start` / `scan` / `verify` / `chat` / `ask` / `agent` / `learn` / `mcp` / `dashboard` help | PASS                                                                         |
| Valid project `start`                                                                       | PASS — DNA written; exit 0                                                   |
| Empty directory `start`                                                                     | PASS — candidates none; no home/system scan                                  |
| Nested project `start`                                                                      | PASS                                                                         |
| Multi-project parent `start`                                                                | PASS — lists candidates; requires `--select`                                 |
| Invalid path `start`                                                                        | PASS — safe “none found” (no crash)                                          |
| Home directory `start`                                                                      | PASS — **Blocked:** refuses home/Desktop/Downloads/Documents                 |
| Large dir (~200 TS files) `start`                                                           | PASS                                                                         |
| `scan --json`                                                                               | PASS — version field `2.1.0`                                                 |
| `ask` without LLM                                                                           | PASS — deterministic answer; no silent fake LLM                              |
| `AGENTDOCTOR_FORENSIC_MODE=1 agent --list-tools`                                            | PASS — tools listed; write tools remain gated by approval/forensic elsewhere |
| Startup responsiveness                                                                      | PASS — `--version` ~0.33s real                                               |

Normal user errors: useful messages; no stack traces observed in smokes above.

---

## MCP verification

From **clean install** STDIO MCP (`agentdoctor mcp --root <fixture>`):

| Check                                                                                                           | Result                                                                                                   |
| --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Initialize + `tools/list`                                                                                       | PASS — **38** tools                                                                                      |
| Brain tools (`brain_overview`, …)                                                                               | PASS                                                                                                     |
| Intelligence (`project_dna`, `codebase_search`, `what_if`, …)                                                   | PASS                                                                                                     |
| Agent (`project_ask`, `project_context`, `file_read`, `agent_plan`, …)                                          | PASS                                                                                                     |
| `change_analyze` / `change_verify`                                                                              | PASS                                                                                                     |
| `evidence_inspect` without `changeId`                                                                           | PASS — safe `invalid_argument` (not crash)                                                               |
| Bare `approved:true` on `file_create` / `file_edit`                                                             | PASS — **rejected** (`approval_required`; trusted token required)                                        |
| Forged `approvalToken`                                                                                          | PASS — rejected (`Approval token not found for this project.`)                                           |
| Path traversal `file_read` (`../`, absolute)                                                                    | PASS — `path_escape`                                                                                     |
| Full approval negative matrix (expired/consumed/wrong planHash/action/resources/wildcard/wrong project/symlink) | PASS — covered by `tests/unit/product/approval-session-security.test.ts` (10 tests) in this audit re-run |

---

## Dashboard/API verification

From **clean install** dashboard (loopback):

| Check                                                                                                                                                                                                                                                                                                        | Result                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Dashboard starts                                                                                                                                                                                                                                                                                             | PASS — `http://127.0.0.1:<port>/` HTML 200                                                              |
| `/api/status`, `/api/dna`, `/api/brain`, `/api/deps`, `/api/search`, `/api/features`, `/api/requirements`, `/api/security`, `/api/forensic`, `/api/twin`, `/api/decisions`, `/api/incident`, `/api/infra`, `/api/evolution`, `/api/memory`, `/api/health`, `/api/api-doctor`, `/api/database`, `/api/events` | PASS — 200 JSON from live analyzers                                                                     |
| `/api/scan`, `/api/platform`, `/api/map`, `/api/v2/graph`, `/api/v2/health`, `/api/v2/c4`, `/api/meta`, `/api/health-code`                                                                                                                                                                                   | PASS — 200                                                                                              |
| `/api/what-if?target=…`                                                                                                                                                                                                                                                                                      | PASS — 200 impact report                                                                                |
| `POST /api/chat` `{question}`                                                                                                                                                                                                                                                                                | PASS — 200 deterministic ask-only response                                                              |
| Missing what-if target                                                                                                                                                                                                                                                                                       | PASS — 400 understandable error                                                                         |
| Cross-project `?root=` override                                                                                                                                                                                                                                                                              | PASS — ignored; response stays bound to dashboard root                                                  |
| Org/settings dedicated REST                                                                                                                                                                                                                                                                                  | NOT_APPLICABLE — org is local CLI/catalog scope; not required as separate dashboard REST for local core |
| Fake/static cards only                                                                                                                                                                                                                                                                                       | PASS — SPA fetches product APIs (embedded hash-route UI)                                                |

---

## Security verification

| Check                                  | Result                                                                                      |
| -------------------------------------- | ------------------------------------------------------------------------------------------- |
| Approval session security suite        | PASS — 10/10                                                                                |
| Path central + traversal deep          | PASS                                                                                        |
| Symlink escape + secret redaction deep | PASS                                                                                        |
| `tests/unit/security.test.ts`          | PASS                                                                                        |
| Forensic E2E                           | PASS                                                                                        |
| Packaged tarball contents              | PASS — no `.env`, credentials, fixtures, tests, or docs trees                               |
| Dist path/secret grep in tarball       | PASS — no `/Users/…` install paths; private-key patterns only in **redaction/scanner** code |
| CLI/MCP/API redaction surfaces         | PASS — covered by existing unit + MCP redaction tests under verify                          |
| Repository content untrusted           | PASS — path safety + approval binding enforced                                              |

---

## E2E verification

| File                                     | Result   |
| ---------------------------------------- | -------- |
| `tests/e2e/password-reset-agent.test.ts` | PASS     |
| `tests/e2e/student-learn.test.ts`        | PASS     |
| `tests/e2e/what-if-service.test.ts`      | PASS     |
| `tests/e2e/incident-flow.test.ts`        | PASS     |
| `tests/e2e/self-check.test.ts`           | PASS     |
| `tests/e2e/runtime-turn-tools.test.ts`   | PASS (2) |
| `tests/e2e/forensic-readonly.test.ts`    | PASS     |

**E2E totals (re-run subset + included in full verify):** 7 files · **8 tests** · passed **8** · failed **0** · skipped **0**  
Full suite still **626 / 626**.

---

## Evaluation verification

Fixtures under `fixtures/eval/` (**10**):

| Fixture                               | Result                                                    |
| ------------------------------------- | --------------------------------------------------------- |
| `minimal-ts`                          | PASS (via `tests/unit/product/eval-lab.test.ts` + verify) |
| JS/Node (covered by minimal/monorepo) | PASS                                                      |
| `python-flask`                        | PASS                                                      |
| `php-laravel-lite`                    | PASS                                                      |
| `monorepo-lite`                       | PASS                                                      |
| `rest-api`                            | PASS                                                      |
| `prisma-db`                           | PASS                                                      |
| `queue-bull`                          | PASS                                                      |
| `insecure-sample`                     | PASS                                                      |
| `prompt-injection`                    | PASS                                                      |
| `infra-compose`                       | PASS (additional fixture present; lab suite PASS)         |

Eval lab unit test: PASS in this audit re-run.

---

## Package contents

| Item                                                                   | Result                |
| ---------------------------------------------------------------------- | --------------------- |
| README / LICENSE / CHANGELOG                                           | PASS — included       |
| `dist/` CLI + MCP + dashboard + product                                | PASS                  |
| Excluded: `.env`, secrets, tests, fixtures, docs audits, source `src/` | PASS                  |
| Size sanity                                                            | PASS — ~450 kB packed |

---

## Documentation verification

| Check                                                                                  | Result                                                                                       |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Formal audit / completion / limitations / 3.0 matrix                                   | PASS — aligned with implementation                                                           |
| `runTurn` executes tools (with gates)                                                  | PASS — documented in `FINAL_LIMITATIONS.md`                                                  |
| MCP approval (token + planHash; bare `approved:true` rejected)                         | PASS                                                                                         |
| Forensic mode                                                                          | PASS                                                                                         |
| Language / lockfile / chat provider / Security & Privacy / Twin / Ops / Org boundaries | PASS — COMPLETE AT DEFINED LOCAL SCOPE + EXTERNAL                                            |
| Stale early-build PARTIAL status                                                       | FIXED — `FINAL_PRODUCT_STATUS.md` reconciled; `FINAL_CAPABILITY_MATRIX.md` marked superseded |
| Individual feature docs still titled “PARTIAL (2.1.0 local build)”                     | PASS with note — historical maturity banners; defer to formal 3.0 matrix for release status  |

No documentation claims that 3.0 is already **published**.

---

## Version/release consistency

| Reference class        | Handling                                                                                                  |
| ---------------------- | --------------------------------------------------------------------------------------------------------- |
| Current package        | **2.1.0** everywhere that must match runtime (`package.json`, constants, Action default, CLI `--version`) |
| Historical             | `2.0.1` / older CHANGELOG / `docs/2.0.1/` — historical PASS                                               |
| Roadmap / scope labels | `2.2`–`3.0` as **capability scope** / plan language — not published versions                              |
| “3.0” docs             | Mean local-core scope — **not** npm 3.0.0                                                                 |

**No version bump performed.**

---

## External boundaries

| Dependency                                      | Status   |
| ----------------------------------------------- | -------- |
| Live Kubernetes                                 | EXTERNAL |
| Live APM                                        | EXTERNAL |
| Enterprise IdP                                  | EXTERNAL |
| Neural embeddings                               | EXTERNAL |
| Commercial SAST/SCA                             | EXTERNAL |
| Full compiler-grade semantics where unavailable | EXTERNAL |
| Optional LLM providers                          | EXTERNAL |

Local adapters/fixtures for promised local behavior: PASS.

---

## Known limitations

See `docs/FINAL_LIMITATIONS.md`. Summarized:

- Capability-level partials (e.g. non-TS call/type binding) are **disclosed**, not unfinished stubs.
- Security/Privacy are technical local analyzers — not legal/commercial products.
- Package remains **2.1.0**; public 3.0 cut is a future release decision.

---

## Git state audit

| Check                                | Result                                                                                   |
| ------------------------------------ | ---------------------------------------------------------------------------------------- |
| `git log -n 10`                      | Latest published-line commit still on `v2.1.0` history; no accidental 3.0 release commit |
| Tags                                 | No new 3.0 / release tag created in this audit                                           |
| Working tree                         | **Dirty** — large uncommitted 3.0 local-core + audit docs (expected; release lock held)  |
| Accidental secrets / tarball in tree | PASS — audit tarball removed from workspace                                              |
| Push / tag / publish                 | **NOT PERFORMED**                                                                        |

**Process note (not a product defect):** before any future public release action, the audited working tree must be **committed** under an explicit release decision. That step is outside this audit.

---

## Regression audit

2.0.1 / 2.1 foundation surfaces exercised under full `npm run verify` (scan/fix/verify/Brain/graph/architecture/policy/runner/workspace/path safety/redaction/evidence/proof/sessions/audit/MCP/API/CLI): **PASS** — 626/626.

---

## Performance / package sanity

| Check             | Result                                    |
| ----------------- | ----------------------------------------- |
| Package size      | PASS (~450 kB)                            |
| CLI `--version`   | PASS (~0.33s)                             |
| MCP startup       | PASS (loads/compiles brain, lists tools)  |
| Dashboard startup | PASS (loopback ready in ~2s smoke window) |
| Fixture analysis  | PASS within existing test budgets         |

No premature optimization performed.

---

## Release blockers

| ID  | Blocker | Status                                    |
| --- | ------- | ----------------------------------------- |
| —   | —       | **NONE** for local-core release readiness |

Process prerequisites for _performing_ a public release (commit, version policy, human publish) remain under **release lock** and are intentionally out of scope.

---

## Final verdict

### Verification

- typecheck: PASS
- lint: PASS
- format: PASS
- unit/integration: **626/626** PASS
- build: PASS
- verify: PASS

### Package

- npm pack: PASS
- package contents: PASS
- clean install: PASS
- CLI smoke: PASS
- MCP smoke: PASS

### Security

- approval security: PASS
- path security: PASS
- symlink security: PASS
- forensic mode: PASS
- prompt injection evaluation: PASS
- secret redaction: PASS

### E2E

- total: **8** (7 files)
- passed: **8**
- failed: **0**
- skipped: **0**

### Evaluation

- fixtures: **10** (+ infra-compose present)
- passed: **all exercised via eval-lab + verify**
- failed: **0**

### External

- live K8s: EXTERNAL
- APM: EXTERNAL
- IdP: EXTERNAL
- embeddings: EXTERNAL
- commercial SAST/SCA: EXTERNAL
- optional LLM: EXTERNAL

### Release blockers

**NONE**

---

```
RELEASE AUDIT: PASS

AgentDoctor 3.0 local core is release-ready.

No core release blockers found.

No package/release blockers found.

External dependencies are explicitly bounded.

Release lock remains held.
```

**STOP.** Do not publish, push, tag, bump version, create a GitHub release, or deploy.
