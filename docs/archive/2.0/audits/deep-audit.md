# AgentDoctor 2.0 — Deep Implementation Audit Report

**Audit date:** 2026-09-21
**Package version audited:** `1.1.1` (unchanged)
**Claims source:** `AGENTDOCTOR_2.0_IMPLEMENTATION_REPORT.md`
**Auditor method:** Source inspection of `src/platform/**`, CLI wiring, dashboard `/api/platform`, adversarial temp-fixture tests, `npm run verify`

---

## 1. Executive summary

AgentDoctor 2.0’s platform layer is a **real, local-first MVP**, not a hollow stub directory. Modules A–O and R exist under `src/platform/`, are orchestrated by `runPlatformScan`, exposed via `agentdoctor platform …`, and persist under `.agentdoctor/platform/`.

However, the original implementation report **overstated security maturity** and understated several correctness bugs:

| Severity | Finding (pre-fix)                                                                          | Status after this audit                                               |
| -------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| Critical | `writeJsonArtifact` / `appendJsonl` allowed `../` path traversal out of the platform store | **Fixed**                                                             |
| Critical | `loadSession(sessionId)` accepted arbitrary path segments                                  | **Fixed** (UUID-only)                                                 |
| High     | Architecture drift compared hashed dependency IDs as labels → rules almost never matched   | **Fixed** (specifier labels)                                          |
| High     | Circular-import adjacency was built then **unused**                                        | **Fixed** (DFS cycle report)                                          |
| High     | Platform `--json` never worked (root scan flags swallowed it)                              | **Fixed** (`optsWithGlobals`)                                         |
| Medium   | `canAccess(..., "read-findings")` always `true` → dead 403 path                            | **Hardened** (role matrix + sampleFindings gated on `export-reports`) |
| Medium   | Local `?user=` is spoofable auth                                                           | **Documented** in API limitations (by design for local-only)          |
| Low      | Git refs for time-machine not validated against `--flag` forms                             | **Fixed**                                                             |

**Release-readiness verdict:** suitable as a **local MVP / preview** of AgentDoctor 2.0 platform features. **Not** ready to market as enterprise firewall, RBAC, or “complete product” without the limitations below. Version bump to `2.0.0` should wait on product review.

`npm run verify` after hardening: **PASS — 44 files / 349 tests**.

---

## 2. Feature-by-feature verification table

