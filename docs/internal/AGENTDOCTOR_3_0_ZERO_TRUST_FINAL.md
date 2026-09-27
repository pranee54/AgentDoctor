# AgentDoctor 3.0.0 — Zero-Trust Final Report

**Date:** 2026-09-27
**Repository:** `/Applications/XAMPP/xamppfiles/htdocs/AgentDoctor`
**Commit baseline:** `c21faf1fbc4d56869b965783cebc5cf0f50ac834` (detached HEAD)
**Package version:** 3.0.0 (not bumped)
**Verdict vocabulary:** PASS | FAIL | FIXED | PARTIAL | NOT_VERIFIED | UNKNOWN | EXTERNAL

---

## 1. Repository state

- Detached HEAD at release `c21faf1` plus local uncommitted remediation.
- `.private/`, `AgentDoctorOS/`, validation fixtures preserved.
- No publish / push / tag / version bump.

## 2. Baseline (Phase 0)

| Check                                 | Result                                                                      |
| ------------------------------------- | --------------------------------------------------------------------------- |
| package.json / PACKAGE_VERSION        | 3.0.0                                                                       |
| Initial `npm run verify` this session | FAIL — Prettier on `docs/internal/AGENTDOCTOR_3_0_ZERO_TRUST_AUDIT.md` only |
| Post-remediation `npm run verify`     | **PASS** — 130 files / **641** tests                                        |

## 3. Source inventory

Production under `src/`: CLI, dashboard, MCP (agent/intelligence/brain), product intelligence, agent runtime, discovery, ownership, assurance, platform, storage, workspace, plugins, languages.

79 TypeScript modules touch FS/exec/realpath/walk patterns (inventory generated during audit).

## 4. Filesystem walker inventory (production-relevant)

| Component                                        | File                              | Source intelligence? | Ownership                          | Status        |
| ------------------------------------------------ | --------------------------------- | -------------------- | ---------------------------------- | ------------- |
| discoverFiles                                    | discovery/files.ts                | Yes                  | Canonical                          | PASS          |
| listTsFiles                                      | intelligence/graph/build.ts       | Yes                  | via discoverFiles                  | PASS          |
| platform graph walk                              | platform/graph/build.ts           | Yes                  | decideDirectoryTraversal           | PASS          |
| language enrich                                  | product/graph/enrich-languages.ts | Yes                  | discoverFiles                      | PASS          |
| secrets walkFiles                                | core/secrets/scan.ts              | Yes                  | decideDirectoryTraversal           | PASS          |
| map top-level                                    | product/map/software-map.ts       | Yes                  | isProjectOwnedRelativePath         | PASS          |
| monorepo globs                                   | core/monorepo/detect.ts           | Yes                  | filter + nested-repo check         | PASS          |
| evidence-scan / doctors                          | product/evidence-scan.ts          | Yes                  | detectProject→discoverFiles        | PASS          |
| agent execute                                    | agent/tools/execute.ts            | Yes                  | assertProjectOwnedRepoPath         | PASS          |
| agent write helpers                              | agent/tools/write.ts              | Yes                  | assertProjectOwnedRepoPath         | **FIXED**     |
| MCP path targets                                 | mcp/intelligence/path-safety.ts   | Yes                  | classify + owned async helper      | **FIXED**     |
| twin load                                        | product/twin/store.ts             | Yes                  | invalidationHash includes boundary | **FIXED**     |
| brain loadLatest                                 | brain/storage/store.ts            | Yes                  | ownershipBoundaryVersion gate      | **FIXED**     |
| product discovery roots                          | product/discovery/roots.ts        | Root selection       | Home guards; not corpus            | PARTIAL       |
| storage/workspace/proof/baseline/plugins readdir | various                           | Control-plane        | Scoped to `.agentdoctor` / plugins | PASS (scoped) |
| knowledge docs readdir                           | platform/knowledge/analyze.ts     | Shallow docs         | docs/ only                         | PARTIAL       |
| resolveSafeRepoPath                              | security/paths.ts                 | Containment          | Containment only (by design)       | PASS          |

## 5. Ownership model

Canonical: `src/project/ownership.ts`
`OWNERSHIP_BOUNDARY_VERSION = 3`

- **Containment:** `resolveSafeRepoPath`
- **Ownership:** classify + nested `.git` ancestry (`assertProjectOwnedRepoPath`)
- **Control-plane:** `.agentdoctor/**` artifacts
- Non-owned tops: `.private`, `AgentDoctorOS`, `fixtures`, validation checkout prefixes

## 6–8. Security / Agent / MCP findings

