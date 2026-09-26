# AgentDoctor 2.0 — Deep Validation Report

**Date:** 2026-09-21
**Package version:** `2.0.0`
**Scope:** Six sequential deep-validation tasks after feature-validation
**Rules followed:** No fabricated results; no version bump; no commit/push/publish

## Summary

| Task                   | Status                     | Key outcome                                           |
| ---------------------- | -------------------------- | ----------------------------------------------------- |
| 1 Path traversal       | **PASS** (after hardening) | Defects fixed; regression tests added                 |
| 2 Large-repo AST perf  | **MEASURED**               | 120 TS files cold 332ms / repeat 135ms (synthetic)    |
| 3 Knowledge abstention | **PASS**                   | Drafts abstain; approval changes result               |
| 4 Combined MCP STDIO   | **PASS**                   | Full client session against `agentdoctor mcp`         |
| 5 Enforcement honesty  | **PASS**                   | `blocked-by-enforcement` only on AD runner block path |
| 6 Symlink + secrets    | **PASS**                   | Symlinks skipped; redaction verified                  |

## Task details

See companion reports:

- `AGENTDOCTOR_2.0_SECURITY_TEST_REPORT.md` (tasks 1, 5, 6)
- `AGENTDOCTOR_2.0_PERFORMANCE_TEST_REPORT.md` (task 2)
- Knowledge + MCP coverage also in `AGENTDOCTOR_2.0_TEST_REPORT.md`

## Defects discovered and fixed in this phase

1. **MCP `dependency_lookup` incomplete path checks** — only rejected literal `..` substring; absolute / encoded / `src/x/../../` forms under-validated.
   - Fix: `src/mcp/intelligence/path-safety.ts` + handler returns `path_escape` without leaking outside paths.
   - Regression: `tests/unit/security/path-traversal-deep.test.ts`

2. **Dashboard URL traversal** — normalized pathnames could drop `..` before checks.
   - Fix: inspect raw `req.url` for `..` / `%2e%2e` before routing; 400 `invalid path`.
   - Regression: same path-traversal test file

3. **Graph API sample labels** — now run through `redactSecrets` before response.
   - Fix: `redactGraphSamples` in dashboard server
   - Regression: `tests/unit/security/symlink-secrets-deep.test.ts`

## Honesty notes

- Performance numbers are from a **synthetic** 120-file fixture on one machine — **not** a scalability certification.
- No capability upgraded to **Complete and verified / 5/5** solely from this phase.
- `executeIfAllowed: true` still does **not** execute commands in this release (`not-executed`).

## Final verification

```text
npm run verify → PASS
53 test files / 394 tests PASS
package version → 2.0.0
```
