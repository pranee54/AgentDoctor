# AgentDoctor 3.0.0 — Forensic Audit (Before Fix)

**Audit mode:** zero-trust, repository-as-source-of-truth
**Date:** 2026-09-27
**Package version (unchanged):** `3.0.0` (`package.json`, `src/constants.ts` `PACKAGE_VERSION`)
**Initial test files:** 154 `*.test.ts`
**Method:** live production APIs + direct `dist/` module invocation against this workspace; no trust of prior completion reports.

---

## 1. Repository inventory

### A. Production code

- `src/**` — CLI, dashboard, MCP servers, product intelligence, agent runtime, assurance, platform, discovery, ownership
- Entry: `package.json` bin → `dist/cli/index.js`; exports for MCP/dashboard modules

### B. Test code

- `tests/unit/**`, `tests/integration/**`, understanding/MCP configs (~154 files)

### C–E. Fixtures / validation / generated

- `fixtures/**` — classified non-owned by ownership layer
- `.private/**` — present in this workspace; must never feed current-project intelligence
- `AgentDoctorOS/**` — internal docs tree; non-owned
- `dist/**` — build output

### F–I. Docs / examples / private

- `docs/**`, `README.md`, `CHANGELOG.md`, `docs/internal/**` (prior audits + this file)
- `.cursor/skills/agentdoctor-dashboard-product-design/**`

### Version sources (consistent)

| Source                              | Value |
| ----------------------------------- | ----- |
| `package.json`                      | 3.0.0 |
| `PACKAGE_VERSION`                   | 3.0.0 |
| Dashboard `/api/status` ops version | 3.0.0 |
| CHANGELOG / README install pins     | 3.0.0 |

No 2.1.0 runtime mismatch found in primary version constants.

---

## 2. Architecture map (actual)

```
CLI / Dashboard / MCP
        ↓
detectProject / discoverFiles  ←── ownership (decideDirectoryTraversal)
        ↓
DNA, decisions, deps (mostly ownership-aware)
        ↓
INDEPENDENT WALKERS (P0) → graph AST, platform graph, language enrich, secrets
        ↓
Twin graphSummary / dashboard #graph / MCP graph_* / chat deterministic graph
```

Canonical ownership: `src/project/ownership.ts` + `src/discovery/files.ts`.
**Not all scanners use it.**

---

## 3. Feature inventory (pre-fix truth)

| Area                          | Status                       | Evidence                                                                                          |
| ----------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------- |
| Project discovery + ownership | PARTIAL                      | decisions/DNA use discoverFiles; graph/secrets bypass                                             |
| DNA                           | COMPLETE (local scope)       | `/api/dna` no `.private` contamination                                                            |
| Decisions ledger              | COMPLETE (local scope)       | `/api/decisions` post prior fix: 0 SIGMA ADRs                                                     |
| Deps                          | COMPLETE (local scope)       | `/api/deps` no private path leak in probe                                                         |
| Software map                  | PARTIAL                      | lists `AgentDoctorOS` as VERIFIED top-level dir                                                   |
| Intelligence graph            | BROKEN ownership             | `listTsFiles` + platform walk enter `.private`                                                    |
| Secrets scan                  | BROKEN ownership             | `walkFiles` omits `.private` / nested-git                                                         |
| Search                        | PARTIAL                      | uses detectProject files; “sigma” hits are mostly owned forensic docs mentioning `.private` paths |
| Twin                          | PARTIAL                      | DNA ok; `graphSummary.nodeCount` reflects contaminated graph                                      |
| Dashboard product UI          | PARTIAL                      | real APIs; graph route shows foreign samples                                                      |
| MCP intelligence tools        | PARTIAL                      | graph handlers call `buildIntelligenceGraph`                                                      |
| Approval grants               | COMPLETE (design)            | bare `approved=true` rejected in `product/approval/session.ts`                                    |
| Agent write tools             | PARTIAL                      | MCP requires grant token; full E2E hostile suite not re-run this pass                             |
| What-if API                   | NOT_IMPLEMENTED on dashboard | `/api/whatif` → 404                                                                               |
| Org/enterprise SSO            | EXTERNAL                     | README/CHANGELOG honest                                                                           |

