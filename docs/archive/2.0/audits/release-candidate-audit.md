# AgentDoctor 2.0 — Release Candidate Audit

**Audit date:** 2026-09-21
**Package under audit:** `@praneeth_54/agentdoctor@1.1.1`
**Constraint:** No version bump, commit, tag, push, or publish
**Evidence basis:** `npm run verify`, `npm pack` (clean install outside repo), CLI/API/MCP smoke, source/docs review

## Executive recommendation

**Ready to begin the formal 2.0.0 release process — not ready to publish npm `2.0.0` today.**

Rationale: Engineering quality gates pass (verify + packed clean install). Safety/Brain compatibility holds. Deep validation and security hardening landed. However, **product packaging and documentation are still aligned to “1.1.1 + Unreleased 2.0”**, not a coherent public `2.0.0` cut. Those are **must-fix-before-2.0.0** items, not silent optional polish.

See `AGENTDOCTOR_2.0_RELEASE_BLOCKERS.md` for the actionable list.

---

## Commands executed (actual)

| Command                                                                | Result                                                                                                |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `node -e "…version…"`                                                  | `1.1.1`                                                                                               |
| `npm run verify`                                                       | **PASS** — 53 files / 394 tests; typecheck/lint/format/build OK                                       |
| `npm pack --dry-run`                                                   | Lists 496 files; package size ~273 kB; contents `dist` + README + LICENSE + CHANGELOG                 |
| `npm pack --pack-destination <tmp>` + `npm install <tgz>` outside repo | **PASS** — CLI runs; scan/init/graph/doctor/mcp help OK                                               |
| CLI smoke (installed bin)                                              | `scan`, `init`, `graph`, `doctor --json`, `mcp --help`, `brain-mcp --help`                            |
| API smoke                                                              | Installed `startDashboardServer` → `GET /api/v2/graph` **200**                                        |
| MCP smoke                                                              | Installed registries: **10** Brain + **11** intelligence tool names                                   |
| Package export smoke                                                   | From install dir: `PACKAGE_VERSION=1.1.1`, `scan` export present, `CONTRACTS_VERSION=2.0.0-contracts` |

---

## Review findings by topic

### 1. Public CLI / API / MCP backward compatibility

| Finding                                                                                                      | Class                  |
| ------------------------------------------------------------------------------------------------------------ | ---------------------- |
| Safety commands `scan` / `fix` / `verify` present on packed CLI; scan JSON still reports `"version":"1.1.1"` | Evidence of continuity |
| Brain MCP tool names unchanged (`brain_*`); `brain-mcp` still required `--root`                              | Preserved              |
| Additive `agentdoctor mcp` combines Brain + intelligence tools without renaming Brain tools                  | Compatible extension   |
| Package `exports` still only `"."` → `dist/index.js` / `.d.ts`; new helpers exported additively              | Compatible             |
| No observed removal of EXIT_CODES `{0,1,2,3}`                                                                | Compatible             |

**Class:** no release blocker for compatibility of 1.x Safety/Brain surfaces.

### 2. Existing Safety and Brain functionality

| Finding                                                            | Class |
| ------------------------------------------------------------------ | ----- |
| Packed install `agentdoctor scan --json` exit 0 on minimal TS repo | Pass  |
| `brain-mcp --help` and Brain tool registry intact                  | Pass  |
| Prior unit/integration suites included in verify                   | Pass  |

### 3. New 2.0 feature discoverability and documentation

| Finding                                                                                                                   | Class                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Packed package **does not** include `AGENTDOCTOR_2.0_*.md` or `docs/` — only README/CHANGELOG/LICENSE/dist                | **Must fix before 2.0.0** (discoverability / limitations disclosure for npm consumers) |
| README still frames platform work as “toward a future **2.0.0**” and emphasizes `brain-mcp` over `init` / `graph` / `mcp` | **Must fix before 2.0.0**                                                              |
| CLI `--help` description still “Audit AI coding agent configuration…”                                                     | **Recommended improvement**                                                            |
| `package.json` description same Safety-only string                                                                        | **Must fix before 2.0.0** (marketplace messaging)                                      |
| Root CHANGELOG `[Unreleased]` documents 2.0 work while version stays 1.1.1                                                | Expected now; **Must fix before 2.0.0** (promote to `[2.0.0]` section at cut)          |

### 4. Error handling and exit codes

| Finding                                                                         | Class                       |
| ------------------------------------------------------------------------------- | --------------------------- |
| `EXIT_CODES`: SUCCESS=0, ISSUES_OR_THRESHOLD=1, USAGE_ERROR=2, INTERNAL_ERROR=3 | Documented in types         |
| Smoke: `verify` without baseline → exit **2**; bad `explain` → exit **2**       | Consistent with USAGE_ERROR |
| No evidence of silent success on usage errors in these smokes                   | Pass                        |

### 5. Secret handling and path-safety boundaries

