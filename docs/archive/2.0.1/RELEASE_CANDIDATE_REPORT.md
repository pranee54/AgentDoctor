# AgentDoctor 2.0.1 — Release Candidate Hardening Report

**Date:** 2026-09-23  
**Package:** `@praneeth_54/agentdoctor@2.0.1`  
**Scope:** FINAL RELEASE CANDIDATE HARDENING validation only  
**Rule:** No `git commit` / tag / push / `npm publish` in this session.

---

## Final status

# RELEASE CANDIDATE — READY FOR HUMAN RELEASE AUTHORIZATION

Local verify, pack integrity, clean-install CLI/MCP smoke, and security subset are green. External / experimental limitations from [FINAL_COMPLETION_AUDIT.md](FINAL_COMPLETION_AUDIT.md) remain documented and unchanged. Publish and git publish actions require **explicit human authorization**.

---

## A) Stale CURRENT version references (fixed)

| File                                | Change                                                                                                                |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `docs/2.0/README.md`                | Package line → **2.0.1** (local/RC; npm may still show 2.0.0); note historical 2.0.0 report; pointer to `docs/2.0.1/` |
| `docs/2.0/overview/architecture.md` | Package version → **2.0.1** (contracts string `2.0.0-contracts` kept)                                                 |
| `docs/2.0/guides/deployment.md`     | Current release → **2.0.1** with honest npm caveat                                                                    |
| `docs/2.0/guides/migration.md`      | Package version → **2.0.1** (contracts string kept)                                                                   |
| `docs/guides/migration-v2.md`       | Package version → **2.0.1**                                                                                           |
| `docs/features/v2-features.md`      | Package version → **2.0.1**                                                                                           |
| `docs/README.md`                    | Kept historical final-release-report as 2.0.0; **added** pointer to `docs/2.0.1/`                                     |
| `README.md`                         | Install section phrased honestly: local/RC **2.0.1**; npm may still show **2.0.0** until published                    |

**Not edited (per instruction):** `docs/archive/*`, `docs/2.0/release/final-release-report.md`, CHANGELOG historical 2.0.0 section.

---

## B) `npm run verify`

**Result: PASSED**

| Step         | Result                                    |
| ------------ | ----------------------------------------- |
| typecheck    | pass                                      |
| lint         | pass                                      |
| format:check | pass (after Prettier on `docs/README.md`) |
| build        | pass                                      |
| test         | **70** files, **451** tests passed        |

First verify attempt failed only on Prettier for `docs/README.md`; fixed and re-ran → full green.

---

## C) Package (`npm pack`)

| Field         | Value                                                                         |
| ------------- | ----------------------------------------------------------------------------- |
| filename      | `praneeth_54-agentdoctor-2.0.1.tgz`                                           |
| package size  | **328.9 kB** (328935 bytes on disk)                                           |
| unpacked size | **1.4 MB**                                                                    |
| total files   | **550**                                                                       |
| shasum        | `c06102c70fc1bb14c3ca10222a77d84ae4e87900`                                    |
| contents      | Option B: `dist/` + `README.md` + `LICENSE` + `CHANGELOG.md` + `package.json` |

### Forbidden-path inspection (`tar -tzf`)

| Pattern             | Finding                                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------------------------- |
| `.git`              | **absent**                                                                                                    |
| `node_modules`      | **absent**                                                                                                    |
| `.private`          | **absent**                                                                                                    |
| `.env`              | **absent**                                                                                                    |
| `.agentdoctor` data | **absent**                                                                                                    |
| `coverage` string   | Matches only product module `dist/coverage/*` (LCOV/Istanbul parsers) — **not** a test-coverage artifact tree |

**Post-test:** tarball **removed** from repo root (no leftover `*.tgz` in git status).

---

## D) Clean install smoke (`/tmp/agentdoctor-2.0.1-release-test`)

Install: `npm install …/praneeth_54-agentdoctor-2.0.1.tgz` → OK (0 vulnerabilities).

| Check                   | Result          | Exit   |
| ----------------------- | --------------- | ------ |
| `agentdoctor --version` | `2.0.1`         | 0      |
| `--help`                | Usage banner OK | 0      |
| `scan                   | graph           | change | proof | architecture | impact | policy | run | workspace | mcp --help` | All present | 0 each |

### Fixture smoke

| Command                                 | Result                                                                                                                                                 | Exit  |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----- |
| `scan "$FIX" --json`                    | JSON includes `"version":"2.0.1"`                                                                                                                      | **0** |
| `graph "$FIX" --json`                   | Snapshot JSON, agentDoctorVersion 2.0.1                                                                                                                | **0** |
| `change analyze "$FIX"`                 | Assessment produced (`chg_*`)                                                                                                                          | **0** |
| `change verify "$FIX"`                  | Evidence produced under `.agentdoctor/evidence/`                                                                                                       | **0** |
| `evidence inspect <id>`                 | Lists evidence files                                                                                                                                   | **0** |
| `proof build` / `proof inspect`         | Integrity `HASH_INTEGRITY_VERIFIED`; `correctnessStatus: ENGINEERING_CORRECTNESS_NOT_CLAIMED`; engineering checks FAILED on minimal fixture (expected) | **0** |
| `architecture init` / `check`           | Contract written; 0 violations                                                                                                                         | **0** |
| `impact --json`                         | Heuristic mode, git available                                                                                                                          | **0** |
| `policy check --command "npm test"`     | `decision=allow`, evaluate-only                                                                                                                        | **0** |
| `run explain --command "npm --version"` | allow / wouldExecute                                                                                                                                   | **0** |
| `workspace create`                      | **N/A** — command is `workspace init` (not `create`)                                                                                                   | —     |
| `workspace init --name rc-test`         | `ws_*` created                                                                                                                                         | **0** |
| `workspace list`                        | Lists `rc-test`                                                                                                                                        | **0** |

