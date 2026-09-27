# AGENTDOCTOR 3.0.0 — FINAL FORENSIC ZERO-TRUST CLOSURE

**Updated:** 2026-09-27T12:00:00+05:30
**Commit baseline:** `c21faf1fbc4d56869b965783cebc5cf0f50ac834` (detached HEAD + remediation tree)
**Package:** 3.0.0 (not bumped)
**OWNERSHIP_BOUNDARY_VERSION:** **4**
**RELEASE_ACTIONS_PERFORMED:** NONE

**FINAL_VERDICT: ZERO_TRUST_VERIFIED**

Green `npm run verify` is necessary and **not** sufficient alone; this verdict requires the CLI, dashboard, independent hostile, MCP, provider, and ownership matrices enumerated below — all **PASS** in this closure.

---

## 1. Repository state

| Field                       | Value                                                  |
| --------------------------- | ------------------------------------------------------ |
| Path                        | `/Applications/XAMPP/xamppfiles/htdocs/AgentDoctor`    |
| HEAD                        | `c21faf1` detached + dirty remediation tree            |
| Version                     | 3.0.0                                                  |
| Tag                         | `v3.0.0` exists historically; not created this session |
| Publish / push / tag / bump | **NONE**                                               |

---

## 2. Verification counts (this pass)

| Suite                            | Result                                                                                                      |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `npm run verify`                 | **PASS**                                                                                                    |
| Main vitest                      | **140 files / 666 tests**                                                                                   |
| CLI certification matrix         | **PASS** (76 tops / 123 leaves; help matrix; `$HOME` denial; ask adversarial entrypoint; what-if ownership) |
| Dashboard certification matrix   | **PASS** (34 routes inventory; hostile matrix; stale twin/brain/graph; what-if 400; chat ask-only)          |
| Independent hostile NEW-1..NEW-7 | **PASS** (`tests/unit/project/independent-hostile-pass.test.ts`)                                            |
| MCP STDIO transport forge        | PASS                                                                                                        |
| Deterministic local provider E2E | PASS                                                                                                        |
| Symlink hostile fixture          | PASS                                                                                                        |
| Clean npm tarball install        | PASS                                                                                                        |

Supporting inventories: `AGENTDOCTOR_3_0_CLI_COMMAND_INVENTORY.md`, `AGENTDOCTOR_3_0_DASHBOARD_ROUTE_INVENTORY.md`.

---

## 3. Yesterday → today false-confidence reconciliation

Claims that were **overconfident yesterday** (2026-09-26 / early 2026-09-27) versus **evidence-backed status today**:

| Prior claim / inference              | Evidence used then           | Actually tested then    | NOT tested then                           | Today (2026-09-27)                                                               |
| ------------------------------------ | ---------------------------- | ----------------------- | ----------------------------------------- | -------------------------------------------------------------------------------- |
| Green verify ≈ certification         | suite green                  | unit/integration health | full CLI leaf × foreign-path matrix       | **PASS** — exhaustive CLI matrix (76/123)                                        |
| CLI “home safe”                      | scan/fix/verify only         | 3 commands              | dna/map/graph/dashboard/… leaves          | **PASS** — `resolveCliProjectRoot` on intelligence leaves + matrix               |
| Dashboard hostile coverage           | sampled routes               | contamination APIs      | full 34-route inventory + hash routes     | **PASS** — dashboard certification matrix                                        |
| what-if path safety                  | containment / escape helpers | lexical in some paths   | ownership + symlink private target        | **PASS** — `assertOwnedWhatIfTarget` (NEW-1, NEW-7)                              |
| Agent write authority smuggling      | unit helpers                 | execute/write units     | dashboard chat body forge                 | **PASS** — NEW-4 ask-only / deny smuggle                                         |
| Stale graph trusted as foreign truth | stamped index on rebuild     | rebuild path            | missing `ownershipBoundaryVersion` served | **PASS** — NEW-6                                                                 |
| ZERO TRUST VERIFIED / RELEASE READY  | green verify + partial docs  | suite health            | CLI/Dashboard PARTIAL gates               | **ZERO_TRUST_VERIFIED** — gates closed; **RELEASE_BLOCKERS=1** (dirty tree only) |
| Symlink alias → `.private` VERIFIED  | lexical relativeHint         | partial                 | realpath ownership                        | **PASS** — OWNERSHIP_BOUNDARY_VERSION=4 (prior fix retained)                     |

See also: `AGENTDOCTOR_3_0_VERIFICATION_METHODOLOGY_AUDIT.md`.

---

## 4. Defects found and closed in this arc

| ID      | Sev | Issue                                       | Fix                                                         | Regression                                            | Status     |
| ------- | --- | ------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------- | ---------- |
| ZT-C-01 | P0  | Symlink alias laundered ownership           | Realpath-relative classification; boundary v4               | `symlink-hostile.test.ts`                             | **FIXED**  |
| ZT-C-02 | P1  | Broad-root / `$HOME` on intelligence CLI    | `src/cli/safe-root.ts` + wiring                             | CLI certification matrix, `home-scan-refusal.test.ts` | **FIXED**  |
| ZT-C-05 | P1  | what-if accepted non-owned / escape targets | `assertOwnedWhatIfTarget` in `src/product/whatif/engine.ts` | NEW-1, NEW-7, dashboard what-if 400                   | **FIXED**  |
| ZT-C-03 | —   | MCP transport forge missing                 | STDIO forge test                                            | `mcp-transport-adversarial.test.ts`                   | **CLOSED** |
| ZT-C-04 | —   | Provider prompt-injection E2E missing       | Local adversarial HTTP provider                             | `provider-adversarial-e2e.test.ts`                    | **CLOSED** |

