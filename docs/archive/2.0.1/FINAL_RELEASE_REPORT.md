# AgentDoctor 2.0.1 — Final Release Report

## Release

Package: `@praneeth_54/agentdoctor`  
Version: `2.0.1`  
Git commit (release): `c73436afdc8dc146ca0d7c210e7f1d1627676543` — `release: AgentDoctor 2.0.1`  
Git tag: `v2.0.1` (annotated; object `865fb668bb9ce0601bf70f98ff13d844986ecce3`)  
Branch: `main` → `origin/main`  
GitHub Release: https://github.com/pranee54/AgentDoctor/releases/tag/v2.0.1

Follow-up (post-tag, required for CI / complete tree):

- Coverage sources were locally present but **gitignored** by a broad `coverage/` rule, so `src/coverage/*` and `tests/unit/coverage/parsers.test.ts` were **not** in `c73436a`.
- Fixed in `7105f101ca94ca01c9cab560fdf7019dd6ba9df8` — `fix: track src/coverage ignored by broad gitignore` (ignore narrowed to `/coverage/`).
- This report recorded in subsequent docs-only commits on `main`.
- **Do not force-move `v2.0.1`.** npm was published from HEAD after the coverage fix, not from a bare tag checkout of `c73436a`.

## Pre-release verification (local)

| Check                             | Result                                                |
| --------------------------------- | ----------------------------------------------------- |
| `npm run verify`                  | **PASS**                                              |
| Tests                             | **70** files / **451** tests — PASS                   |
| Typecheck / lint / format / build | PASS                                                  |
| `npm pack --dry-run`              | **2.0.1**, ~328.9 kB, **550** files, unpacked ~1.4 MB |

## Git release

| Step         | Status                                    |
| ------------ | ----------------------------------------- |
| Commit       | **PASS** (`c73436a`)                      |
| Tag `v2.0.1` | **PASS** (created; did not already exist) |
| Push `main`  | **PASS** (`dd102b6..c73436a`)             |
| Push tag     | **PASS**                                  |
| Remote tag   | **PASS** — `git ls-remote` shows `v2.0.1` |

## npm release

| Step                             | Status                                            |
| -------------------------------- | ------------------------------------------------- |
| `npm whoami` (publish session)   | `praneeth_54`                                     |
| Pre-check `npm view …@2.0.1`     | Was **404** before human OTP publish              |
| Registry `latest` before publish | **2.0.0**                                         |
| `npm publish`                    | **COMPLETED** (human OTP; independently verified) |

Independent registry confirmation (post-publish):

```bash
npm view @praneeth_54/agentdoctor version          # 2.0.1
npm view @praneeth_54/agentdoctor@2.0.1 version    # 2.0.1
npm view @praneeth_54/agentdoctor dist-tags        # { latest: '2.0.1', beta: '0.3.0-beta' }
```

| Registry version | **2.0.1** |
| Registry tarball | https://registry.npmjs.org/@praneeth_54/agentdoctor/-/agentdoctor-2.0.1.tgz |
| Registry integrity | `sha512-CRFjEpqQK2njnN4sQCcI91BCz31+FZdBz13x1dt/F3XWsNLukTNT+vmbVSsU70jpCb8H5RIsksFil9qSBClDrw==` |
| dist-tag `latest` | **2.0.1** |

## Clean registry installation

Verified under `/tmp/agentdoctor-2.0.1-published-verification` (registry-only install; no local path / tarball):

| Check                                        | Result                                                               |
| -------------------------------------------- | -------------------------------------------------------------------- |
| `npm install @praneeth_54/agentdoctor@2.0.1` | **PASS**                                                             |
| `npx agentdoctor --version`                  | **2.0.1**                                                            |
| `npm list @praneeth_54/agentdoctor`          | `@praneeth_54/agentdoctor@2.0.1`                                     |
| `npm root`                                   | `/private/tmp/agentdoctor-2.0.1-published-verification/node_modules` |

## Published CLI / MCP

| Check                      | Result                                            |
| -------------------------- | ------------------------------------------------- |
| `agentdoctor scan --help`  | **PASS**                                          |
| `agentdoctor graph --help` | **PASS**                                          |
| Fixture `scan --json`      | **PASS** — `"version": "2.0.1"`                   |
| `agentdoctor mcp --help`   | **PASS**                                          |
| MCP `tools/list`           | **PASS** — 26 tools; **`change_analyze` present** |

## Security (what was verified)

- No `.env` / credentials / `.private/` staged or committed.
- No `*.tgz` committed.
- Local `npm run verify` includes security / path / secrets / enforcement tests (451 total).
- Hostile published-package path checks: not exhaustively re-run in this verification pass; package installs and runs cleanly from registry.

## GitHub

| Item                         | Status                                                                                                   |
| ---------------------------- | -------------------------------------------------------------------------------------------------------- |
| Remote `main` at release SHA | Release tag on `c73436a`; HEAD later advanced (coverage + docs + CI fixes)                               |
| Remote tag `v2.0.1`          | YES                                                                                                      |
| GitHub Release               | **YES** — https://github.com/pranee54/AgentDoctor/releases/tag/v2.0.1                                    |
| CI on tagged release push    | **FAILURE** — https://github.com/pranee54/AgentDoctor/actions/runs/35779240600 (missing `src/coverage/`) |
| CI after coverage fix        | Ubuntu **PASS**; Windows historically red (path / spawn / timeouts) — follow-up hardening on `main`      |
| Marketplace                  | **MANUAL ACTION REQUIRED** (unchanged)                                                                   |

## Known limitations (preserved)

Do **not** claim zero gaps. External / intentional boundaries remain, including:

1. Browser OAuth / full IdP login UX — EXPERIMENTAL
2. Postgres without live `AGENTDOCTOR_POSTGRES_URL` / CI service — EXTERNAL
3. Java / Kotlin / Rust / Dart (and Go extractor) AST — EXTERNAL
4. IDE / agent process interception — EXTERNAL
5. Engineering correctness / compliance certificates from hash integrity — never claimed
6. Hosted SaaS, HSM, vector production backend — EXTERNAL / out of boundary

See: [limitations.md](limitations.md) · [FINAL_COMPLETION_AUDIT.md](FINAL_COMPLETION_AUDIT.md).

## Remaining items

1. ~~Human `npm publish --otp=<code>` for `@praneeth_54/agentdoctor@2.0.1`~~ — **DONE / VERIFIED**
2. ~~Registry confirm + clean install smoke~~ — **DONE / VERIFIED**
3. Windows CI matrix hardening — follow-up on `main` (out of npm publish scope).
4. Optional: Marketplace UI listing.
5. Optional later: annotated tag alignment / patch if consumers need tag SHA == full tree (no force-move).

## Final status

# AGENTDOCTOR 2.0.1 — RELEASED AND VERIFIED

Git commit, tag, push, GitHub Release, npm registry `2.0.1`, and clean registry install (CLI `--version` 2.0.1 + scan/graph/MCP including `change_analyze`) all verified independently. Known product limitations and Windows CI follow-up remain honest gaps — not blockers for this npm release. Tag `v2.0.1` left on `c73436a` without force.
