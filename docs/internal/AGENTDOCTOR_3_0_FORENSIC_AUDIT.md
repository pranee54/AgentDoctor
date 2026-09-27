# AgentDoctor 3.0.0 — Forensic Audit (Final)

**Date:** 2026-09-27
**Repository:** `/Applications/XAMPP/xamppfiles/htdocs/AgentDoctor`
**Version:** 3.0.0 (not bumped, not released, not published, not tagged, not pushed)
**Before-fix report:** `docs/internal/FORENSIC_AUDIT_BEFORE_FIX.md`
**Truth matrix:** `docs/internal/AGENTDOCTOR_3_0_FORENSIC_TRUTH_MATRIX.md`

---

## 1. Executive summary

Zero-trust audit against the live repository found **critical project-ownership bypasses** in graph builders and secrets scanning: independent filesystem walkers entered `.private/` and produced dashboard/MCP/twin graph data dominated by foreign checkouts (≈11k nodes; 40/40 dashboard samples contaminated). DNA and Decisions (after prior ledger work) were already ownership-clean.

**This pass fixed P0/P1 ownership bypasses**, bumped `OWNERSHIP_BOUNDARY_VERSION` to **2**, added production-path contamination tests, restarted the dashboard, and re-verified: graph/map/twin show owned project scale only. `npm run verify` → **129 files / 633 tests PASS**.

Overall product status remains **PARTIAL** — not COMPLETE — because several surfaces are still incomplete or EXTERNAL (dashboard what-if 404, provider-backed chat E2E not fully re-proven here, enterprise SSO EXTERNAL, historical brain text may still mention foreign paths).

---

## 2. What AgentDoctor actually implements

Local-first project intelligence and assurance: discovery, DNA, map, deps, decisions/ADRs, search, graph (TS AST + regex), twin snapshots, security heuristics, doctors, forensic/evidence/proof modules, CLI, embedded dashboard, MCP tool servers, approval-gated agent writes, Project Brain, deterministic chat with optional providers.

## 3. What Cursor previously claimed

Prior internal `FINAL_*` / completion / acceptance docs implied broad “project-aware” / complete 3.0 readiness. Those claims are **not authoritative**. This audit treats them as hypotheses only.

## 4. Claims confirmed

- Version sources consistent at 3.0.0
- Decisions ledger no longer surfaces SIGMA ADRs from `.private`
- DNA uses discovery ownership
- Approval design rejects bare `approved=true` (token grants)
- README/CHANGELOG largely disclose EXTERNAL/limitations for SSO/embeddings/SAST
- Large automated suite exists and is currently green after fixes

## 5. Claims false or overstated (pre-fix)

- “Project-aware graph / architecture” while `/api/v2/graph` samples were 100% `.private`
- Twin graphSummary as current-project intelligence while counting foreign trees
- Software map presenting `AgentDoctorOS` as VERIFIED project structure
- Any implication that green tests alone proved ownership (graph walkers untested)

## 6. Claims incomplete

- Dashboard what-if route
- Full hostile chat/MCP forge matrices in this session
- Neural search / enterprise auth (correctly EXTERNAL)

## 7–10. Findings

### P0 (fixed this pass)

| ID           | Issue                           | Fix                        |
| ------------ | ------------------------------- | -------------------------- |
| P0-GRAPH-1   | `listTsFiles` walked `.private` | Use `discoverFiles`        |
| P0-GRAPH-2   | `platform/graph` walk bypass    | `decideDirectoryTraversal` |
| P0-GRAPH-3   | `enrich-languages` walk bypass  | Use `discoverFiles`        |
| P0-SECRETS-1 | `scanSecrets` walk bypass       | `decideDirectoryTraversal` |

### P1 (fixed this pass)

| ID        | Issue                     | Fix                                              |
| --------- | ------------------------- | ------------------------------------------------ |
| P1-MAP-1  | Map listed AgentDoctorOS  | `isProjectOwnedRelativePath` filter              |
| P1-TWIN-1 | Contaminated graphSummary | Fixed via graph + `OWNERSHIP_BOUNDARY_VERSION=2` |

### P2 (open)

| ID            | Issue                                    |
| ------------- | ---------------------------------------- |
| P2-WHATIF-404 | `/api/whatif` missing (engine/MCP exist) |