**OPEN_P0=0**, **OPEN_P1=0**, **OPEN_P2_SECURITY=0**.

---

## 5. Independent hostile cases (NEW-1..NEW-7)

| Case  | Intent                                                                         | Result |
| ----- | ------------------------------------------------------------------------------ | ------ |
| NEW-1 | what-if lexical escape `src/../.private` denied                                | PASS   |
| NEW-2 | symlink alias under `src/` realpath to `.private` not VERIFIED context         | PASS   |
| NEW-3 | dashboard double-encoded traversal and null-byte path denied                   | PASS   |
| NEW-4 | dashboard chat body cannot smuggle approved/write authority                    | PASS   |
| NEW-5 | agent `create_file` into ProjectB absolute path denied; zero mutation          | PASS   |
| NEW-6 | stale graph index missing `ownershipBoundaryVersion` not trusted foreign truth | PASS   |
| NEW-7 | dashboard what-if symlink-to-private target denied                             | PASS   |

---

## 6. Security / ownership / MCP / provider matrices (summary)

- **Ownership / symlink / nested:** Hostile markers excluded after realpath fix; nested `.git` denied; symlink to foreign/private denied.
- **MCP JSON-RPC STDIO:** Real `agentdoctor mcp --root <fixture>` forge — private/OS/traversal reads and forged writes **DENY**; owned read **ALLOW**.
- **Deterministic local provider E2E:** Adversarial `/v1/chat/completions` → runtime; malicious tool calls fail closed.
- **CLI:** All tops `--help`; path leaves refuse `$HOME` and foreign roots; ask adversarial entrypoint; what-if ownership enforced.
- **Dashboard:** 34 routes inventoried; hostile matrix; stale twin/brain/graph handling; what-if returns 400 on bad targets; chat ask-only.

---

## 7. Remaining limitations (non-security)

1. **Live vendor LLMs** — EXTERNAL; certified path is deterministic local adversarial provider.
2. **Knowledge shallow docs/ readdir** — product scope limitation (not OPEN_P2_SECURITY).
3. Working tree remains **dirty / uncommitted** — human review required before publish.

---

## 8. Release blockers

| #   | Blocker                                                           |
| --- | ----------------------------------------------------------------- |
| 1   | Uncommitted remediation must be human-reviewed before any publish |

**RELEASE_BLOCKERS=1**

Certification verdict is **ZERO_TRUST_VERIFIED**; release **engineering** is blocked only on dirty-tree review, not on open P0/P1 security defects.

---

## 9. Gate checklist

| Gate                        | Status                             |
| --------------------------- | ---------------------------------- |
| npm verify                  | PASS                               |
| OPEN_P0                     | 0                                  |
| OPEN_P1                     | 0                                  |
| OPEN_P2_SECURITY            | 0                                  |
| OWNERSHIP                   | PASS                               |
| AGENT_FILE_SECURITY         | PASS                               |
| MCP_TRANSPORT               | PASS                               |
| PROMPT_INJECTION_E2E        | PASS (deterministic local)         |
| STALE_STATE                 | PASS                               |
| GRAPH_CACHE                 | PASS                               |
| TWIN                        | PASS                               |
| PROJECT_CHAT                | PASS                               |
| CLI                         | **PASS**                           |
| DASHBOARD                   | **PASS**                           |
| SYMLINK                     | PASS                               |
| NESTED_REPO                 | PASS                               |
| MONOREPO                    | PASS (prior hostile)               |
| PERFORMANCE                 | PASS (prior synthetic)             |
| DOCUMENTATION               | PASS (public docs avoid overclaim) |
| CLEAN_INSTALL               | PASS                               |
| INDEPENDENT_HOSTILE_NEW_1_7 | PASS                               |

---

## 10. Machine summary

```
AGENTDOCTOR_3_0_ZERO_TRUST:
VERSION=3.0.0
BASELINE=c21faf1
OWNERSHIP_BOUNDARY_VERSION=4
VERIFY=PASS
VERIFY_FILES=140
VERIFY_TESTS=666
OWNERSHIP=PASS
AGENT_FILE_SECURITY=PASS
MCP_TRANSPORT=PASS
PROMPT_INJECTION_E2E=PASS
STALE_STATE=PASS
GRAPH_CACHE=PASS
TWIN=PASS
PROJECT_CHAT=PASS
CLI=PASS
CLI_TOPS=76
CLI_LEAVES=123
DASHBOARD=PASS
DASHBOARD_ROUTES=34
INDEPENDENT_HOSTILE_NEW_1_7=PASS
SYMLINK=PASS
NESTED_REPO=PASS
PERFORMANCE=PASS
DOCUMENTATION=PASS
CLEAN_INSTALL=PASS
OPEN_P0=0
OPEN_P1=0
OPEN_P2_SECURITY=0
RELEASE_BLOCKERS=1
RELEASE_ACTIONS_PERFORMED=NONE
FINAL_VERDICT=ZERO_TRUST_VERIFIED
```