---

## 4. Live contamination evidence (this workspace)

### P0-GRAPH-1 — TypeScript AST graph walks `.private`

- **File:** `src/intelligence/graph/build.ts` → `listTsFiles`
- **Symbol:** `walk` inside `listTsFiles`
- **Skip set:** `node_modules`, `.git`, `dist`, … — **does not include `.private` / ownership**
- **Reproduction:** `buildIntelligenceGraph({ root: cwd })` → nodes≈11116, contaminated≈11110 under `.private/oss-validation/...`
- **Dashboard:** `GET /api/v2/graph` → `nodeCount: 10811`, **40/40 `sampleNodes` under `.private/...`**
- **Impact:** Graph, C4, twin summary, MCP graph tools, chat graph answers, what-if engine all can describe foreign checkouts as this project
- **Severity:** P0

### P0-GRAPH-2 — Platform regex graph walks `.private`

- **File:** `src/platform/graph/build.ts` → `walk`
- **Reproduction:** `buildRepositoryGraph(cwd)` → contaminated paths e.g. `.private/books/...`
- **Consumers:** regex mode, MCP handlers using `buildRepositoryGraph`, testbrain
- **Severity:** P0

### P0-GRAPH-3 — Language enrichment walker

- **File:** `src/product/graph/enrich-languages.ts` → `listLanguageSourceFiles`
- **Same independent walk pattern**
- **Severity:** P0 (same class)

### P0-SECRETS-1 — Secret content scan bypasses ownership

- **File:** `src/core/secrets/scan.ts` → `walkFiles`
- **SKIP_DIR** lacks `.private`, `AgentDoctorOS`, nested-repo rules
- **Impact:** first N files may be entirely foreign trees; findings (or false calm) not project-owned; privacy/secret leakage risk across nested trees
- **Severity:** P0

### P1-MAP-1 — Software map lists non-owned top-level dirs

- **File:** `src/product/map/software-map.ts` → `topLevelEntries`
- **Evidence:** `/api/map` JSON contains `AgentDoctorOS` with `truth: "VERIFIED"`
- **Impact:** UI presents internal docs tree as current-project structure
- **Severity:** P1

### P1-TWIN-1 — Twin graphSummary uses contaminated graph

- **Evidence:** `/api/twin` `graphSummary.nodeCount: 11116` (matches contaminated AST graph)
- **Severity:** P1 (symptom of P0-GRAPH-*)

### P1-SEARCH-DOC — Search returns owned docs that quote foreign paths

- Hits for `q=sigma` include `docs/internal/...` excerpts with `.private/oss-validation/...`
- Not foreign file indexing; still easy to misread
- **Severity:** P3 (deferred)

### Prior remediation (re-verified, not assumed)

- Decisions: SIGMA ADRs **not** in `/api/decisions` (PASS for ledger path)
- DNA: no `.private` in `/api/dna` (PASS)
- Memory API probe: no private leak in response body (PASS for this probe)

---

## 5. Subsystem ownership matrix (call-graph)

| Subsystem                | Uses discoverFiles/detectProject? | Independent FS walk?  | Bypass ownership?           |
| ------------------------ | --------------------------------- | --------------------- | --------------------------- |
| DNA                      | Yes                               | No                    | No                          |
| Decisions                | Yes                               | No                    | No (post prior fix)         |
| Deps                     | Project detectors                 | Lockfile reads        | No in probe                 |
| Search                   | Yes detectProject                 | No                    | Meta-doc path strings only  |
| Graph AST                | **No**                            | **Yes `listTsFiles`** | **YES**                     |
| Graph platform           | **No**                            | **Yes `walk`**        | **YES**                     |
| Graph enrich             | **No**                            | **Yes**               | **YES**                     |
| Secrets                  | **No**                            | **Yes `walkFiles`**   | **YES**                     |
| Map                      | Partial                           | top-level readdir     | **YES AgentDoctorOS**       |
| Twin                     | Mixed                             | via graph             | **YES counts**              |
| MCP graph_*              | via buildIntelligenceGraph        | —                     | **YES**                     |
| Dashboard #graph         | `/api/v2/graph`                   | —                     | **YES**                     |
| Chat deterministic graph | buildIntelligenceGraph            | —                     | **YES**                     |
| What-if engine           | buildIntelligenceGraph            | —                     | **YES**                     |
| Approval                 | N/A                               | grant tokens          | Bare approved=true rejected |

