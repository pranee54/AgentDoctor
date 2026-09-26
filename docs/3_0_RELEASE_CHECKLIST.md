# AgentDoctor 3.0.0 — Release Checklist

**Package version now:** `3.0.0`  
**Target release:** `3.0.0`  
**Date prepared:** 2026-09-26  
**Release actions:** NOT PERFORMED

Use this checklist in the separate **2.1.0 → 3.0.0 RELEASE EXECUTION** task.

Maintainer evidence also lives under `docs/internal/` (formal audits, acceptance, backlog).

---

## Repository

- [x] README audited
- [x] documentation links audited
- [x] capability claims audited
- [x] limitations audited (`docs/LIMITATIONS.md`)
- [x] license verified (MIT)
- [x] security policy verified (`SECURITY.md`)
- [x] contributing verified (`CONTRIBUTING.md`)
- [x] GitHub metadata reviewed (topics recommendations in README)
- [x] Public docs surface cleaned (`docs/` public vs `docs/internal/` / `docs/archive/`)

## Package

- [x] package metadata audited (`@praneeth_54/agentdoctor@2.1.0`)
- [x] package contents audited (`dist`, README, LICENSE, CHANGELOG only)
- [x] no secrets
- [x] no private files
- [x] clean install (`npm pack` → empty dir)
- [x] CLI smoke
- [x] MCP smoke (38 tools)

## Engineering

- [x] typecheck
- [x] lint
- [x] format
- [x] tests (**627/627**)
- [x] build
- [x] verify

## Product

- [x] discovery
- [x] project understanding
- [x] chat
- [x] intelligence
- [x] student
- [x] coding agent (`--goal` + `--approve` + `--apply`)
- [x] approval
- [x] security
- [x] MCP
- [x] dashboard
- [x] evidence
- [x] proof
- [x] forensic (prior acceptance)
- [x] evaluation (prior acceptance)

## Release (PENDING — do not run in this prep)

- [x] version bump `2.1.0` → `3.0.0` (`package.json`, `src/constants.ts`, `action.yml`, CHANGELOG)
- [x] final release commit
- [x] `v3.0.0` tag
- [ ] npm publish
- [x] GitHub release
- [ ] post-release clean install against published `3.0.0`
- [ ] update README install pins from `@2.1.0` to `@3.0.0` at publish time

## Notes

- Install examples currently pin `@2.1.0` intentionally until the npm cut.
- Post-3.0 backlog: `docs/internal/POST_3_0_BACKLOG.md`.
- Pre-release report: [FINAL_PRE_RELEASE_CHECK.md](FINAL_PRE_RELEASE_CHECK.md).
