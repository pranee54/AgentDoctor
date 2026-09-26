# AgentDoctor 2.0 — Security Test Report (Deep Validation)

**Package:** `2.0.0`
**Evidence date:** 2026-09-21

## Task 1 — Path traversal

| Field                | Record                                                                                                                                                    |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Objective            | Ensure MCP `dependency_lookup` and dashboard `/api/v2/*` reject traversal / absolute / encoded / null-byte / outside-root targets without leaking secrets |
| Procedure            | Vitest `tests/unit/security/path-traversal-deep.test.ts` against temp repo + live dashboard                                                               |
| Payloads             | `../`, `../../etc/passwd`, absolute `/etc/passwd`, Windows `C:\...`, `%2e%2e%2f...`, null-byte hybrid, `....//` forms                                     |
| Actual result        | Hostile MCP targets return `ok:false` + `path_escape`/`invalid_argument`; dashboard hostile URLs return **400**; valid `/api/v2/graph` still **200**      |
| Evidence             | Test PASS after hardening; error messages do not include outside absolute paths                                                                           |
| Pass/fail            | **PASS**                                                                                                                                                  |
| Security impact      | Prevents path-escape probing via MCP/API; closes under-validated `..` resolve trick                                                                       |
| Regression           | `tests/unit/security/path-traversal-deep.test.ts`                                                                                                         |
| Remaining limitation | Dashboard does not accept file path query params today; continued fuzzing recommended                                                                     |

## Task 5 — Enforcement honesty

| Field                | Record                                                                                                                                                                                                        |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Objective            | Distinguish policy evaluation vs AD-controlled runner; `blocked-by-enforcement` only when runner refuses execution                                                                                            |
| Procedure            | `tests/unit/enforcement/honesty-deep.test.ts`                                                                                                                                                                 |
| Cases                | `rm -rf` block; `npm test` allow; `git push --force` require-approval; `executeIfAllowed` still not-executed                                                                                                  |
| Actual result        | `evaluateAgentAction` always `executionResult: "not-executed"`; runner sets `blocked-by-enforcement` **only** when decision is block/deny-network; allow/approval remain `not-executed` with `enforced:false` |
| Pass/fail            | **PASS**                                                                                                                                                                                                      |
| Security impact      | Prevents advertising evaluate-only firewall as runtime interception                                                                                                                                           |
| Regression           | `tests/unit/enforcement/honesty-deep.test.ts`                                                                                                                                                                 |
| Remaining limitation | Runner still does not spawn allowed commands even with `executeIfAllowed`                                                                                                                                     |

## Task 6 — Symlink escape + secret redaction

| Field                | Record                                                                                                                                                                  |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Objective            | Symlinks outside repo / loops must not leak; secrets redacted from exports and API samples                                                                              |
| Procedure            | `tests/unit/security/symlink-secrets-deep.test.ts`                                                                                                                      |
| Setup                | Dir + file symlinks to outside `secret.ts`; symlink loop dirs; `.env`, private key file, bearer/password patterns                                                       |
| Actual result        | AST walker skips symlinks (no secret value in graph JSON); findings export redacts bearer/password/api_key; `/api/v2/graph` body does not include `.env` / key material |
| Pass/fail            | **PASS**                                                                                                                                                                |
| Security impact      | Reduces symlink-based source exfil and secret echo in API samples                                                                                                       |
| Regression           | `tests/unit/security/symlink-secrets-deep.test.ts`                                                                                                                      |
| Remaining limitation | Redaction is heuristic; novel secret formats may miss; graph labels are not a full DLP system                                                                           |

## Task 3 note (knowledge — security-adjacent)

Draft knowledge cannot be treated as authority via `retrieveAuthoritative` / `knowledge_retrieve` (see test report). Regression: `tests/unit/knowledge/abstention-deep.test.ts`.
