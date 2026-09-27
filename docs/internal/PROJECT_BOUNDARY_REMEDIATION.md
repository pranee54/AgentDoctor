# Project Boundary Remediation

P0 data-integrity fix for nested / private / foreign project contamination under the AgentDoctor filesystem root.

**Date:** 2026-09-27
**Version under test:** AgentDoctor 3.0.0 (no version bump)

---

## Root cause

Product intelligence treated **path containment** (`isPathInsideRoot`) as **project ownership**.

`discoverFiles` walked every directory under the catalog root except `DEFAULT_IGNORE_DIRECTORIES` (node_modules, dist, …). It did **not** stop at:

- nested Git repositories (e.g. `.private/oss-validation/sigma/.git`)
- private validation checkouts (`.private/…`)
- internal docs trees (`AgentDoctorOS/…`)

ADR discovery then matched **any** path containing `/adr/` (and `ADR-\d+` basenames), so foreign SIGMA ADRs and AgentDoctorOS notes were returned by `GET /api/decisions` as if they belonged to `@praneeth_54/agentdoctor`.

## Existing incorrect assumption

> “If a file is under the project root, it belongs to the current project.”

That is unsafe for AgentDoctor’s real working trees, which may contain private OSS validation checkouts and nested repositories.

## Canonical project ownership rule

Implemented in `src/project/ownership.ts`:

1. Canonical root = `resolveRepoRoot(projectRoot)`.
2. A path is **project_owned** only if it is not classified as:
   - `private_workspace` (top-level `.private`)
   - `internal_docs` (top-level `AgentDoctorOS`)
   - `fixture_tree` / `validation_checkout` (known prefixes)
   - `nested_repository` (directory other than root that contains `.git`)
3. Filesystem containment remains required (path safety) but is **not sufficient**.

`OWNERSHIP_BOUNDARY_VERSION` is included in Digital Twin cache invalidation so stale contaminated snapshots are rebuilt.

## Nested repository handling

Before descending into a directory, discovery calls `decideDirectoryTraversal`:

- If `dir/.git` exists and `dir !== projectRoot` → **do not traverse** (`nested_repository`).
- SIGMA checkout has its own `.git`; even without `.private` classification, nested-git would stop it.

## Ignore / fixture handling

Gitignore is **not** the only boundary:

| Mechanism                    | Role                            |
| ---------------------------- | ------------------------------- |
| `.gitignore` `.private/`     | VCS hygiene                     |
| Ownership classifier         | Product attribution             |
| Nested `.git` detection      | Cross-repo isolation            |
| `DEFAULT_IGNORE_DIRECTORIES` | Generated/deps skip (unchanged) |

Foreign SIGMA files were **not deleted**.

## ADR discovery changes

`src/product/decisions/ledger.ts`:

- Only project-owned files from `detectProject` discovery
- ADR path filter limited to `docs/adr/`, `adr/`, or basename `ADR[-_]\d+` **after** ownership
- Provenance fields: `sourceKind`, `projectRoot`, `ownership`, `truthMeaning`
- Limitations text states VERIFIED ≠ architecture proven correct
- Ledger JSONL entries with non-owned paths are skipped

## Cross-project isolation

Primary enforcement is in `discoverFiles` → all `detectProject` consumers inherit isolation:

DNA, deps, features, requirements, map, security (via detection), search corpus, doctors inputs, twin rebuild, decisions, etc.

## AI context isolation

Tools/chat that use `detectProject` / discovery no longer see foreign trees.

Project Chat live checks (deterministic no-LLM answers) did **not** cite SIGMA / Cloudflare D1 / Bulgarian procurement ADRs after the fix.

## Memory isolation

`queryMemory` uses `loadDecisionLedger` (now clean) and filters brain search hits whose text references `.private/`, `AgentDoctorOS/`, or `oss-validation/` (legacy brain snapshots may still contain old claims until rebuilt).

## Digital Twin isolation

Twin is built from DNA/health/graph; plus cache key includes `OWNERSHIP_BOUNDARY_VERSION` so old snapshots invalidate.

Live `/api/twin` after fix: no `.private` / `AgentDoctor_Book` paths.

## Dashboard changes

Decisions UI:

- Banner clarifying VERIFIED semantics
- Shows source kind, ownership, project name, evidence path, truth meaning
- Empty state when no project-owned ADRs (AgentDoctor currently has **0**)

## Tests

`tests/unit/project/ownership-boundary.test.ts`:

- classification of `.private` / `AgentDoctorOS` / `docs/adr`
- fixture: owned ADR included; SIGMA-like `.private` ADR excluded; nested-repo ADR excluded; AgentDoctorOS excluded
- `discoverFiles` skips private + nested
- `detectProject` does not list nested `package.json`

`tests/unit/product/decisions-ledger.test.ts` asserts ownership + truthMeaning.

## Before / after metrics (live AgentDoctor root)

| Metric                      | Before                          | After                                                                         |
| --------------------------- | ------------------------------- | ----------------------------------------------------------------------------- |
| `GET /api/decisions` count  | 39 (34 SIGMA + 5 AgentDoctorOS) | **0** (no owned ADRs)                                                         |
| SIGMA titles in Decisions   | present                         | **absent**                                                                    |
| DNA `counts.files` (approx) | ~55k                            | **~1060**                                                                     |
| Deps `directDependencies`   | ~8988                           | **14**                                                                        |
| Discovery skip              | —                               | `.private (private_workspace)`, `AgentDoctorOS (internal_docs)`, nested repos |

## Remaining limitations

1. **Legacy Project Brain snapshots** may still contain pre-boundary claims until `agentdoctor` brain rebuild; search/memory filter strips obvious `.private` / `oss-validation` text hits.
2. Ownership top-level names (`.private`, `AgentDoctorOS`) are explicit product policy for this repository layout; other private dir names need classifier extension or nested-`.git` coverage.
3. AgentDoctor currently has **no** `docs/adr/` corpus — Decisions empty state is expected, not a regression of owned content.
4. Multi-project workspace mode remains partial (`local-single-repo`); cross-read still requires explicit workspace allow flags.

## Acceptance checklist

- [x] Foreign SIGMA ADRs excluded
- [x] Legitimate owned ADRs still included (unit fixture)
- [x] Nested repositories isolated
- [x] Private/validation trees isolated
- [x] Project Chat live check clean of SIGMA ADRs
- [x] Search/memory/twin live checks clean of `.private` ADR paths
- [x] Home/DNA/deps metrics no longer dominated by nested trees
- [x] Dashboard provenance + VERIFIED copy
- [x] Path safety unchanged (still inside root)
- [x] No deletion of `.private` or `AgentDoctorOS` trees
- [x] No version bump / publish / push / tag
