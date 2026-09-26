# AgentDoctor 2.0 — Pre-release repository audit

**Date:** 2026-09-22
**Phase:** 0 (inspect only — no mutations in this document’s creation window beyond writing this file)
**Branch:** `main`
**Remote:** `origin` → `https://github.com/pranee54/AgentDoctor.git`
**HEAD (pre-release commit):** `559aa30` — `release: align package, Action, and docs on 1.1.1`

---

## Package

| Field                 | Value                                                                                                            |
| --------------------- | ---------------------------------------------------------------------------------------------------------------- |
| name                  | `@praneeth_54/agentdoctor`                                                                                       |
| version (tree)        | **2.0.0**                                                                                                        |
| description           | Codebase intelligence, repository analysis, safety controls, and MCP tools for developers and engineering teams. |
| files                 | `dist`, `README.md`, `LICENSE`, `CHANGELOG.md`                                                                   |
| engines               | `node >= 20`                                                                                                     |
| bin                   | `agentdoctor` → `./dist/cli/index.js`                                                                            |
| homepage / repository | github.com/pranee54/AgentDoctor                                                                                  |

## GitHub Action

| Field                   | Value                                       |
| ----------------------- | ------------------------------------------- |
| `action.yml` name       | AgentDoctor Safety                          |
| default `version` input | **1.1.1** (STALE vs intended 2.0.0 release) |
| branding                | activity / blue                             |
| workflows               | `ci.yml`, `codeql.yml`, `release.yml`       |
| CI Action matrix pins   | **1.1.1** (must update for 2.0.0)           |

## Working tree

- ~155 uncommitted paths (2.0 implementation + docs reorganization + version cut).
- Local artifacts present: `dist/`, `node_modules/`, `.agentdoctor/`, `.private/`, `benchmarks/*.json`, possible `*.tgz`.
- `AgentDoctorOS/` — separate research tree; **not** part of npm package.

## Documentation structure (already largely organized)

```
docs/
  2.0/{overview,guides,reports,audits,release}/
  guides/ reference/ features/ development/
  release-notes/ archive/ launch/ community/ demo/ mcp/
  assets/ images/
```

Root pointer: `AGENTDOCTOR_2.0.md`.

## Source structure (already subsystem-aligned)

Top-level under `src/`: agents, architecture, cli, contracts, core, dashboard, enforcement, integrations, intelligence, knowledge, mcp, ops, platform, plugins, policy, reporters, storage, team, types.

**Audit decision:** Do **not** mechanically re-nest `src/` further before release — discoverability is already adequate; moves risk import breakage without behavior change.

## Tests / fixtures

- `tests/unit/**`, `tests/integration/**` — discovery via Vitest.
- Fixtures at repo `fixtures/**` (many projects). Suggested `fixtures/agents/` regrouping deferred — path churn breaks many tests for low release value.

## Scripts

- `scripts/ensure-cli-bin.mjs`, `scripts/perf-ast-graph.mjs` (flat). Target: `scripts/perf/` for perf harness.

## Stale `1.1.1` classification (pre-fix)

| Location                                                                | Class                                             |
| ----------------------------------------------------------------------- | ------------------------------------------------- |
| `action.yml` default                                                    | **STALE**                                         |
| `.github/workflows/ci.yml` matrix / assert                              | **STALE**                                         |
| `README.md` “published today 1.1.1”                                     | **STALE**                                         |
| `docs/guides/quickstart.md`, migration, known-limitations, cli.md, etc. | **STALE**                                         |
| `AGENTDOCTOR_2.0.md` “until authorized cut”                             | **STALE**                                         |
| `CHANGELOG` / `docs/release-notes/v1.1.1.md` / archive audits           | **HISTORICAL**                                    |
| Dependabot `picocolors ^1.1.1`                                          | **INTENTIONAL** (dependency version, not package) |

## Release readiness (from prior cuts)

- Version cut to 2.0.0 done in working tree.
- Scope review: `docs/2.0/release/final-release-scope-review.md`.
- Verify last known: 53 files / 394 tests.
- npm pack Option B (no `docs/2.0` in tarball).

## Explicit exclusions for commit

- `*.tgz`, `.private/**`, `node_modules/**`, `dist/**`, `.agentdoctor/**`, OS junk, credentials.
- Generated benchmark JSON unless deliberately versioned.
- Do not commit `AgentDoctorOS` changes unless intentional (leave as-is / untracked if not tracked).

## Planned release actions (subsequent phases)

1. Pragmatic cleanup (docs stale refs, Action/CI → 2.0.0, script move, tarball exclude).
2. Full `npm run verify` + pack + clean-install.
3. Commit → tag `v2.0.0` → push → GitHub Release → `npm publish` → verify.
