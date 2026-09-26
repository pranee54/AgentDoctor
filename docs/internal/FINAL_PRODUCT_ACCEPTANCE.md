# AgentDoctor 3.0.0

# Final Product Acceptance

**Date:** 2026-09-26  
**Package version under test:** **2.1.0** (not bumped; 3.0.0 = capability scope / future release identity)  
**Method:** Disposable real project + clean npm tarball install + persona journeys + security/MCP/dashboard + regression  
**Release actions:** NOT PERFORMED

Disposable project: `campus-notes` (Node HTTP notes API with auth, DB layer, tests, Git, dependency) under `/tmp/ad-accept-*/campus-notes`.  
Package under test: `@praneeth_54/agentdoctor@2.1.0` installed from local `npm pack` into an empty directory (not the repo `node_modules`).

---

## 1. Executive Result

| Gate                                                                                                | Result                                                                         |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Critical user journeys (discover → understand → search → impact → plan → approve → edit → evidence) | **PASS**                                                                       |
| P0 blockers                                                                                         | **0**                                                                          |
| P1 blockers                                                                                         | **0** (1 P1 fixed during acceptance: deterministic chat path surfacing)        |
| Clean package install                                                                               | **PASS**                                                                       |
| MCP / dashboard / approval / path / forensic                                                        | **PASS**                                                                       |
| Regression `npm run verify`                                                                         | **PASS — 627/627**                                                             |
| Recommendation                                                                                      | **RELEASE READY** (local-core; version still 2.1.0 until explicit release cut) |

---

## 2. User Personas Tested

| Persona             | Journey focus                                                         | Result                             |
| ------------------- | --------------------------------------------------------------------- | ---------------------------------- |
| A Beginner/Student  | `start`, `learn`, `--viva`, `--docs`, deterministic `ask`             | **PASS**                           |
| B Developer         | DNA, graph, map, deps, search, what-if, API/test-brain                | **PASS**                           |
| C AI-assisted       | `plan`, `agent --approve --apply`, MCP tools, no bare `approved:true` | **PASS**                           |
| D Security/Reviewer | security-doctor, secrets redaction, forensic mode, path escape        | **PASS**                           |
| E Team/Owner        | twin, org catalog, memory isolation A/B, change/evidence/proof        | **PASS** (org local-empty catalog) |

---

## 3. Project Discovery

| Check                               | Result   | Evidence                                                            |
| ----------------------------------- | -------- | ------------------------------------------------------------------- |
| `agentdoctor start` on campus-notes | **PASS** | fingerprint, languages=javascript, frameworks=nodejs, DNA written   |
| Does not assume AgentDoctor repo    | **PASS** | project name `campus-notes`                                         |
| `$HOME` refused                     | **PASS** | “Blocked: Refusing to scan home / Desktop / Downloads / Documents…” |
| Invalid path                        | **PASS** | candidates none                                                     |
| Multi-project parent                | **PASS** | lists candidates; requires `--select`                               |

---

## 4. Project Understanding

| Check              | Result   | Evidence                                                                          |
| ------------------ | -------- | --------------------------------------------------------------------------------- |
| DNA / type / stack | **PASS** | `dna --json` / start output                                                       |
| Graph build        | **PASS** | `graph` → nodes=30+ edges=10 builder=regex                                        |
| Map / deps         | **PASS** | picocolors VERIFIED; lockfile parsed                                              |
| Truth labels       | **PASS** | VERIFIED/INFERRED/UNKNOWN used; no invented endpoints for unsupported route style |

---

## 5. Project Chat

| Check                                     | Result            | Evidence                                                                                   |
| ----------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------ |
| No LLM → deterministic (no fake provider) | **PASS**          | “Deterministic project answer (no LLM)”                                                    |
| Explain my project                        | **PASS**          | graph node/edge summary after P1 fix                                                       |
| Auth / start / DB questions               | **PASS**          | surfaces `src/auth.js`, `src/server.js`, `src/db.js` from graph                            |
| Hallucinated files                        | **PASS**          | unknown questions → UNKNOWN; no invented paths observed                                    |
| Remaining limitation                      | **PASS** (honest) | without LLM, answers stay template+analyzers; file excerpts may still be budget-empty (P2) |

---

## 6. Project Intelligence

| Check                         | Result                    | Evidence                                                                                     |
| ----------------------------- | ------------------------- | -------------------------------------------------------------------------------------------- |
| Search `login`                | **PASS**                  | hits README, `src/auth.js`, `src/server.js`, tests                                           |
| Search nonexistent            | **PASS**                  | completes; no crash                                                                          |
| What-if `src/auth.js`         | **PASS**                  | affected includes `tests/auth.test.js`                                                       |
| API doctor on pathname routes | **PASS** at defined scope | empty endpoints + limitations (regex frameworks only) — not claimed as Express-router invent |
| Test-brain mapping            | **PASS**                  | `src/auth.js` ↔ `tests/auth.test.js`                                                         |