| Module                    | Claimed                    | Implemented?                           | CLI/API connected?                 | Real repo data?    | Deterministic?   | Meaningful tests?  | Verdict                    |
| ------------------------- | -------------------------- | -------------------------------------- | ---------------------------------- | ------------------ | ---------------- | ------------------ | -------------------------- |
| A Repository intelligence | MVP graph                  | Yes — `graph/build.ts`                 | CLI `platform graph/scan`          | Yes (walk + regex) | Yes (sorted IDs) | Yes (scan + arch)  | **Fully (MVP)**            |
| B Code health             | Heuristics                 | Yes — size/LOC/nesting/catch + cycles  | Via scan                           | Yes                | Mostly           | Partial (via scan) | **Fully (MVP)**            |
| C Agent Action Firewall   | Evaluate-only              | Yes — never executes                   | CLI `firewall-check`               | Policy + params    | Yes              | Yes + security     | **Fully (MVP)**            |
| D Sessions / replay       | JSON+MD                    | Yes                                    | CLI session-* / demo               | Local store        | Yes              | Yes                | **Fully (MVP)**            |
| E Provenance              | Unknown-safe               | Yes — git when available               | CLI `provenance`                   | Git + inputs       | Yes              | Yes                | **Fully (MVP)**            |
| F Context security        | Regex detectors            | Yes — fixed candidate files            | Via scan                           | Yes                | Yes              | Yes                | **Fully (MVP)**            |
| G Knowledge governance    | Doc index MVP              | Yes                                    | Via scan (findings)                | Yes                | Yes              | Via scan only      | **Partial**                |
| H Test impact             | Heuristics                 | Yes — but **not** in snapshot findings | Returned by `runPlatformScan` only | Git changes        | Yes              | Weak               | **Partial / disconnected** |
| I Architecture drift      | Policy vs imports          | Yes (after label fix)                  | Via scan                           | Yes                | Yes              | Yes (security)     | **Fully (MVP)**            |
| J Time machine            | Git path diff              | Yes                                    | CLI `time-machine`                 | Git                | Yes              | Security ref check | **Fully (MVP)**            |
| K Refactor impact         | Rename analysis            | Yes — no apply                         | CLI `refactor`                     | Graph + text       | Yes              | Weak               | **Fully (MVP)**            |
| L Token optimization      | Budgeted plan              | Yes — excludes secrets                 | CLI `context`                      | Graph files        | Yes              | Yes                | **Fully (MVP)**            |
| M AI-diff quality         | Diff heuristics            | Yes — attribution unknown              | Via scan                           | `git diff`         | Yes              | Via scan           | **Partial**                |
| N Agent readiness         | Scorecard                  | Yes — multi-category                   | Via scan / API                     | Scan + files       | Yes              | Via scan           | **Fully (MVP)**            |
| O Report generation       | JSON/CSV/MD/HTML/SARIF     | Yes                                    | Scan writes reports                | Findings           | Yes              | Via scan           | **Fully (MVP)**            |
| P CI/integrations         | Partial                    | Existing Safety Action only            | N/A platform gate                  | —                  | —                | —                  | **Partial (as claimed)**   |
| Q Dashboard/API           | Local UI + `/api/platform` | Yes — summary API                      | `dashboard`                        | Snapshot file      | Yes              | Yes                | **Fully (MVP)**            |
| R Local RBAC              | `auth.json` roles          | Yes — **not** real auth                | `?user=`                           | Config file        | Yes              | Yes                | **Partial (honest local)** |

---

## 3. Fully implemented features (MVP scope)

Evidence: code paths exercised by tests and/or CLI smoke.

1. **Repository graph** — walks repo (skips symlinks, `node_modules`, etc.), extracts symbols/imports with regex, size caps (`256 KiB` read).
2. **Platform scan orchestration** — `runPlatformScan` builds snapshot + reports under `.agentdoctor/platform/`.
3. **Firewall evaluate-only** — `executionResult: "not-executed"` always; blocks `rm -rf /`, secret-ish paths, deploy/network defaults.
4. **Sessions** — create/append/end/list/load/export markdown; IDs are UUIDs.
5. **Provenance** — marks missing agent/model/review as `unknown`; uses `spawnSync("git", …)` with fixed args (no shell).
6. **Context-security patterns** — detects injection phrases in `AGENTS.md` etc. with evidence + false-positive warning.
7. **Architecture policy** — default `architecture-policy.json`; now matches import **specifiers**.
8. **Time machine** — `git diff --name-only left...right` with unsafe-ref rejection.
9. **Refactor rename impact** — analysis only.
10. **Token planner** — excludes `.env` / credentials paths; rejects `..` / absolute / symlink.
11. **Reports** — five formats via confined store writers.
12. **Dashboard `/api/platform`** — read-only GET; POST still rejected at server level.
13. **Local role matrix** — `export-reports`, `manage-policies`, etc. differ by role.

---

## 4. Partially implemented features

### Knowledge governance (G)

Indexes common docs, freshness, empty files. Contradiction detection is intentionally limited (stated in limitations). No dedicated unit assertions beyond scan inclusion.

### Test-impact analysis (H)

`analyzeTestImpact` runs inside `runPlatformScan` and is returned to callers, but results are **not** merged into `snapshot.findings`, **not** written as a first-class report artifact, and **not** exposed on `/api/platform`. CLI has **no** `platform test-impact` command. Functionally orphaned relative to the product surface.

### AI-diff quality (M)

Works when `git diff` succeeds; otherwise emits a single informational finding. Does not attribute AI authorship unless caller sets `aiAssisted` (scan always passes `"unknown"`). Heuristic only.