| Finding                                                                      | Class                                    |
| ---------------------------------------------------------------------------- | ---------------------------------------- |
| Deep validation added path-safety + dashboard hostile URL checks + redaction | Pass (see security test report)          |
| Heuristic redaction remains incomplete by design                             | **Post-release work** / known limitation |
| Evaluate-only firewall + runner honesty tests pass                           | Pass                                     |

### 6. Configuration and environment-variable behavior

| Finding                                                                                  | Class                       |
| ---------------------------------------------------------------------------------------- | --------------------------- |
| Few product env vars; GitHub Action uses `GITHUB_STEP_SUMMARY`                           | Observed                    |
| Feature flags exposed via `doctor --json` (`typescriptAst`, `sqliteStorage=false`, etc.) | Pass                        |
| No comprehensive env-var reference in packed README                                      | **Recommended improvement** |

### 7–8. Clean installation and execution outside development repo

| Finding                                                                                                                        | Class                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| Fresh `npm install` of packed tgz outside AgentDoctor tree succeeded (0 vulnerabilities reported by npm audit in that install) | Pass                                                                   |
| Bin `agentdoctor` shebang `#!/usr/bin/env node`; `--version` → `1.1.1`                                                         | Pass                                                                   |
| Runtime dependency on `typescript` pulls compiler into consumer installs                                                       | **Recommended improvement** (document size/impact; acceptable for AST) |

### 9. Build artifact completeness

| Finding                                                                                   | Class    |
| ----------------------------------------------------------------------------------------- | -------- |
| `dist/` includes CLI, Safety, Brain MCP, intelligence MCP, dashboard, platform, contracts | Pass     |
| `bin` points at `./dist/cli/index.js` present in pack                                     | Pass     |
| Source maps / docs / fixtures / benchmarks excluded by design                             | Expected |

### 10. License and dependency review

| Finding                                                                            | Class         |
| ---------------------------------------------------------------------------------- | ------------- |
| LICENSE MIT present in pack                                                        | Pass          |
| Runtime deps: `@modelcontextprotocol/sdk`, `commander`, `picocolors`, `typescript` | Reviewed list |
| Overrides for transitive `js-yaml`, `fast-uri`, `hono`, `qs` present               | Hygiene note  |
| No copyleft runtime dependency observed in direct deps                             | Pass          |

### 11. Documentation consistency with actual behavior

| Finding                                                                                                 | Class                        |
| ------------------------------------------------------------------------------------------------------- | ---------------------------- |
| In-repo `AGENTDOCTOR_2.0_*` reports largely match shipped CLI (`init`, `graph`, `mcp`, enforce honesty) | Mostly consistent **in git** |
| Public README / npm description lag behind working-tree capabilities                                    | **Must fix before 2.0.0**    |
| Readiness matrix correctly refuses blanket 5/5                                                          | Consistent / honest          |

### 12. Known limitations and unsupported-feature disclosures

| Finding                                                                                 | Class                                                           |
| --------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `AGENTDOCTOR_2.0_KNOWN_LIMITATIONS.md` exists in repo                                   | Pass (git)                                                      |
| Same file **absent from npm pack**                                                      | **Must fix before 2.0.0** or equivalent README section required |
| Unsupported: SSO, vector search, multi-lang AST, IDE interception — disclosed in matrix | Pass                                                            |

### 13. Package files included in npm pack

Actual `files`: `dist`, `README.md`, `LICENSE`, `CHANGELOG.md`
Confirmed absent: all `AGENTDOCTOR_2.0_*.md`, `docs/`, `benchmarks/`, tests, fixtures.

### 14. Reproducibility of build and tests

| Finding                                                         | Class                |
| --------------------------------------------------------------- | -------------------- |
| `npm run verify` reproducible green on this host (53/394)       | Pass                 |
| `prepublishOnly` runs `verify`                                  | Good release hygiene |
| Perf numbers are single-run synthetic measurements, not CI gate | Known limitation     |

---

## Smoke evidence highlights

- Packed CLI `init` wrote PROPOSED artifacts
- Packed CLI `graph` used `builder: "typescript-ast"`
- Packed `doctor --json` reported `contractsVersion: "2.0.0-contracts"` with honest feature flags
- Dashboard `/api/v2/graph` returned 200 from installed package code

---

## Classification summary

| Class                                            | Count (approx.)                                                         | Theme                                       |
| ------------------------------------------------ | ----------------------------------------------------------------------- | ------------------------------------------- |
| Release blocker (for publishing 2.0.0 **today**) | Several packaging/docs                                                  | Messaging + docs distribution + version cut |
| Must fix before 2.0.0                            | See blockers doc                                                        | README/desc/CHANGELOG/docs-in-pack          |
| Recommended improvement                          | CLI help text, env docs, typescript dep note                            | Polish                                      |
| Post-release work                                | SSO, SQLite, multi-lang AST, coverage test-impact, execute allowed cmds | Roadmap                                     |

**No critical runtime/security regression was found that would forbid continuing development or cutting a release _process_.** Publishing `2.0.0` still requires clearing must-fix packaging/docs items and an explicit version authorization.
