# AgentDoctor 2.0.0 — Final release report

**Date:** 2026-09-22  
**Branch:** `main`  
**Release commit:** `c8b6681` — `release: AgentDoctor 2.0.0`  
**Tag:** `v2.0.0` (annotated)  
**Follow-up docs commits:** `6035d0f`, `0b9670a`

---

## Summary

| Field             | Value                                                                                                            |
| ----------------- | ---------------------------------------------------------------------------------------------------------------- |
| Final version     | **2.0.0**                                                                                                        |
| npm package       | `@praneeth_54/agentdoctor`                                                                                       |
| Description       | Codebase intelligence, repository analysis, safety controls, and MCP tools for developers and engineering teams. |
| Package size      | **268.1 kB** / **496** files / **1.1 MB** unpacked                                                               |
| Tests             | **53** files / **394** tests — PASS                                                                              |
| GitHub repository | https://github.com/pranee54/AgentDoctor                                                                          |
| GitHub Release    | https://github.com/pranee54/AgentDoctor/releases/tag/v2.0.0                                                      |
| npm URL           | https://www.npmjs.com/package/@praneeth_54/agentdoctor                                                           |
| Action default    | `action.yml` → `version: 2.0.0`                                                                                  |
| npm published     | **YES** — `latest` = **2.0.0**                                                                                   |
| Marketplace       | **MANUAL ACTION REQUIRED** (GitHub UI)                                                                           |

---

## Repository organization

- Kept `src/` subsystem layout (no risky mechanical re-nest).
- Docs: `docs/2.0/` canonical; `guides/`, `reference/`, `features/`, `archive/`, `release-notes/`.
- Scripts: `scripts/perf/ast-graph.mjs`.
- Root pointer: `AGENTDOCTOR_2.0.md`.
- Excluded: `*.tgz`, `.private/**`, `node_modules/**`, `dist/**`, `.agentdoctor/**`, generated benchmarks.

## Quality

| Check                              | Result                                              |
| ---------------------------------- | --------------------------------------------------- |
| `npm run verify`                   | PASS                                                |
| `npm pack`                         | PASS (`2.0.0`, 268.1 kB, 496 files)                 |
| Published clean-install            | PASS (`npm install @praneeth_54/agentdoctor@2.0.0`) |
| Published `--version` / scan JSON  | `2.0.0`                                             |
| Published `mcp` / `brain-mcp` help | PASS                                                |
| Packed README                      | Limitations + labels; no blanket 5/5                |

## Packaging (Option B)

Tarball: `dist/` + `README.md` + `CHANGELOG.md` + `LICENSE` + `package.json` only.

## GitHub

| Step                    | Status                                                                 |
| ----------------------- | ---------------------------------------------------------------------- |
| Commit on `origin/main` | **DONE** (`c8b6681` + docs follow-ups)                                 |
| Tag `v2.0.0`            | **DONE**                                                               |
| GitHub Release          | **DONE** — https://github.com/pranee54/AgentDoctor/releases/tag/v2.0.0 |

## npm

| Step                 | Status                                                                                     |
| -------------------- | ------------------------------------------------------------------------------------------ |
| Maintainer           | `praneeth_54`                                                                              |
| Publish              | **DONE** (`+ @praneeth_54/agentdoctor@2.0.0`; registry returned `202` then became visible) |
| `dist-tags.latest`   | **2.0.0**                                                                                  |
| `npm view … version` | **2.0.0**                                                                                  |
| Published smoke      | **PASS**                                                                                   |

Note: immediately after publish, `npm view` could still show `1.1.1` for ~1–2 minutes while the package was processing. That is expected with npm’s async publish pipeline.

Optional cleanup (non-blocking):

```bash
npm pkg fix   # addresses “bin[agentdoctor] script name was cleaned” publish warning
```

## GitHub Action / Marketplace

| Item                         | Status                                                                                                       |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `action.yml` default `2.0.0` | DONE                                                                                                         |
| CI matrix pins `2.0.0`       | DONE (published package now available)                                                                       |
| Action reference             | `pranee54/AgentDoctor@v2.0.0`                                                                                |
| Marketplace listing          | **MANUAL ACTION REQUIRED** — GitHub UI “Publish this Action to the GitHub Marketplace” if not already listed |

## Known limitations

Unchanged honesty: TS/JS AST focus, heuristic test-impact, inferred C4, evaluate-only firewall, local-dev auth (not SSO), no IDE interception, no production DB backends. See README + `docs/2.0/overview/known-limitations.md`.

## Presentation pass (post-publish)

Professional open-source positioning redesign (README + docs/2.0 + CONTRIBUTING / ROADMAP). No new product features; Change Proof remains **PLANNED**.

| Item                                                  | Status                                                                                               |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| README hero / lifecycle / capability map              | VERIFIED (in tree)                                                                                   |
| docs/2.0 capabilities + readiness for published 2.0.0 | VERIFIED                                                                                             |
| GitHub Action guide                                   | VERIFIED                                                                                             |
| CLI description alignment                             | VERIFIED (source; requires rebuild for dist)                                                         |
| npm tarball README refresh                            | **PARTIAL** — published `2.0.0` tarball retains pre-presentation README until a future patch publish |
| Marketplace                                           | **MANUAL ACTION REQUIRED**                                                                           |

## Remaining manual actions

1. Confirm GitHub Marketplace listing in the GitHub UI (if desired).
2. Optional: run `npm pkg fix` and ship a tiny follow-up if you want a clean publish warning log next time.
3. Optional: publish a patch (e.g. `2.0.1`) if the npm package README must match the presentation README without waiting for the next feature release.
4. Watch CI Action smoke jobs now that `2.0.0` is on the registry.

## Final status

| Gate                               | Status                            |
| ---------------------------------- | --------------------------------- |
| Repository clean (local)           | YES (after presentation commit)   |
| GitHub commit/tag/release verified | YES                               |
| npm verified                       | **YES** (`2.0.0`)                 |
| Presentation docs in git           | YES (this pass)                   |
| npm README matches presentation    | **PARTIAL** (needs patch publish) |
| Marketplace verified               | **NO — MANUAL**                   |
