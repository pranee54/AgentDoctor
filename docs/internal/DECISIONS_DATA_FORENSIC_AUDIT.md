# Decisions Data Forensic Audit

**Scope:** Audit only. No scanner, API, UI, ignore-rule, or ADR file modifications were made for this report.

**Date:** 2026-09-27
**Dashboard under test:** `http://127.0.0.1:3847/` (local `agentdoctor dashboard`)

---

## 1. Dashboard route

| Layer      | Location / behavior                                                                                    |
| ---------- | ------------------------------------------------------------------------------------------------------ |
| Hash route | `#decisions`                                                                                           |
| Nav        | `NAV` group `ENGINEERING` → `{ id: "decisions", label: "Decisions" }` in `src/dashboard/ui/client.ts`  |
| Loader     | `loadRoute("decisions")` → `cached("decisions","/api/decisions")` → `renderDecisions(data)`            |
| Renderer   | `renderDecisions` maps `data.decisions[]` into cards (title, truth badge, `bodyExcerpt` excerpt, path) |

No separate Decisions backend beyond the shared product ledger loader.

---

## 2. API source

| Item         | Evidence                                                                                                     |
| ------------ | ------------------------------------------------------------------------------------------------------------ |
| Endpoint     | `GET /api/decisions`                                                                                         |
| Handler      | `src/dashboard/server.ts` ≈ L454–455: `sendJson(res, 200, await loadDecisionLedger(root));`                  |
| Root binding | `startDashboardServer({ root })` → `resolveRepoRoot(options.root)`; CLI uses `process.cwd()` / explicit root |
| Live root    | `"/Applications/XAMPP/xamppfiles/htdocs/AgentDoctor"` from `/api/decisions.root` and `/api/status.root`      |

### Live response shape (captured)

Top-level keys: `root`, `decisions`, `ledgerPath`, `limitations`.

- `decisions`: **39**
- `ledgerPath`: `/Applications/XAMPP/xamppfiles/htdocs/AgentDoctor/.agentdoctor/decisions/entries.jsonl` (**file does not exist**)
- `sources`: all `adr-file` (39)
- `truth`: all `VERIFIED` (39)
- `limitations`: ADR title/Status parsing only; merge with ledger JSONL

**First 3 decision IDs (exact):**

1. `.private/oss-validation/sigma/docs/adr/0001-rendering-and-security.md`
2. `.private/oss-validation/sigma/docs/adr/0002-d1-as-datastore.md`
3. `.private/oss-validation/sigma/docs/adr/0003-value-flag-data-quality.md`

Each includes `title`, `source: "adr-file"`, `truth: "VERIFIED"`, `evidence[{path,line,excerpt}]`, `bodyExcerpt`.

---

## 3. Scanner source

| Function             | File                              | Role                                                                                                     |
| -------------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `loadDecisionLedger` | `src/product/decisions/ledger.ts` | Orchestrates ADR discovery + optional ledger JSONL merge                                                 |
| `parseAdrDecisions`  | same                              | Walks `detectProject(...).discovery.files`, filters ADR paths, reads markdown                            |
| `isAdrPath`          | same                              | Matches `docs/adr/`, `adr/`, **any path containing `/adr/`**, or basename `ADR-\d+…`                     |
| `parseAdr`           | same                              | First `#` heading → title; optional `**Status**:`; always sets `source: "adr-file"`, `truth: "VERIFIED"` |
| `detectProject`      | `src/detectors/project.ts`        | Calls `discoverFiles`                                                                                    |
| `discoverFiles`      | `src/discovery/files.ts`          | Recursive walk; skips only `DEFAULT_IGNORE_DIRECTORIES`                                                  |

### Filtering logic (exact)

```ts
// isAdrPath
norm.startsWith("docs/adr/") ||
  norm.startsWith("adr/") ||
  norm.includes("/adr/") || // matches nested foreign trees
  /^adr-\d+/i.test(basename); // matches AgentDoctorOS ADR-001_*.md
```