| Finding                                              | Sev | Status                                                    |
| ---------------------------------------------------- | --- | --------------------------------------------------------- |
| write.ts bypassed ownership (direct helper)          | P0  | FIXED                                                     |
| MCP assertSafeRepoTarget containment-only            | P1  | FIXED                                                     |
| Twin loadTwinSnapshot ignored stale invalidationHash | P1  | FIXED                                                     |
| Brain loadLatest served pre-boundary snapshots       | P1  | FIXED                                                     |
| Graph/secrets/map independent walkers (prior)        | P0  | FIXED (re-verified)                                       |
| Agent execute ownership (prior)                      | P0  | FIXED (re-verified)                                       |
| Bare approved=true MCP write                         | —   | PASS (grant token required; prior tests)                  |
| Live MCP forge matrix                                | —   | NOT_VERIFIED                                              |
| Provider prompt-injection E2E                        | —   | NOT_VERIFIED                                              |
| Symlink escape (paths.ts)                            | —   | PASS (unit/history); full hostile symlink fixture PARTIAL |
| Home-directory performance                           | —   | NOT_VERIFIED                                              |

## 9. Prompt injection

Owned `AGENTS.md` bait in hostile fixture remains DATA. Deterministic chat did not emit foreign markers in prior probes. Provider authority override: **NOT_VERIFIED**.

## 10–11. Brain / Memory / Twin

- Brain meta now stores `ownershipBoundaryVersion`; mismatched/missing → `loadLatest()` = null; dashboard status `hasSnapshot=false`.
- Twin `loadTwinSnapshot` rejects hash ≠ current `hashInputs` (includes ownership boundary).
- Historical snapshot files may remain on disk but are not served as current truth.

## 12–13. Dashboard / API / UI

- `/api/what-if` and `/api/whatif` both live.
- Graph UI uses `sampleNodes`.
- Hostile dashboard probe: graph/decisions/map uncontaminated.
- Full browser QA of every hash route this pass: PARTIAL (API contracts + prior visual checks).

## 14. CLI

Major paths covered by verify/e2e. Full leaf matrix: PARTIAL / NOT_VERIFIED for unsmoked leaves.

## 15. Performance

Large home-directory simulation: NOT_VERIFIED.

## 16. Dead / fake / partial

Control-plane TODOs and EXTERNAL providers remain documented. No new “fake success” dashboard metrics found in this pass beyond prior honesty labels.

## 17. Test quality

| Capability             | Unit    | Integration | E2E     | Live    | Adversarial | Status       |
| ---------------------- | ------- | ----------- | ------- | ------- | ----------- | ------------ |
| Ownership walkers      | Yes     | Yes         | Partial | Partial | Yes         | PASS         |
| Agent file ownership   | Yes     | Yes         | Partial | No      | Yes         | PASS         |
| Write helper ownership | Yes     | Yes         | No      | No      | Yes         | PASS         |
| MCP path ownership     | Yes     | Partial     | No      | No      | Yes         | PASS         |
| Twin stale reject      | Yes     | Yes         | No      | No      | Yes         | PASS         |
| Brain boundary reject  | Yes     | Yes         | No      | No      | Yes         | PASS         |
| Provider injection     | No      | No          | No      | No      | No          | NOT_VERIFIED |
| MCP live forge         | Partial | Partial     | Partial | No      | No          | NOT_VERIFIED |

## 18. Fixed in this pass

1. `createFileSafe` / `editFileSafe` / `deleteFileSafe` ownership
2. MCP `assertSafeRepoTarget` ownership classification (+ `assertSafeOwnedRepoTarget`)
3. Twin load rejects stale invalidationHash
4. Brain `ownershipBoundaryVersion` on save; stale latest rejected
5. Hostile tests expanded (7 cases)
6. Prettier baseline doc format

## 19. Remaining / NOT_VERIFIED / EXTERNAL

**NOT_VERIFIED:** provider prompt-injection E2E; full live MCP forge; home-dir performance; every CLI leaf; every dashboard hash visual.
**EXTERNAL:** LLM providers, embeddings, enterprise SSO, live K8s/APM.
**PARTIAL:** search hits on owned historical audit docs; discovery/roots purpose walker; knowledge shallow docs scan.

## 20. Exact verification

```
npm run verify → exit 0
Test Files  130 passed (130)
Tests  641 passed (641)
```

## 21. Truth matrix (summary)

See also `AGENTDOCTOR_3_0_TRUTH_MATRIX.md` and `AGENTDOCTOR_3_0_CURRENT_TRUTH.md`.

## 22. Release blockers (if aiming for “ZERO TRUST VERIFIED”)

1. Provider-backed prompt-injection E2E evidence
2. Live MCP adversarial forge matrix evidence
3. Explicit performance bound evidence on large multi-project trees

Without those, product must not be marketed as fully zero-trust verified.

## Final verdict

# AGENTDOCTOR 3.0.0 — ZERO TRUST AUDIT COMPLETE — NOT FULLY VERIFIED

Critical ownership/agent/write/MCP-path/twin/brain stale-snapshot defects found in this pass are **FIXED** and adversarially tested.
Overall status remains **PARTIAL / NOT FULLY VERIFIED** because provider injection, live MCP forge, and home-directory performance lack execution evidence.
