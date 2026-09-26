# FORMAL 3.0 AUDIT

**Date:** 2026-09-26  
**Package version:** 2.1.0 (unchanged)  
**Method:** CODE > TEST EXECUTION > FIXTURES > CLI/MCP/API > DOCUMENTATION  
**Release actions:** NOT PERFORMED

---

## Executive Summary

Formal audit of AgentDoctor **local 3.0 core** after zero-gap correction.

| Metric                              | Value                                              |
| ----------------------------------- | -------------------------------------------------- |
| `npm run verify`                    | **PASS**                                           |
| Tests                               | **626 passed / 128 files / 0 failing / 0 skipped** |
| Core FAIL                           | **0**                                              |
| Core PARTIAL (undeclared)           | **0**                                              |
| EXTERNAL (honest boundaries)        | Listed below                                       |
| Package bump / publish / push / tag | **NOT PERFORMED**                                  |

**Overall local-core status: PASS — READY FOR FORMAL RELEASE AUDIT (not released).**

---

## Exact Test Results

| Command                | Result        |
| ---------------------- | ------------- |
| `npm run typecheck`    | PASS          |
| `npm run lint`         | PASS          |
| `npm run format:check` | PASS          |
| `npm test`             | **626 / 626** |
| `npm run build`        | PASS          |
| `npm run verify`       | PASS          |

Notable new/expanded suites:

- `tests/unit/product/approval-session-security.test.ts`
- `tests/e2e/forensic-readonly.test.ts`
- `tests/e2e/runtime-turn-tools.test.ts`
- `tests/unit/product/cross-project-memory.test.ts`
- `fixtures/eval/prompt-injection/`
- Existing E2E: password-reset, student, what-if, incident, self-check

---

## Capability Audit (local core)

Statuses used: **PASS** | **EXTERNAL** | **NOT_APPLICABLE**

| Capability                     | Entry points                | Surfaces     | Tests                     | Audit                              |
| ------------------------------ | --------------------------- | ------------ | ------------------------- | ---------------------------------- |
| Project discovery / start      | `product/discovery`         | CLI start    | discovery-dna             | PASS                               |
| Project DNA                    | `product/dna`               | CLI/MCP/API  | discovery-dna             | PASS                               |
| AST TS/JS                      | `languages/typescript`      | graph        | graph/language            | PASS                               |
| AST Python/PHP                 | host adapters               | graph enrich | enrich                    | PASS (host optional)               |
| AST Go/Java/Kotlin/Rust/Dart   | line scanners               | enrich       | multi-lang-parse          | PASS at defined level              |
| Graph + imports                | `intelligence/graph`        | CLI/MCP/API  | graph/import              | PASS                               |
| Dependencies + lockfiles       | `product/deps`              | CLI/API      | deps/lockfiles            | PASS                               |
| Search TF-IDF                  | `product/search`            | CLI/API/MCP  | search-index              | PASS                               |
| Requirements                   | `product/requirements`      | CLI/API      | requirements-trace        | PASS                               |
| API Doctor (+ static GraphQL)  | `product/api`               | CLI/API      | api-doctor                | PASS                               |
| Database Doctor                | `product/database`          | CLI/API      | database-doctor           | PASS                               |
| Event Doctor                   | `product/events`            | CLI/API      | events-doctor             | PASS                               |
| Feature intelligence           | `product/features`          | CLI/API      | feature-intelligence      | PASS                               |
| Project Brain                  | `core/understanding/brain`  | CLI/MCP/API  | understanding/mcp         | PASS                               |
| Project Chat (+ deterministic) | `agent/chat`                | CLI/MCP/API  | chat + e2e                | PASS                               |
| AgentRuntime.runTurn tools     | `agent/runtime`             | agent        | runtime-turn-tools e2e    | PASS                               |
| Coding loop + roles            | `agent/loop`, `roles`       | CLI          | rc/roles                  | PASS                               |
| Approval grants                | `product/approval/session`  | MCP/CLI      | approval-session-security | PASS                               |
| Test Brain                     | `product/testbrain`         | CLI          | test-brain                | PASS (no mutation testing claimed) |
| Security Doctor                | `product/security`          | CLI/API      | security-doctor           | PASS                               |
| Privacy Doctor                 | `product/privacy`           | CLI          | privacy-doctor            | PASS                               |
| Digital Twin + store           | `product/twin`              | CLI/API      | digital-twin              | PASS                               |
| What-if                        | `product/whatif`            | CLI/MCP/API  | whatif + e2e              | PASS                               |
| Decisions / evolution / memory | product modules             | CLI/API      | unit + cross-project      | PASS                               |
| Forensic read-only             | forensic + executeAgentTool | CLI/API/env  | forensic-readonly e2e     | PASS                               |
| Ops infra / incident           | `product/ops`               | CLI/API      | infra/incident + e2e      | PASS                               |
| Organization                   | `product/org`               | CLI          | org-model                 | PASS                               |
| Dashboard                      | `dashboard/server`          | SPA+APIs     | dashboard-product-routes  | PASS                               |
| MCP                            | brain/intel/agent           | mcp CLI      | mcp + approval tests      | PASS                               |
| Evaluation Lab                 | `product/eval` + fixtures   | CLI          | eval-lab                  | PASS                               |
| Self-diagnosis                 | `product/self`              | CLI          | self-diagnose + e2e       | PASS                               |
| 2.1 foundation regression      | scan/fix/verify/…           | CLI          | full suite                | PASS                               |

