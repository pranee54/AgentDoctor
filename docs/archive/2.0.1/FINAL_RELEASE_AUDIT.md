# AgentDoctor 2.0.1 — Final Release Audit

> **Historical pre-publish snapshot.** Publish and push completed afterward. Current verified status: [FINAL_RELEASE_REPORT.md](FINAL_RELEASE_REPORT.md) (**RELEASED AND VERIFIED**).

**Date:** 2026-09-23  
**Package:** `@praneeth_54/agentdoctor@2.0.1`  
**Auditor role:** release cut (local verify + pack dry-run)

## Authorization gates (explicit)

| Action             | Status (at audit time)                       |
| ------------------ | -------------------------------------------- |
| `npm publish`      | Was **NOT AUTHORIZED YET** (later completed) |
| `git push`         | Was **NOT AUTHORIZED YET** (later completed) |
| `git commit` / tag | Was **NOT AUTHORIZED** (later completed)     |

Do not treat this file as live publish status — use [FINAL_RELEASE_REPORT.md](FINAL_RELEASE_REPORT.md).

## Version alignment

| Surface                                   | Value                                                                                                                  |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `package.json` / `package-lock.json`      | `2.0.1`                                                                                                                |
| `src/constants.ts` `PACKAGE_VERSION`      | `2.0.1`                                                                                                                |
| Built `dist/constants.js`                 | `2.0.1`                                                                                                                |
| `action.yml` default `version`            | `2.0.1`                                                                                                                |
| CI published-package pins + report assert | `2.0.1` (workspace mode unchanged)                                                                                     |
| Description                               | Engineering assurance for AI coding agents — repository intelligence, change evidence, safety controls, and MCP tools. |
| Keywords added                            | `change-assurance`, `evidence`, `engineering-assurance` (plus existing `mcp`)                                          |

## `npm run verify`

**Result: PASSED** (2026-09-23)

| Step                                | Result                                      |
| ----------------------------------- | ------------------------------------------- |
| `typecheck` (`tsc` project + build) | pass                                        |
| `lint` (eslint)                     | pass                                        |
| `format:check` (prettier)           | pass (after formatting new/assurance files) |
| `test` (vitest)                     | **63** files, **424** tests passed          |
| `build`                             | pass                                        |

Change assurance unit tests (`tests/unit/assurance/change-assurance.test.ts`) confirm:

- `change analyze` → `verificationStatus: not-run` (never `verified`)
- `change verify` → `evidence-produced` + durable bundle
- `evidence verify` → `verified` only when all manifest hashes match

## Package dry-run (`npm pack --dry-run`)

| Field         | Value                                                                       |
| ------------- | --------------------------------------------------------------------------- |
| Filename      | `praneeth_54-agentdoctor-2.0.1.tgz`                                         |
| Package size  | ~275.4 kB                                                                   |
| Unpacked size | ~1.2 MB                                                                     |
| Total files   | 500                                                                         |
| Contents      | Option B: `dist/**`, `package.json`, `README.md`, `LICENSE`, `CHANGELOG.md` |

Local tarball artifact (if created during dry-run) should not be committed.

**Note:** Remote CI matrix entries that install published `version: 2.0.1` will fail until a human publishes 2.0.1 to npm. Until then use `version: workspace` against a built checkout.

## Shipped in this cut

- Change assurance: `agentdoctor change analyze` / `change verify`
- Evidence: `agentdoctor evidence inspect <id>` / `evidence verify <id>`
- Docs: `docs/2.0.1/*` (contract, gap audit, change assurance, evidence, limitations, release notes, this audit)
- README / ROADMAP / CHANGELOG updated for 2.0.1 honesty
- CodeQL hardening + CI plugin-fixture / Windows AST path fixes (from recent commits on the train)

## Known limitations (release truth)

- Test impact is **heuristic by default**; optional `--coverage` enables coverage-backed / hybrid mode.
- Architecture impact in assessments is **inferred** (C4); local architecture contract check is separate.
- Policy path remains **evaluate-only** by default; controlled run is opt-in.
- `verified` = evidence hash integrity only — not correctness or compliance.
- No enterprise SSO / OIDC; no IDE interception; no Postgres / multi-tenant SaaS.
- Full Change Proof product vision remains **partially** shipped (assessment + evidence + integrity proof).

See [limitations.md](limitations.md) · [COMPLETE_IMPLEMENTATION_AUDIT.md](COMPLETE_IMPLEMENTATION_AUDIT.md).

## Pre-publish checklist (human)

1. Review diff + this audit
2. Authorize **git commit** (and optionally tag `v2.0.1`)
3. Authorize **git push**
4. Authorize **`npm publish`**
5. Confirm Action / marketplace consumers can resolve `2.0.1`
6. Re-run or observe CI action-smoke against published pin