### Local authorization (R)

Works as a **config-driven permission matrix**, not authentication. Anyone who can hit the dashboard can pass `?user=local-admin`. Suitable for single-user localhost only.

### CI / integrations (P)

As claimed: Safety GitHub Action retained; no dedicated platform CI gate workflow.

### Code health circular deps (B)

Now reports cycles, but resolution of relative imports to files is heuristic (extension guessing) — false positives/negatives expected.

---

## 5. Placeholder or misleading functionality

| Item                                                                 | Why misleading                                                                                                                          |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Report claim “Path confinement via existing root resolution helpers” | Store writers originally did **not** confine relative paths; fixed in this audit.                                                       |
| Architecture drift “MVP” before fix                                  | Rules compared hashed node IDs to substrings like `dist/` — effectively dead.                                                           |
| Dashboard 403 on `read-findings`                                     | Previously unreachable (`return true`). Now sample findings require developer+; 403 still only if role matrix denies read (still rare). |
| “Agent Action Firewall” name                                         | Evaluate API only — **no** IDE/agent interception hooks. Report §10 already notes this; naming still implies runtime enforcement.       |
| Circular import “analysis” (pre-fix)                                 | Dead code path.                                                                                                                         |
| Platform `--json` in docs/examples                                   | Did not emit JSON until `optsWithGlobals` fix (root `addScanOptions(--json)` captures the flag).                                        |
| Test impact in “platform scan” narrative                             | Computed but not surfaced in snapshot/API/CLI.                                                                                          |
| Auth “roles”                                                         | Spoofable query param — must not be sold as security control.                                                                           |

No module was an empty `TODO` stub; overstatement was about **effectiveness** and **surface wiring**, not file existence.

---

## 6. Security vulnerabilities

### Fixed during this audit

1. **Path traversal in platform store** (`src/platform/store.ts`)
   User-controlled relative paths could write outside `.agentdoctor/platform/`. Now rejects `..`, absolute paths, NUL, and verifies `isPathInsideRoot`.

2. **Session ID path traversal** (`src/platform/sessions/store.ts`)
   `loadSession` now requires UUID v1–5 shape.

3. **Broken architecture enforcement** (`graph/build.ts` labels)
   Security-relevant policy checks were ineffective.

4. **Git ref option-injection shape** (`time-machine/compare.ts`)
   Refs starting with `-` rejected (spawn argv, not shell — still defense-in-depth).

5. **Context planner path escapes / symlinks** (`tokens/plan.ts`)
   Rejects `..`, absolute paths, symlinks; keeps secret-like exclusion.

6. **Report text writers**
   Now use `writeTextArtifact` with the same confinement.

### Remaining / accepted risks

| Risk                              | Assessment                                                                                                                                                                                                                                             |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Command injection via firewall    | **N/A** — firewall does not execute commands. CLI only evaluates strings.                                                                                                                                                                              |
| Dangerous shell commands          | Policy substring matching is incomplete (e.g. `rm -rf .` may not match `rm -rf /`). Evaluate-only mitigates impact.                                                                                                                                    |
| Secret-file access                | Firewall blocks pathContains `.env` etc. Token planner excludes secret-like paths. Context-security may still **echo matched line snippets** (≤160 chars) into findings/reports — potential leakage if secrets sit on the same line as injection text. |
| Malicious `AGENTS.md`             | Detected as findings; **not** blocked from being read by agents (out of scope).                                                                                                                                                                        |
| Unauthorized role access          | Local spoofable `?user=` — **do not expose dashboard beyond localhost trust boundary**.                                                                                                                                                                |
| Symlink traversal                 | Graph walk skips symlink entries; planner excludes symlinks. Race/TOCTOU not handled.                                                                                                                                                                  |
| Oversized files                   | Graph skips >256 KiB content parse; health flags >512 KiB; planner skips >100 KiB.                                                                                                                                                                     |
| Malformed JSON policies           | Invalid firewall/arch policy falls back to defaults (fail-open to defaults, not fail-closed to deny-all).                                                                                                                                              |
| Report data leakage               | Full findings + optional snapshot written under `.agentdoctor/platform/reports/` on disk; `/api/platform` now omits `sampleFindings` for readonly default role.                                                                                        |
| Root Commander `--json` collision | Fixed for platform; other nested commands that read `options.json` without `optsWithGlobals` may still be affected (pre-existing pattern; verify/scan already correct).                                                                                |

