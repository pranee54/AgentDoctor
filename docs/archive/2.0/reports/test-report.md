# AgentDoctor 2.0 — Test Report

## Baseline (Phase 0)

- 45 test files / 365 tests — PASS
- `npm run verify` — PASS
- Version `2.0.0`
- HEAD recorded in implementation plan

## Post-implementation suite

Additive 2.0 surfaces + regression for `--json` / review markdown sync.

## Deep validation suite (2026-09-21)

| Area                             | Location                                                               | Result   |
| -------------------------------- | ---------------------------------------------------------------------- | -------- |
| Path traversal (MCP + dashboard) | `tests/unit/security/path-traversal-deep.test.ts`                      | PASS     |
| Knowledge abstention             | `tests/unit/knowledge/abstention-deep.test.ts`                         | PASS     |
| Combined MCP STDIO               | `tests/unit/mcp/combined-mcp-stdio.test.ts`                            | PASS     |
| Enforcement honesty              | `tests/unit/enforcement/honesty-deep.test.ts`                          | PASS     |
| Symlink + secret redaction       | `tests/unit/security/symlink-secrets-deep.test.ts`                     | PASS     |
| Feature-validation regressions   | `tests/unit/complete/feature-validation-regression.test.ts`            | PASS     |
| AST perf harness (measured)      | `scripts/perf/ast-graph.mjs` → `benchmarks/ast-graph-perf-latest.json` | MEASURED |

### Final verify (recorded after deep validation)

```text
npm run verify → PASS
53 test files / 394 tests PASS
Package version 2.0.0
```

### Still not independently validated

- Multi-language AST accuracy
- Enterprise IdP flows
- Postgres migration under load
- Coverage-backed test-impact precision/recall golden corpora
- Horizontal scalability / multi-GB monorepo SLOs