### Ignore directories used by discovery

`DEFAULT_IGNORE_DIRECTORIES` in `src/constants.ts` includes `.git`, `node_modules`, `dist`, etc.

**Does NOT include:** `.private`, `AgentDoctorOS`, `fixtures`, `validation`, `tests`.

Therefore gitignored private trees are still walked if present on disk under the project root.

---

## 4. Exact ADR files found

### Cluster A — SIGMA (34 markdown ADRs under oss-validation)

Directory (absolute):

`/Applications/XAMPP/xamppfiles/htdocs/AgentDoctor/.private/oss-validation/sigma/docs/adr/`

Includes (non-exhaustive; directory listing verified):

- `0001-rendering-and-security.md`
- `0002-d1-as-datastore.md`
- `0003-value-flag-data-quality.md`
- `0004-style-src-unsafe-inline.md`
- `0005-blue-green-d1-rollback.md`
- `0006-eop-wins-dedup.md`
- … through `0032-…md`
- plus `README.md`, `_template.md`

String search for Bulgarian titles / filenames resolves **only** under this tree (not under `tests/` or committed `fixtures/`).

### Cluster B — AgentDoctorOS decision notes (5 files)

Directory:

`/Applications/XAMPP/xamppfiles/htdocs/AgentDoctor/AgentDoctorOS/22_DECISIONS/`

- `ADR-001_NORTH_STAR.md`
- `ADR-002_CATEGORY_LANGUAGE.md`
- `ADR-003_LOCAL_FIRST.md`
- `ADR-004_NON_COMPETE_AGENTS.md`
- `ADR-005_VERIFY_CENTER.md`

Matched via basename rule `ADR-\d+…`, not via `/adr/` path segment.

### Path prefix counts from live API

| Prefix                                    | Count  |
| ----------------------------------------- | ------ |
| `.private/oss-validation/sigma`           | 34     |
| `AgentDoctorOS/22_DECISIONS/ADR-00x_*.md` | 5      |
| **Total**                                 | **39** |

---

## 5. Exact filesystem locations

All matching files are **inside** the dashboard project root:

`/Applications/XAMPP/xamppfiles/htdocs/AgentDoctor/...`

They are **not** outside the root (no parent-directory escape observed in IDs or `resolveRepoRoot` usage).

`discoverFiles` enforces `isPathInsideRoot` for walk + symlink reals — **path-safety boundary holds**.

---

## 6. Project root

| Source               | Root / identity                                                      |
| -------------------- | -------------------------------------------------------------------- |
| `/api/status`        | root = AgentDoctor absolute path; `ops.version` = `3.0.0`            |
| `/api/dna`           | root same; `name` = `@praneeth_54/agentdoctor`; `truth` = `VERIFIED` |
| `/api/decisions`     | root same                                                            |
| `/api/v2/projects`   | `mode: local-single-repo`, same root                                 |
| `/api/v2/workspaces` | `mode: local-single-repo`, same root                                 |
| `/api/meta`          | audits/baselines/sessions (no conflicting root field)                |

**Identity consistency:** PASS for root/name across status/dna/decisions/v2.

**Decisions semantic consistency:** FAIL — Decisions list is not AgentDoctor package ADRs; it is nested foreign + OS-doc trees under the same filesystem root.

---

## 7. Git status

| Path                                          | Tracked?                        | Ignored? | Evidence                                               |
| --------------------------------------------- | ------------------------------- | -------- | ------------------------------------------------------ |
| `.private/oss-validation/sigma/docs/adr/*`    | **No** (`git ls-files` count 0) | **Yes**  | `git check-ignore -v` → `.gitignore:80:.private/`      |
| `AgentDoctorOS/22_DECISIONS/*`                | **No**                          | **Yes**  | `git check-ignore -v` → `.gitignore:81:AgentDoctorOS/` |
| Ledger `.agentdoctor/decisions/entries.jsonl` | N/A                             | —        | File **absent** at audit time                          |