---

## 7. Student Experience

| Check                         | Result   | Evidence                                          |
| ----------------------------- | -------- | ------------------------------------------------- |
| LEARN                         | **PASS** | VERIFIED project/tech/testing for campus-notes    |
| VIVA                          | **PASS** | stack-grounded questions (nodejs/javascript/auth) |
| DOCS                          | **PASS** | generated sections with UNKNOWN where unevidenced |
| BUILD_WITH_ME without approve | **PASS** | plan `awaiting-approval`; no files modified       |

---

## 8. Build With Me

| Check                     | Result   | Evidence                                                                             |
| ------------------------- | -------- | ------------------------------------------------------------------------------------ |
| Plan password reset       | **PASS** | status awaiting-approval; “No files were modified”                                   |
| Apply without `--approve` | **PASS** | “Refusing --apply without --approve”                                                 |
| Apply with `--approve`    | **PASS** | created `docs/reset-notes.md`; evidence+proof; `ENGINEERING_CORRECTNESS_NOT_CLAIMED` |

---

## 9. Coding Agent

| Check                           | Result   | Evidence                                    |
| ------------------------------- | -------- | ------------------------------------------- |
| Plan → approve → write → verify | **PASS** | see §8                                      |
| Path-safe writes                | **PASS** | workspace boundary in verification          |
| Unrestricted shell              | **PASS** | CLI states never exposed                    |
| Limits / runTurn                | **PASS** | covered by E2E `runtime-turn-tools` + suite |

---

## 10. Approval & Safety

| Check                                     | Result   | Evidence                                                  |
| ----------------------------------------- | -------- | --------------------------------------------------------- |
| CLI unapproved apply                      | **PASS** | refused                                                   |
| MCP bare `approved:true`                  | **PASS** | `approval_required` — token required                      |
| Path traversal MCP `../etc/passwd`        | **PASS** | `path_escape`                                             |
| Agent escape write `../../tmp-escape.txt` | **PASS** | no escape file created                                    |
| Approval session matrix                   | **PASS** | unit suite (forged/expired/consumed/wrong hash/resources) |

---

## 11. Security

| Check                        | Result   | Evidence                                                         |
| ---------------------------- | -------- | ---------------------------------------------------------------- |
| Security Doctor fake AWS key | **PASS** | finding `aws-access-key` severity critical; snippet `[REDACTED]` |
| Secrets CLI                  | **PASS** | redacted output                                                  |
| Prompt-injection README      | **PASS** | no env dump; no `pwned.txt`                                      |
| Forensic write               | **PASS** | `AGENTDOCTOR_FORENSIC_MODE=1` → write blocked                    |

---

## 12. Testing

| Check                    | Result             | Evidence            |
| ------------------------ | ------------------ | ------------------- |
| Test discovery / mapping | **PASS**           | test-brain mappings |
| Mutation / flaky         | **NOT APPLICABLE** | not claimed         |

---

## 13. Change Assurance

| Check                        | Result   | Evidence                                           |
| ---------------------------- | -------- | -------------------------------------------------- |
| change analyze / changes     | **PASS** | changeId; modified files listed                    |
| evidence / proof after apply | **PASS** | `HASH_INTEGRITY_VERIFIED`; correctness not claimed |

---

## 14. MCP

| Check                                                       | Result   | Evidence     |
| ----------------------------------------------------------- | -------- | ------------ |
| Clean-install MCP start                                     | **PASS** | 38 tools     |
| dna / search / ask / read / what_if / plan / change_analyze | **PASS** | ok responses |
| Unsafe write / path                                         | **PASS** | rejected     |

---

## 15. Dashboard

| Check                                                                                            | Result   | Evidence                            |
| ------------------------------------------------------------------------------------------------ | -------- | ----------------------------------- |
| Loopback start                                                                                   | **PASS** | HTML 200                            |
| Real APIs (status/dna/search/security/twin/what-if/forensic/graph/deps/map/health/scan/platform) | **PASS** | HTTP 200 live JSON for campus-notes |
| POST `/api/chat`                                                                                 | **PASS** | deterministic answer                |

---

## 16. Digital Twin

| Check             | Result       | Evidence                                |
| ----------------- | ------------ | --------------------------------------- |
| Twin snapshot     | **PASS**     | DNA + generatedAt; git present VERIFIED |
| Live runtime twin | **EXTERNAL** | not claimed                             |

---

## 17. What-If

| Check                 | Result   | Evidence                                     |
| --------------------- | -------- | -------------------------------------------- |
| `what-if src/auth.js` | **PASS** | callers/tests PARTIAL/VERIFIED as documented |

---

## 18. Forensic