**No destructive commands were executed against the host during testing.** Adversarial cases used temp fixtures and evaluate-only firewall checks.

---

## 7. Reliability issues

1. **Test-impact orphaned from user-visible outputs** — easy to believe scan “includes” it when it does not.
2. **Firewall first-match rule order** — later allow rules never override earlier blocks (good for secrets); incomplete destructive patterns remain.
3. **Readiness scores** — coarse presence checks (README/tests dir) + Safety scan; not a deep maturity model.
4. **Non-git repos** — provenance/time-machine/ai-quality degrade gracefully with unknown/empty results.
5. **Dashboard is not a multi-page SPA** — matches report honesty; UI is a single HTML page dumping JSON sections.

---

## 8. Test coverage gaps

**Present**

- `tests/unit/platform/platform.test.ts` — scan, firewall, sessions, context-sec, provenance, auth, dashboard, CLI `--json`
- `tests/unit/platform/platform-security.test.ts` — traversal, session IDs, secrets, AGENTS.md injection, arch drift, planner, git refs, roles, symlink skip, sessions path

**Gaps remaining**

| Area                                     | Gap                                |
| ---------------------------------------- | ---------------------------------- |
| Knowledge governance                     | No dedicated assertions            |
| Test impact                              | No unit tests; no CLI smoke        |
| Refactor impact                          | No dedicated tests                 |
| Time machine happy path                  | Only invalid-ref security test     |
| Report format contents                   | Only “path exists” via scan        |
| Firewall allow path / default decision   | Limited                            |
| Oversized file handling                  | Not explicitly asserted            |
| Concurrent store writers                 | Not tested                         |
| Dashboard POST rejection                 | Not re-asserted in platform suite  |
| Malicious HTML in findings → HTML report | Escape exists; no XSS fixture test |

Coverage was **increased**, not reduced, to make verify pass.

---

## 9. Architecture problems

1. **Platform store is ad-hoc JSON files** — fine for local MVP; no schema versioning/migrations beyond `version: "2.0"` fields.
2. **Root CLI option inheritance** — global `--json` from default scan options pollutes nested commands unless every action uses `optsWithGlobals()` (documented in `program.ts` for scan; platform now fixed).
3. **Mixed orchestration** — `runPlatformScan` eagerly loads firewall policy / auth but does not evaluate actions; sessions are separate.
4. **Duplication with Safety pipeline** — readiness calls full `scan()`; context-security overlaps conceptually with Safety instruction rules but is a separate detector set.
5. **No plugin/firewall interception boundary** — policy engine is a library + CLI, not an enforcement proxy.

---

## 10. Recommended fixes (prioritized)

1. Surface **test-impact** in snapshot + CLI (`platform test-impact`) or stop claiming it as a scan output.
2. Fail-closed option for malformed firewall policy (deny-all until fixed).
3. Expand destructive shell patterns; add allowlist mode for shell.
4. Redact evidence snippets that look like secrets before writing reports/API.
5. Audit **all** nested CLI commands for `optsWithGlobals` on shared root flags.
6. Bind dashboard to `127.0.0.1` only by default (already default host) and refuse non-loopback without explicit `--host`.
7. Add dedicated tests for knowledge, refactor, time-machine happy path, report XSS escape.
8. Consider renaming “Firewall” → “Action Policy Evaluator” in user-facing copy until hooks exist.

---

## 11. Exact files requiring changes

### Changed in this audit (required fixes)

