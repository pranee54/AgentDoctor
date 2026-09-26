# AgentDoctor 2.0 — Post-Audit Hardening Report

**Date:** 2026-09-21
**Package version:** `2.0.0` (release cut)
**Inputs:** `AGENTDOCTOR_2.0_DEEP_AUDIT_REPORT.md` + current `src/platform/**`
**Git / publish:** no commit, push, tag, publish, deploy, or version bump

---

## 1. Changes implemented

### Priority 1 — Test-impact productization

- Dedicated CLI: `agentdoctor platform test-impact`
- Snapshot field `testImpact` on platform scan
- First-class report: `.agentdoctor/platform/reports/test-impact.json`
- `/api/platform` exposes test-impact summary (+ samples for export roles)
- Human + JSON CLI output with affected tests, related modules, missing-test warnings, confidence/reasoning
- Graceful non-git behavior (`gitAvailable: false`)

### Priority 2 — Action Policy Evaluator hardening

- Renamed user-facing surface to **Action Policy Evaluator** (`policy-check`; `firewall-check` alias)
- Built-in blocks: recursive `rm`, disk format/`dd`, fork bombs, deploy/publish, network exfil patterns
- Expanded secret-path matching
- Optional `shellAllowlist` (default includes common safe test/lint commands)
- Policy validation + optional `--fail-closed` (invalid policy → deny-all)
- Default mode still falls back to documented defaults after invalid JSON
- Every verdict includes evaluate-only notice; `executionResult` always `not-executed`

### Priority 3 — Evidence redaction

- `src/platform/security/redact.ts` covers API keys, Bearer, JWT, private keys, connection strings, password/`api_key` assignments, env exports, cloud JSON creds
- Applied in context-security evidence, scan snapshot findings, all report formats, and API sample sanitization
- HTML escape strengthened (`"`, `'`)

### Priority 4 — Coverage

- New suite `tests/unit/platform/post-audit-hardening.test.ts` (16 tests) covering knowledge, refactor, time-machine, reports/XSS, policy allow/default/fail-closed, oversized files, concurrent store writes, dashboard POST + host binding, redaction patterns, test-impact CLI/API

### Priority 5 — Dashboard boundary

- Default loopback only (`127.0.0.1` / `::1` / `localhost`)
- Non-loopback refused unless `allowNonLoopback` / `--allow-non-loopback`
- Status + HTML notice: `?user=` is not authentication; evaluate-only policy wording

### Priority 6 — Honest UX / naming

- CLI help, dashboard, README-adjacent docs (`docs/reference/architecture.md`, `docs/features/dashboard.md`, `docs/features/v2-features.md`), implementation report, changelog updated
- No claims of Cursor/Claude interception, enterprise RBAC, cloud SSO, or complete prompt-injection prevention

---

## 2. Exact files changed

| Area             | Files                                                                                                                                                      |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Test-impact      | `src/platform/test-impact/analyze.ts`, `src/platform/types.ts`, `src/platform/index.ts`                                                                    |
| Policy evaluator | `src/platform/firewall/evaluate.ts`                                                                                                                        |
| Redaction        | `src/platform/security/redact.ts` (new), `src/platform/context-security/analyze.ts`, `src/platform/reports/export.ts`                                      |
| CLI              | `src/cli/commands/platform.ts`, `src/cli/program.ts`, `src/cli/commands/v2.ts`                                                                             |
| Dashboard        | `src/dashboard/server.ts`                                                                                                                                  |
| Readiness copy   | `src/platform/readiness/scorecard.ts`                                                                                                                      |
| Tests            | `tests/unit/platform/post-audit-hardening.test.ts` (new)                                                                                                   |
| Docs             | `CHANGELOG.md`, `docs/reference/architecture.md`, `docs/features/dashboard.md`, `docs/features/v2-features.md`, `AGENTDOCTOR_2.0_IMPLEMENTATION_REPORT.md` |

---

## 3. Security improvements

