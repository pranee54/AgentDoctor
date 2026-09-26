# FINAL TEST REPORT

**Date:** 2026-09-26  
**Package:** `@praneeth_54/agentdoctor@2.1.0`

## Commands run

| Command                | Result                          |
| ---------------------- | ------------------------------- |
| `npm run typecheck`    | PASS                            |
| `npm run lint`         | PASS                            |
| `npm run format:check` | PASS                            |
| `npm test`             | PASS — **112 files, 590 tests** |
| `npm run build`        | PASS                            |
| `npm run verify`       | PASS                            |

## Notes

- Baseline before product build: 548 tests / 81 files.
- Product layer adds unit coverage under `tests/unit/product/` and `tests/unit/agent/roles.test.ts`.
- Slow tests (map/self-diagnose/graph_query/rc-remediation) use elevated timeouts where needed.
- Coverage percentage: NOT MEASURED in this run (`vitest run` without coverage reporter).

## Validation scripts (available, not all re-run in final pass)

- `npm run test:mcp`
- `npm run validate:project-brain`
- `npm run validate:mcp-agent`
- `npm run verify` (typecheck+lint+format+build+test)