- `src/platform/store.ts` — path confinement + `writeTextArtifact`
- `src/platform/sessions/store.ts` — UUID session IDs
- `src/platform/graph/build.ts` — dependency node labels = import specifiers
- `src/platform/architecture/drift.ts` — (consumes fixed labels; unchanged logic)
- `src/platform/health/analyze.ts` — circular import DFS
- `src/platform/tokens/plan.ts` — traversal/symlink guards
- `src/platform/time-machine/compare.ts` — safe git refs
- `src/platform/reports/export.ts` — confined text writes
- `src/platform/auth/local.ts` — honest `read-findings` matrix
- `src/dashboard/server.ts` — sampleFindings gated; spoofability limitation text
- `src/cli/program.ts` — platform `--json` via `optsWithGlobals`
- `tests/unit/platform/platform-security.test.ts` — **new**
- `tests/unit/platform/platform.test.ts` — CLI `--json` regression

### Still recommended (not all done)

- `src/platform/index.ts` / `src/cli/commands/platform.ts` — wire test-impact
- `src/platform/firewall/evaluate.ts` — broader patterns / fail-closed policy parse
- `src/platform/context-security/analyze.ts` — redact secret-like evidence snippets
- Additional tests under `tests/unit/platform/`

---

## 12. Exact test results

```text
npm run typecheck  PASS
npm run lint       PASS
npm run format:check PASS
npm test           PASS
npm run build      PASS
npm run verify     PASS

Test Files  44 passed (44)
Tests       349 passed (349)
Package     1.1.1
```

Platform-focused:

```text
tests/unit/platform/platform.test.ts           8 tests PASS
tests/unit/platform/platform-security.test.ts 11 tests PASS
```

CLI smoke (post-fix):

- `platform scan --json <tmpdir>` → JSON object with `findingCount` / `reports`
- `platform firewall-check --json --command 'rm -rf /'` → `decision=block`, `executionResult=not-executed`
- Dashboard `/api/platform` → `200`, `hasSnapshot: true` after scan

Baseline in implementation report (337 tests / 43 files) is superseded by this audit’s verify counts.

---

## 13. Updated limitations

Carry forward implementation report §10, plus:

1. Local dashboard role selection (`?user=`) is **not authentication** and is spoofable on shared hosts.
2. Firewall is **policy evaluation only** — no runtime interception of Cursor/Claude/other agents.
3. Architecture and health graphs are **regex/heuristic**, not AST/call-graph accurate.
4. Test-impact analysis is computed but **not** exposed on CLI/API snapshot surfaces.
5. Prompt-injection detection is pattern-based with explicit false-positive warnings — not complete.
6. Platform store path APIs are now confined; callers must keep using store helpers (do not reintroduce raw joins).
7. Nested CLI commands must use `optsWithGlobals()` when root scan flags overlap (`--json`, etc.).
8. Report artifacts on disk may contain finding evidence snippets — treat `.agentdoctor/` as sensitive.
9. Malformed local policy JSON falls back to defaults (not deny-all).
10. Still no cloud IdP, SQL warehouse, PDF reports, or hosted multi-page dashboard.

---

## 14. Final release-readiness assessment

| Question                                                 | Answer                                                                          |
| -------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Is AgentDoctor 2.0 platform real code?                   | **Yes**                                                                         |
| Do claimed modules mostly exist and run?                 | **Yes (MVP)**                                                                   |
| Were security controls fully trustworthy as claimed?     | **No — several were broken; critical store/session issues fixed in this audit** |
| Ready to publish npm `2.0.0` as enterprise platform?     | **No**                                                                          |
| Ready for local developer preview / unreleased mainline? | **Yes**, with updated limitations                                               |
| Commit/push/tag/publish performed?                       | **No** (per instructions)                                                       |

**Bottom line:** Treat AgentDoctor 2.0 as a **solid local intelligence + evaluate-only policy MVP** that now has stronger store/session confinement, working architecture rules, working platform `--json`, and an adversarial security test suite. Do not claim runtime agent firewalling, real RBAC, or complete test-impact productization until those gaps are closed.
