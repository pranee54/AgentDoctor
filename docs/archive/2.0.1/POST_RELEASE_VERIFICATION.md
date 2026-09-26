# AgentDoctor 2.0.1 — Post Release Verification

**Date:** 2026-09-23  
**Verifier role:** public package only (no source changes; no commit; no version bump)  
**Clean install root:** `/tmp/agentdoctor-2.0.1-public-test` (outside the repository)

## Git

| Check                     | Result                                                                                         |
| ------------------------- | ---------------------------------------------------------------------------------------------- |
| Working tree              | **PASS** — clean; `main` matches `origin/main`                                                 |
| `HEAD` (at verification)  | `a2c8365734fb3038865d4561ae124409739836d2` — `fix: raise Windows PHP/Go adapter test timeouts` |
| Release commit (tag peel) | `c73436afdc8dc146ca0d7c210e7f1d1627676543` — `release: AgentDoctor 2.0.1`                      |
| Tag local `v2.0.1`        | **PASS** (annotated object `865fb668bb9ce0601bf70f98ff13d844986ecce3`)                         |
| Tag remote `origin`       | **PASS** — `git ls-remote origin refs/tags/v2.0.1` → `865fb668…`                               |
| Tag → release commit      | **PASS** — `v2.0.1^{}` = `c73436a…`                                                            |
| Tag ancestor of `HEAD`    | **PASS** (post-release docs/CI fixes exist on `main` after the tag)                            |

Remote tag: **PASS**

## npm

| Field                                             | Actual                                                                                            |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `npm view @praneeth_54/agentdoctor version`       | `2.0.1`                                                                                           |
| `npm view @praneeth_54/agentdoctor@2.0.1 version` | `2.0.1`                                                                                           |
| dist-tag `latest`                                 | `2.0.1`                                                                                           |
| Tarball                                           | https://registry.npmjs.org/@praneeth_54/agentdoctor/-/agentdoctor-2.0.1.tgz                       |
| Integrity                                         | `sha512-CRFjEpqQK2njnN4sQCcI91BCz31+FZdBz13x1dt/F3XWsNLukTNT+vmbVSsU70jpCb8H5RIsksFil9qSBClDrw==` |

**Packaging note (not a CLI/MCP functional failure):** the README baked into the `2.0.1` tarball still contains the pre-publish line “In-repo cut: 2.0.1 (publish pending…) / Last published 2.0.0”. Registry version and CLI `--version` are `2.0.1`. GitHub README on `main` is corrected. npm cannot rewrite a published version’s README without a new version.

## Clean npm installation

| Check                                                    | Result                      |
| -------------------------------------------------------- | --------------------------- |
| `npm install @praneeth_54/agentdoctor@2.0.1` in `/tmp/…` | **PASS**                    |
| `npx agentdoctor --version`                              | **PASS** — `2.0.1` (exit 0) |
| `npx agentdoctor --help`                                 | **PASS** (exit 0)           |

**PASS**

## Package isolation

| Check                                | Result                                                                              |
| ------------------------------------ | ----------------------------------------------------------------------------------- |
| `npm list @praneeth_54/agentdoctor`  | `@praneeth_54/agentdoctor@2.0.1` under `/private/tmp/agentdoctor-2.0.1-public-test` |
| `npm root`                           | `/private/tmp/agentdoctor-2.0.1-public-test/node_modules`                           |
| Symlink to dev repo                  | **PASS** — package directory is not a symlink                                       |
| Resolves under `/htdocs/AgentDoctor` | **PASS** — `false`                                                                  |
| `NODE_PATH`                          | unset                                                                               |

All CLI/MCP commands below used only this clean install (no repo `dist/` / `node_modules`).

## CLI

Fixture: `/tmp/agentdoctor-2.0.1-public-test/fixture` (tiny `package.json` + `src/index.ts`).

| Command                                                  | Result                                             | Exit  |
| -------------------------------------------------------- | -------------------------------------------------- | ----- |
| `npx agentdoctor --version`                              | `2.0.1`                                            | **0** |
| `npx agentdoctor --help`                                 | usage printed                                      | **0** |
| `npx agentdoctor scan . --json`                          | JSON `version: "2.0.1"`                            | **0** |
| `npx agentdoctor graph . --json`                         | snapshot JSON                                      | **0** |
| `npx agentdoctor change analyze .`                       | assessment emitted (`verificationStatus: not-run`) | **0** |
| `npx agentdoctor architecture init .`                    | wrote `.agentdoctor/architecture.json`             | **0** |
| `npx agentdoctor architecture check .`                   | 0 violations                                       | **0** |
| `npx agentdoctor impact .`                               | heuristic test-impact (git unavailable in fixture) | **0** |
| `npx agentdoctor policy check --command "npm --version"` | `decision=allow`                                   | **0** |
| `npx agentdoctor run explain --command "npm --version"`  | `decision: allow`                                  | **0** |