Also ignored by Cursor: `.cursorignore` contains `.private/`.

These trees are local/private artifacts on disk, not committed AgentDoctor product content.

---

## 8. Fixture/sample classification

| Cluster                            | Classification                                                                                                                                                                                                                                                                                                                                                           | Evidence                                             |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| `.private/oss-validation/sigma/**` | **H — Other repository content** nested under AgentDoctor (OSS validation checkout). Not AgentDoctor product ADRs. Filename/`package.json` name `"sigma"`; ADR README states architectural decisions of **СИГМА** (Bulgarian public-procurement / Cloudflare Workers / D1 platform). Content discusses React Router on Workers, D1, ЕОП, ЕИК — unrelated to AgentDoctor. | File reads + `sigma/package.json` + ADR README table |
| `AgentDoctorOS/22_DECISIONS/**`    | **E/H — Historical / private AgentDoctor OS writing** (product principles), gitignored, not the npm package’s committed `docs/adr`. North Star text is AgentDoctor-oriented (“falsifiable against repository evidence”) but lives in ignored `AgentDoctorOS/` tree.                                                                                                      | File read + gitignore                                |
| Committed `tests/` / `fixtures/`   | **No** copies of these Bulgarian SIGMA ADR titles found by search                                                                                                                                                                                                                                                                                                        | `rg` over tests/fixtures/validation                  |

Not `node_modules`. Not generated by the Decisions API (files dated on disk; parser only reads).

---

## 9. Cross-project contamination check

**Result: FAIL (product contamination within root)**

Mechanism:

1. Dashboard analyzes AgentDoctor repo root.
2. Discovery walks **all** non-`DEFAULT_IGNORE` directories, including `.private/` and `AgentDoctorOS/`.
3. `isAdrPath` accepts any `*/adr/*.md` and any `ADR-\d+*.md` basename.
4. UI presents those as “architecture and engineering decisions” for `@praneeth_54/agentdoctor`.

This is **not** reading another machine path outside the root. It **is** treating nested foreign/private checkouts as the active product’s decision ledger.

Closest product labels:

- **BUG — FIXTURE LEAKAGE** (gitignored private validation trees still ingested)
- **BUG — CROSS-PROJECT CONTAMINATION** (SIGMA ADRs shown as AgentDoctor decisions)

Not **BUG — PROJECT ROOT VIOLATION** (files are inside root; path safety holds).

---

## 10. Truth-label semantics

| Claim                                                                                  | Evidence                                                                                                         |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Parser sets `truth: "VERIFIED"` unconditionally for every successfully parsed ADR file | `parseAdr` in `ledger.ts`                                                                                        |
| Product definition of VERIFIED                                                         | `truthLabelDescription("VERIFIED")` → “Directly supported by repository file evidence.” (`src/product/truth.ts`) |

**Meaning in this pipeline:** the markdown file was found under the scanned root and parsed (title extracted).

**Not meaning:** the architectural decision is endorsed as correct for AgentDoctor, or that the decision applies to `@praneeth_54/agentdoctor`.

**UX issue:** Dashboard Decisions cards show a prominent `VERIFIED` badge next to foreign ADR titles with no project-scope warning. That can be read as “this decision is verified for this product,” which **overclaims** relative to parser semantics.

Secondary label issue: UI previously showed a generic `recorded`/`source` badge; source `adr-file` is accurate for provenance type, not for project ownership.

**Truth semantics (parser vs product glossary):** PASS for internal definition.
**Truth semantics (UI presentation risk):** FAIL / **BUG — TRUTH LABEL MISREPRESENTATION** (presentation), distinct from inventing VERIFIED.

---

## 11. Project identity consistency

| Check                                                    | Result                                       |
| -------------------------------------------------------- | -------------------------------------------- |
| status/dna/decisions/v2 roots agree                      | PASS                                         |
| DNA name `@praneeth_54/agentdoctor`                      | PASS                                         |
| Decisions content belongs to that package’s architecture | **FAIL** (SIGMA + ignored OS trees dominate) |