---

## 6. Truth model notes

- `VERIFIED` in product = file evidence observed, **not** “architecture proven correct”
- Graph edge `evidence: "verified"` means import resolver confidence — easy to misread as product guarantee
- Map labeling `AgentDoctorOS` as VERIFIED is incorrect ownership

---

## 7. Security / approval / MCP (summary)

- Approval: `consumeApprovalGrant` requires token; planHash / resource binding present — design PASS; full forge suite not exhaustively re-executed this session
- MCP write tools document rejection of bare `approved=true`
- Path safety exists in utils + ownership — **undermined where walkers ignore ownership**

---

## 8. Dashboard route notes

| Route API      | Real data? | Correct project?                           |
| -------------- | ---------- | ------------------------------------------ |
| /api/dna       | Yes        | Yes                                        |
| /api/decisions | Yes        | Yes (owned ADRs)                           |
| /api/v2/graph  | Yes        | **NO — contaminated**                      |
| /api/map       | Yes        | **NO — AgentDoctorOS listed**              |
| /api/twin      | Mixed      | Graph summary wrong                        |
| /api/search    | Yes        | Owned files; meta-docs quote private paths |
| /api/whatif    | Missing    | 404                                        |
| /api/security  | Yes        | Secret walker unsafe in principle          |

---

## 9. Test quality

- Ownership boundary unit tests exist for decisions/DNA — **do not cover graph walkers**
- Green tests + contaminated live graph ⇒ **false confidence** for graph/MCP/dashboard graph

---

## 10. Documentation honesty

- README/CHANGELOG largely qualify EXTERNAL/limitations
- Internal `FINAL_*` / completion reports must **not** be trusted for ownership/graph claims
- Claiming “project-aware” while graph samples are 100% `.private` is a false product claim until fixed

---

## 11. Finding list (pre-fix)

| ID             | Sev | Subsystem          | Fix in this pass?                           |
| -------------- | --- | ------------------ | ------------------------------------------- |
| P0-GRAPH-1     | P0  | intelligence graph | YES                                         |
| P0-GRAPH-2     | P0  | platform graph     | YES                                         |
| P0-GRAPH-3     | P0  | language enrich    | YES                                         |
| P0-SECRETS-1   | P0  | secrets scan       | YES                                         |
| P1-MAP-1       | P1  | software map       | YES                                         |
| P1-TWIN-1      | P1  | twin summary       | YES (via graph fix + boundary version bump) |
| P2-WHATIF-404  | P2  | dashboard API      | NO (scope)                                  |
| P3-SEARCH-META | P3  | search UX          | NO                                          |

---

## 12. Planned fixes (no version bump, no release)

1. Route all graph/secret file listing through `discoverFiles` or `decideDirectoryTraversal`.
2. Filter map top-level dirs with `isProjectOwnedRelativePath`.
3. Bump `OWNERSHIP_BOUNDARY_VERSION` to `2` so twin caches invalidate.
4. Add unit tests proving graph/secrets/map exclude `.private`, nested `.git`, `AgentDoctorOS`.
5. Re-run contamination probes + `npm run verify`.

---

## 13. Explicitly NOT fully verified yet (before fix)

- Full hostile Project Chat prompt-injection E2E against live providers
- Full MCP forge-approval matrix against running MCP server
- Performance on home-directory scale
- Every CLI leaf command beyond inventory
- Visual QA of every dashboard hash route in browser (scheduled post-fix)
