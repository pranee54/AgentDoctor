# AgentDoctor 2.0 — Performance Test Report (Deep Validation)

**Package:** `2.0.0`
**Harness:** `AD_PERF_FILES=120 node scripts/perf/ast-graph.mjs`
**Raw evidence:** `benchmarks/ast-graph-perf-latest.json`
**Policy:** Numbers below are **measured**, not invented. No “scalable” marketing claim.

## Task 2 — Large-repository AST performance

| Field       | Record                                                                               |
| ----------- | ------------------------------------------------------------------------------------ |
| Objective   | Measure wall-clock cold/repeated AST graph builds on a generated TS monorepo fixture |
| Fixture     | 120 TypeScript files across 10 packages (synthetic)                                  |
| Host        | darwin arm64, Node v22.23.1                                                          |
| Measured at | 2026-09-20T21:34:04.819Z                                                             |

### Measured results

| Metric                | Value            |
| --------------------- | ---------------- |
| TS files parsed       | 120              |
| Cold graph duration   | **332 ms**       |
| Repeated full rebuild | **135 ms**       |
| Nodes                 | 599              |
| Edges                 | 239              |
| Import edges          | 119              |
| Call edges            | 120              |
| Builder               | `typescript-ast` |
| RSS before → after    | 109 MB → 236 MB  |
| Heap used after       | 99 MB            |

### Pass/fail

**PASS (measurement completed).** Not a scalability certification.

### Limitations (explicit)

- Synthetic fixture, not a production multi-million-LOC monorepo
- Repeated run is still a **full rebuild** (incremental indexing incomplete)
- Single-machine single-run sample — no p95/SLO
- Call edges are identifier-based, not full checker binding
- Do **not** describe AgentDoctor as horizontally scalable from this evidence alone

### How to reproduce

```bash
npm run build
AD_PERF_FILES=120 node scripts/perf/ast-graph.mjs
```