## MCP

| Test                                                | Result                  |
| --------------------------------------------------- | ----------------------- |
| `npx agentdoctor mcp --help`                        | **PASS** (exit 0)       |
| STDIO `initialize` + `tools/list` via published CLI | **PASS** — **26** tools |
| `change_analyze` present                            | **PASS**                |
| `architecture_check` present                        | **PASS**                |
| `proof_inspect` present                             | **PASS**                |
| `evidence_inspect` present                          | **PASS**                |
| `graph_query` present                               | **PASS**                |

Full tool list observed:  
`architecture_check`, `architecture_info`, `brain_claims`, `brain_delta`, `brain_evidence`, `brain_explain`, `brain_overview`, `brain_ownership`, `brain_query`, `brain_risk`, `brain_snapshot`, `brain_trace`, `call_graph_lookup`, `change_analyze`, `code_health`, `codebase_search`, `dependency_lookup`, `evidence_inspect`, `graph_query`, `knowledge_retrieve`, `policy_evaluate`, `proof_inspect`, `refactor_impact`, `repo_overview`, `symbol_lookup`, `test_impact`.

## Security/path test

Hostile `dependency_lookup` against the published MCP server (`--root` = fixture):

| Test                               | Result                                            |
| ---------------------------------- | ------------------------------------------------- |
| `target=../../etc/passwd`          | **PASS** — `ok: false`, `error.code: path_escape` |
| `target=/etc/passwd`               | **PASS** — `ok: false`, `error.code: path_escape` |
| Error message echoes `/etc/passwd` | **PASS** — does not                               |

## GitHub

Only what was actually verified:

| Check                                                    | Result                                                                                                                                                                                                    |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GitHub Release `v2.0.1`                                  | **PASS** — https://github.com/pranee54/AgentDoctor/releases/tag/v2.0.1 (`AgentDoctor 2.0.1`, tag `v2.0.1`, `targetCommitish: main`, created `2026-09-22T20:16:43Z`)                                       |
| Remote tag `v2.0.1`                                      | **PASS** (see Git section)                                                                                                                                                                                |
| Release commit on GitHub                                 | **PASS** — `c73436a` `release: AgentDoctor 2.0.1`                                                                                                                                                         |
| CI on release commit `c73436a`                           | **FAIL** actually observed — workflow `CI` conclusion **failure** (run https://github.com/pranee54/AgentDoctor/actions/runs/35779240600); CodeQL on that commit **success**                               |
| Later successful CI on `main` (post Windows portability) | **PASS** observed for `4f3ebd5` (https://github.com/pranee54/AgentDoctor/actions/runs/35781687643) and for an earlier run of `ca20183` (https://github.com/pranee54/AgentDoctor/actions/runs/35782856409) |
| CI on subsequent `ca20183` push                          | **FAIL** observed (Windows PHP adapter timeout — https://github.com/pranee54/AgentDoctor/actions/runs/35784978603)                                                                                        |
| CI on current `HEAD` `a2c8365` (timeout bump)            | **IN PROGRESS** at verification time (Ubuntu 20/22 green; Windows still running — https://github.com/pranee54/AgentDoctor/actions/runs/35785584654); CodeQL **success**                                   |

Do **not** claim “all Actions green for the release commit”; the release-commit CI run failed. Public npm package verification below does not depend on that.

## Known limitations

Unchanged from [limitations.md](limitations.md). Summary only (do not treat as cleared):

- Not a zero-gap / “complete every capability” claim.
- `verified` / proof integrity ≠ engineering correctness.
- Default policy is evaluate-only; no IDE/agent interception.
- Coverage-backed test impact optional; heuristic by default.
- Language AST depth limited; Go/Java/Kotlin/Rust/Dart gaps remain as documented.
- Option B npm packaging (docs live on GitHub).
- Postgres / SaaS / HSM / full browser OAuth remain external or experimental as documented.

## Final result

Independent clean install of `@praneeth_54/agentdoctor@2.0.1` succeeded. Representative CLI commands exited 0 with version `2.0.1`. Combined MCP listed required tools and rejected hostile `dependency_lookup` paths with `path_escape`.

# RELEASE VERIFIED