| Check         | Result   | Evidence                                    |
| ------------- | -------- | ------------------------------------------- |
| Forensic JSON | **PASS** | git hotspots + brain status; mode read-only |
| Write refusal | **PASS** | forensic mode                               |

---

## 19. Operations

| Check                              | Result       | Evidence                      |
| ---------------------------------- | ------------ | ----------------------------- |
| Infra on campus-notes (no compose) | **PASS**     | empty artifacts + limitations |
| Eval infra-compose fixture         | **PASS**     | eval-lab                      |
| Live K8s/APM                       | **EXTERNAL** |                               |

---

## 20. Organization

| Check                    | Result       | Evidence                                                 |
| ------------------------ | ------------ | -------------------------------------------------------- |
| Local org catalog        | **PASS**     | loads; empty teams; limitations disclose no IdP          |
| Cross-project memory A/B | **PASS**     | Project A ask/memory about B → empty/UNKNOWN; no leakage |
| Enterprise IdP           | **EXTERNAL** |                                                          |

---

## 21. Evaluation Lab

| Check               | Result   | Evidence                                                                                                                                                  |
| ------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Packaged `eval-lab` | **PASS** | fixturesRun: minimal-ts, rest-api, prisma-db, queue-bull, insecure-sample, python-flask, php-laravel-lite, monorepo-lite, infra-compose, prompt-injection |

---

## 22. Self-Diagnosis

| Check                            | Result   | Evidence                                          |
| -------------------------------- | -------- | ------------------------------------------------- |
| `self-check` on AgentDoctor tree | **PASS** | `ok: true`; modules/tests present; no auto-modify |

---

## 23. Clean Package Install

| Check                             | Result   | Evidence       |
| --------------------------------- | -------- | -------------- |
| `npm pack` + install in empty dir | **PASS** | bin `2.1.0`    |
| CLI/MCP/dashboard without repo    | **PASS** | journeys above |

---

## 24. Documentation

| Check                                           | Result   | Evidence                   |
| ----------------------------------------------- | -------- | -------------------------- |
| README install/quickstart/MCP                   | **PASS** | present                    |
| Limitations honest                              | **PASS** | `FINAL_LIMITATIONS.md`     |
| Package still 2.1.0 (3.0 not falsely published) | **PASS** | package.json / `--version` |
| Stale PARTIAL banners in some feature docs      | **P2**   | defer to formal matrix     |

---

## 25. Performance

| Check                  | Result         | Evidence                     |
| ---------------------- | -------------- | ---------------------------- |
| No hangs in journeys   | **PASS**       | CLI/MCP/dashboard responsive |
| Home scan unbounded    | **PASS**       | blocked                      |
| Premature optimization | NOT_APPLICABLE | none performed               |

---

## 26. Security / Secret Review

| Check                            | Result             | Evidence                                    |
| -------------------------------- | ------------------ | ------------------------------------------- |
| Fake secrets in tests only       | **PASS**           | test fixtures assert redaction              |
| No pack of `.env` / credentials  | **PASS**           | pack files = dist+README+LICENSE+CHANGELOG  |
| Working tree dirty with 3.0 work | **PASS** (process) | commit before public release (out of scope) |

---

## 27. Regression

| Command      | Result                                                                |
| ------------ | --------------------------------------------------------------------- |
| typecheck    | PASS                                                                  |
| lint         | PASS                                                                  |
| format:check | PASS                                                                  |
| test         | **627 passed / 627** (was 626; +1 deterministic chat acceptance test) |
| build        | PASS                                                                  |
| verify       | **PASS** (`VERIFY_EXIT:0` with `pipefail`)                            |

---

## 28. Findings

### Fixed during acceptance (was P1)

1. **Deterministic Project Chat** failed to surface known auth/entry/DB paths and treated “Explain my project” as empty overview — fixed in `src/agent/chat/deterministic.ts` + unit coverage.

### Incident during acceptance (P0 narrowly avoided)

2. **excepta fixture deletion** observed mid-session (Gradle/Buildship `.project` interaction / workspace churn). Restored via `git checkout HEAD -- fixtures/excepta`, re-applied marker-only `build.gradle.kts`, confirmed tests green. **Not a product runtime defect**; IDE must not treat fixtures as real Gradle apps.

### P2 / P3

See `docs/POST_3_0_BACKLOG.md`.

---

## 29. Post-3.0 Backlog

Recorded in `docs/POST_3_0_BACKLOG.md`.

---

## 30. Final Acceptance

```
RELEASE READY

AgentDoctor 3.0 local core passes final product acceptance for real-user
journeys on a disposable project via clean package install.

No remaining P0/P1 blockers.

Package version remains 2.1.0 until an explicit 3.0.0 release cut.

Release lock remains held: do not bump, publish, push, tag, or deploy
from this acceptance step alone.
```

**STOP.**