### P3 (open)

| ID               | Issue                                                          |
| ---------------- | -------------------------------------------------------------- |
| P3-SEARCH-META   | Search hits on owned forensic docs that quote `.private` paths |
| P3-PRIOR-REPORTS | Stale internal completion docs remain misleading if trusted    |

---

## 11. Security assessment

Path ownership for major scanners improved to PASS for tested trees. Secrets redaction remains. Approval token model sound in code. Residual risk: other niche walkers (`storage/provider`, monorepo detect, plugins) not exhaustively re-proven; historical brain/docs text; provider prompt-injection E2E not fully re-run.

## 12. Project ownership assessment

Canonical layer: `src/project/ownership.ts` + `discoverFiles`. Post-fix graph/secrets/map aligned. **PASS** for audited production consumers.

## 13. Dashboard assessment

Real APIs; Home/DNA/decisions consistent with owned project. Graph/map/twin **PASS** after restart. What-if API absent. Visual QA: spot-check via live API + HTML shell (browser pass limited this session).

## 14. CLI assessment

Commands wired through `src/cli/program.ts` + command modules; verify/agent e2e cover critical paths. Not every leaf re-executed manually → integrity **PASS** with residual unexercised leaves.

## 15. MCP assessment

Intelligence tools call real graph builders (now ownership-safe). Agent writes grant-gated. Full adversarial MCP matrix not re-run end-to-end against a live MCP client → **PASS** with caveat.

## 16. Agent runtime assessment

E2E suites prove limits, approval, no direct model writes, dangerous command block. **PASS** for covered scenarios; not a claim of unrestricted production agent safety certification.

## 17. Brain/memory assessment

Search filters strip obvious private path strings; snapshots may still contain pre-remediation text until rebuilt. Isolation **PASS** for API filters; stale snapshot hygiene **PARTIAL**.

## 18. Digital Twin assessment

Cache key includes `OWNERSHIP_BOUNDARY_VERSION` (now 2). Live twin graph counts match owned graph. **PASS** for current generation; old on-disk twins may need regeneration.

## 19. Test quality assessment

Added production-path ownership tests for graph/secrets/map. Suite green. Confidence **MEDIUM→HIGH** for ownership of fixed paths; still MEDIUM overall because not every subsystem has contamination E2E.

## 20. Documentation truth assessment

Public README mostly careful. Internal FINAL_* docs remain hazardous if treated as truth. Matrix supersedes them for 3.0 forensic status.

## 21. Performance assessment

Post-fix graph ~6k nodes vs ~11k contaminated (faster + correct). Home-directory / huge monorepo stress not fully re-run.

## 22. Fixes performed

- `src/intelligence/graph/build.ts` — `listTsFiles` via `discoverFiles`
- `src/platform/graph/build.ts` — ownership-aware directory walk
- `src/product/graph/enrich-languages.ts` — `discoverFiles`
- `src/core/secrets/scan.ts` — ownership-aware walk
- `src/product/map/software-map.ts` — owned top-level dirs only
- `src/project/ownership.ts` — `OWNERSHIP_BOUNDARY_VERSION = 2`
- `src/dashboard/ui/client.ts` — Graph renderer uses `sampleNodes`/`sampleEdges`
- `tests/unit/project/ownership-boundary.test.ts` — graph/secrets/map contamination case
- Docs: BEFORE_FIX, TRUTH_MATRIX, this FINAL audit

## 23. Tests added

Ownership boundary test: graph builders + secrets + map exclude `.private`, `AgentDoctorOS`, nested repos.

## 24. Final verification results

- `npm run verify` → exit 0
- Test Files 129 passed / Tests 633 passed
- Live `/api/v2/graph` contaminated samples: **0**
- Live `/api/map` AgentDoctorOS: **false**

## 25. Remaining limitations

- Dashboard `/api/whatif` 404
- Provider chat hostile E2E not fully re-executed here
- Historical brain content / internal docs quoting foreign paths
- Performance at home-directory scale unverified
- Visual QA of every hash route incomplete

## 26. Explicitly NOT verified

- Live cloud provider responses under injection
- Published npm tarball contents vs this tree
- Every CLI subcommand exit-code matrix
- Postgres/SQLite backends in production
- Browser OAuth flows