1. Broader destructive / exfil / deploy pattern detection (still evaluate-only)
2. Fail-closed path for malformed policies
3. Shell allowlist reduces silent “default allow” for arbitrary shell when allowlist configured
4. Secret redaction before persistence/API
5. Dashboard cannot bind off-loopback without explicit unsafe flag
6. Honest evaluate-only messaging on every policy decision

---

## 4. Test-impact integration details

Flow:

1. `analyzeTestImpact(root)` uses `analyzeChanges({ impact: true })`
2. Maps changed files → candidate tests; checks filesystem existence
3. Emits `missingTestWarnings` when no counterpart exists
4. Collects `relatedModules` from path segments / Brain attribution when present
5. `runPlatformScan` persists snapshot + `reports/test-impact.json`
6. CLI `platform test-impact` and `/api/platform.testImpact` surface the same data

Does **not** execute tests or claim pass/fail.

---

## 5. Redaction behavior

- Marker: `[REDACTED]`
- Evidence details capped (~160 chars) with “(secrets redacted)” when patterns hit
- Applied before JSON/CSV/MD/HTML/SARIF writes and before API sample findings are derived from sanitized copies

---

## 6. Dashboard security behavior

| Scenario                      | Result                            |
| ----------------------------- | --------------------------------- |
| Default host                  | `127.0.0.1`                       |
| `--host 0.0.0.0` without flag | Error / refuse                    |
| `--allow-non-loopback`        | Binds + stderr warning            |
| POST any path                 | `405`                             |
| `?user=`                      | Permission matrix only — not auth |

---

## 7. Test results

```text
npm run typecheck     PASS
npm run lint          PASS
npm run format:check  PASS
npm test              PASS
npm run build         PASS
npm run verify        PASS

Test Files  45 passed (45)
Tests       365 passed (365)
Package     2.0.0
```

Platform suites: `platform.test.ts`, `platform-security.test.ts`, `post-audit-hardening.test.ts`.

CLI smoke (post-build): `platform scan --json`, `test-impact --json`, `policy-check` / `firewall-check`, `demo-session`, dashboard `/api/platform`, non-loopback refusal — exercised successfully.

---

## 8. Remaining limitations

1. No runtime interception of IDE agents (Cursor/Claude/etc.)
2. Local roles remain spoofable; not SSO/RBAC
3. Test-impact is naming/path heuristic, not coverage-DB backed
4. Prompt-injection detection remains pattern-based
5. Policy regexes are not a complete malware catalog
6. Graph/health remain regex heuristics, not full AST
7. Nested temp fixtures inside this repo inherit parent git unless isolated outside the work tree

---

## 9. Features still not implemented

- Cloud IdP / enterprise multi-tenant auth
- Hosted multi-page React dashboard
- Real-time agent tool hooks
- PDF reports / SQL warehouse
- Automatic PR/webhook receivers
- Perfect secret detection / prompt-injection prevention
- Applying refactors or executing recommended tests

---

## 10. Commands for manual verification

```bash
npm run verify

npx agentdoctor platform scan --json .
npx agentdoctor platform test-impact --json .
npx agentdoctor platform policy-check --json --command 'rm -rf .'
npx agentdoctor platform policy-check --json --command 'npm test'
npx agentdoctor platform policy-check --fail-closed --command 'npm test'   # with broken policy file
npx agentdoctor platform demo-session --json .
npx agentdoctor dashboard .                    # loopback
# expect refusal:
npx agentdoctor dashboard . --host 0.0.0.0
# unsafe opt-in:
npx agentdoctor dashboard . --host 0.0.0.0 --allow-non-loopback
```

Inspect `.agentdoctor/platform/reports/test-impact.json` and `findings.*` after scan.

---

## Release-readiness

**Local MVP / preview:** yes (hardened).
**Enterprise firewall / RBAC / interception product:** no.
**npm 2.0.0:** version cut applied; publish is a separate release step.