**Note (non-blocking):** `change verify --json` / global `--json change verify` still emit human terminal text in this cut (evidence files on disk are authoritative). Not treated as RC blocker.

---

## E) MCP smoke (clean install)

| Check                                                                                          | Result                                                                                                       |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `mcp --help` / `brain-mcp --help`                                                              | OK (exit 0)                                                                                                  |
| STDIO `initialize` + `tools/list` via `@modelcontextprotocol/sdk` against installed `dist/cli` | **26 tools**                                                                                                 |
| Required tools                                                                                 | `change_analyze`, `architecture_check`, `proof_inspect`, `evidence_inspect`, `graph_query` — **all PRESENT** |
| Hostile `dependency_lookup` `target=../../etc/passwd`                                          | `ok:false`, `code:path_escape`                                                                               |
| Hostile `target=/etc/passwd`                                                                   | `ok:false`, `code:path_escape`                                                                               |

Full tool list:  
`architecture_check`, `architecture_info`, `brain_claims`, `brain_delta`, `brain_evidence`, `brain_explain`, `brain_overview`, `brain_ownership`, `brain_query`, `brain_risk`, `brain_snapshot`, `brain_trace`, `call_graph_lookup`, `change_analyze`, `code_health`, `codebase_search`, `dependency_lookup`, `evidence_inspect`, `graph_query`, `knowledge_retrieve`, `policy_evaluate`, `proof_inspect`, `refactor_impact`, `repo_overview`, `symbol_lookup`, `test_impact`.

---

## F) Security

### Tarball name scan

```text
tar -tzf … | rg -i 'env|secret|credential|\.pem|\.key|private'
```

Matches **only** product modules:

- `dist/core/rules/security/env-file-exposure.*`
- `dist/core/rules/security/private-key-file.*`
- `dist/core/secrets/scan.*`

No `.pem` / `.key` / credential files / `.env` payloads in the tarball.

### `npm test -- tests/unit/security`

**Result: PASSED** — **5** files, **15** tests.

---

## G) Git (read-only)

```text
git log -5 --oneline
dd102b6 fix: resolve CodeQL high alerts on crypto, ReDoS, temp files, and TOCTOU
e945e00 fix: restore CI Typecheck Lint Test Build
1ae360e docs: professional AgentDoctor 2.0 product presentation
e509bfe docs: mark AgentDoctor 2.0.0 npm publish verified
0b9670a docs: format final-release-report for npm prepublish
```

`git diff --check`: **clean** (no whitespace errors reported).

Working tree: large uncommitted 2.0.1 cut (modified + untracked `docs/2.0.1/`, assurance/architecture/languages/workspace sources, tests). **No commit/tag/push performed.** No leftover `*.tgz` artifact.

`git diff --stat` (tracked): 37 files changed, ~2526 insertions / ~321 deletions (plus untracked trees above).

---

## H) External limitations (preserved from FINAL_COMPLETION_AUDIT)

These remain intentionally incomplete / out of boundary — **do not claim zero-gap**:

1. Browser OAuth / full IdP login UX — **EXPERIMENTAL**
2. Postgres without live `AGENTDOCTOR_POSTGRES_URL` / CI service — **EXTERNAL** gate
3. Java / Kotlin / Rust / Dart (and Go extractor) AST — **EXTERNAL**
4. IDE / agent process interception — **EXTERNAL**
5. Engineering correctness / compliance certificates from hash integrity — **never claimed**
6. Hosted SaaS, HSM, vector production backend — **EXTERNAL / out of boundary**

See also: [limitations.md](limitations.md) · [FINAL_COMPLETION_AUDIT.md](FINAL_COMPLETION_AUDIT.md).

---

## Authorization checklist

| Action                                | Status                                                                           |
| ------------------------------------- | -------------------------------------------------------------------------------- |
| RC hardening validation + this report | **Done**                                                                         |
| `git commit` / tag / push             | **NOT AUTHORIZED**                                                               |
| `npm publish`                         | **NOT AUTHORIZED** (registry may still show 2.0.0 until a human publishes 2.0.1) |

---

## Verdict

**RELEASE CANDIDATE — READY FOR HUMAN RELEASE AUTHORIZATION**

Human next steps (when authorized): commit the 2.0.1 cut, tag, push, then `npm publish` for `@praneeth_54/agentdoctor@2.0.1`.