---

## Security Audit

| Control                                         | Result | Evidence                                    |
| ----------------------------------------------- | ------ | ------------------------------------------- |
| Bare `approved:true` rejected                   | PASS   | MCP + consumeApprovalGrant                  |
| planHash binds path+content+action              | PASS   | hashFileWritePlan + MCP tests               |
| Forged / expired / consumed / wrong-root tokens | PASS   | approval-session-security                   |
| Action mismatch / path scope / no `*`           | PASS   | approval-session-security                   |
| Content tamper after grant                      | PASS   | agent-mcp planHash test                     |
| Path traversal / symlink on writes              | PASS   | rc-dashboard-mcp                            |
| Forensic blocks writes                          | PASS   | forensic-readonly e2e                       |
| Cross-project memory isolation                  | PASS   | cross-project-memory                        |
| Prompt-injection treated as DATA                | PASS   | eval fixture + P8 model loop                |
| Secrets redacted in tool output                 | PASS   | executeAgentTool redactDeep + secrets tests |

---

## E2E Results

| Workflow             | File                                     | Result |
| -------------------- | ---------------------------------------- | ------ |
| Password-reset agent | `tests/e2e/password-reset-agent.test.ts` | PASS   |
| Student learn        | `tests/e2e/student-learn.test.ts`        | PASS   |
| What-if              | `tests/e2e/what-if-service.test.ts`      | PASS   |
| Incident             | `tests/e2e/incident-flow.test.ts`        | PASS   |
| Self-check           | `tests/e2e/self-check.test.ts`           | PASS   |
| Forensic read-only   | `tests/e2e/forensic-readonly.test.ts`    | PASS   |
| runTurn tools        | `tests/e2e/runtime-turn-tools.test.ts`   | PASS   |

---

## Evaluation Lab Results

Fixtures under `fixtures/eval/` include: minimal-ts, rest-api, prisma-db, queue-bull, insecure-sample, python-flask, php-laravel-lite, monorepo-lite, infra-compose, **prompt-injection**.

`runEvalLab` exercises invariants (detect/analyze — does not execute hostile payloads).

---

## Regression Results

Full `npm test` includes 2.1 foundation suites (scan/fix/verify/policy/runner/workspace/paths/secrets/MCP/Brain). **No regressions observed** in verify run (626/626).

---

## External Dependencies

Allowed EXTERNAL (local adapters/fixtures remain useful):

- Live Kubernetes / APM / brokers / databases
- Neural embeddings / commercial SAST
- Enterprise IdP / browser OAuth
- Full native language compilers beyond line scanners
- Optional LLM providers
- Live GraphQL gateway introspection

---

## Remaining Limitations

See `docs/FINAL_LIMITATIONS.md` (reconciled 2026-09-26). Key honesty:

- Identifier-based calls ≠ full semantic type binding
- GraphQL static only
- Twin local incremental ≠ live runtime mesh
- Privacy ≠ legal compliance

---

## Known Non-Goals

- Claiming commercial SAST equivalence
- Claiming legal/privacy compliance
- Claiming compiler-grade analysis for every language
- Releasing/publishing from this audit

---

## Documentation Consistency

| Document                                     | Status                               |
| -------------------------------------------- | ------------------------------------ |
| Stale claim “runTurn does not execute tools” | **REMOVED** / corrected              |
| Approval wildcard / bare approved            | **HARDENED** + documented            |
| Test Brain mutation testing                  | **NOT CLAIMED**                      |
| FINAL_3_0_CAPABILITY_MATRIX                  | Aligned to defined capability levels |
| FINAL_COMPLETION_REPORT                      | Aligned to 626 tests                 |

---

## Final Core Status

```
TOTAL CORE CAPABILITIES AUDITED: see matrix above
PASS: all local-core rows
FAIL: 0
PARTIAL (undeclared / dishonest): 0
EXTERNAL: only genuine outside systems
NOT_APPLICABLE: none critical
```

**AgentDoctor 3.0 Local Core = FORMALLY AUDITED PASS**

Freeze: no version bump, no publish, no push, no tag.