---

## 12. Security / path boundary check

| Control                                                 | Result                       | Evidence                                                                              |
| ------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------- |
| Project root                                            | PASS                         | Single resolved root; APIs agree                                                      |
| Workspace isolation (local-single-repo)                 | PASS for mode declaration    | `/api/v2/projects` notice                                                             |
| Path safety (`isPathInsideRoot`, `resolveSafeRepoPath`) | PASS                         | Discovery + `resolveDecisionPath`                                                     |
| Ignore rules for product scan                           | **FAIL** vs gitignore intent | `.private/` / `AgentDoctorOS/` ignored by git but not by `DEFAULT_IGNORE_DIRECTORIES` |
| Project isolation of _decision semantics_               | **FAIL**                     | Nested foreign ADRs attributed to active project UI                                   |
| Truth model honesty                                     | PARTIAL                      | Label definition OK; UI context weak                                                  |

---

## 13. Result

### Final classification

**BUG — FIXTURE LEAKAGE**
**and**
**BUG — CROSS-PROJECT CONTAMINATION**
**(nested under project root; not an external path-traversal escape)**

with a related

**BUG — TRUTH LABEL MISREPRESENTATION** (UI over-reads `VERIFIED` as product-decision verification).

### Not selected

- **CORRECT — REAL PROJECT DATA** — rejected: dominant ADR corpus is SIGMA, not AgentDoctor package architecture.
- **CORRECT — EXPECTED FIXTURE DATA** — rejected: not intentional committed fixtures under `tests/`/`fixtures/`; gitignored private checkouts accidentally ingested.
- **BUG — PROJECT ROOT VIOLATION** — rejected: no evidence of reading outside resolved root.
- **UNKNOWN — INSUFFICIENT EVIDENCE** — rejected: filesystem, API, parser, and ignore rules provide direct proof.

### Proof summary (minimal)

1. Live `/api/decisions` IDs begin with `.private/oss-validation/sigma/docs/adr/…`.
2. Those files exist on disk; README says they are **СИГМА** ADRs.
3. `.gitignore` line 80 ignores `.private/`; discovery still walks it.
4. `isAdrPath` matches `includes("/adr/")`.
5. DNA still correctly identifies `@praneeth_54/agentdoctor` at the same root — identity and decision corpus disagree.

---

## Appendix A — Trace diagram

```
#decisions (client.ts loadRoute)
  → GET /api/decisions
    → server.ts loadDecisionLedger(root)
      → parseAdrDecisions(root)
        → detectProject → discoverFiles (DEFAULT_IGNORE_DIRECTORIES)
        → isAdrPath filter
        → readTextFile + parseAdr → truth:VERIFIED, source:adr-file
      → merge optional .agentdoctor/decisions/entries.jsonl (absent)
  → renderDecisions(cards)
```

## Appendix B — Sample ADR content facts (no rewrite)

**0001-rendering-and-security.md:** Bulgarian; Status Прието; context is public read-only АОП explorer on Cloudflare Workers; decision React Router v7; not AgentDoctor.

**0002-d1-as-datastore.md:** Bulgarian; Cloudflare D1 as serving store for sigma/sigma-etl workers.

**ADR-001_NORTH_STAR.md (AgentDoctorOS):** English; “Make every claim about software falsifiable against repository evidence.”

## Appendix C — Implementation correctness matrix

| Requirement                                           | Result |
| ----------------------------------------------------- | ------ |
| project root                                          | PASS   |
| workspace boundary (path)                             | PASS   |
| path safety                                           | PASS   |
| ignore rules (aligned with gitignore / private trees) | FAIL   |
| project isolation (decision attribution)              | FAIL   |
| truth model (parser definition)                       | PASS   |
| truth model (UI attribution)                          | FAIL   |
