# Compatibility promises (v0.1.x-beta)

This document describes what consumers can rely on during the public beta.

## Stable in v0.1.x

| Surface          | Promise                                                                                                                                  |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| npm package name | `@praneeth_54/agentdoctor`                                                                                                               |
| CLI binary name  | `agentdoctor`                                                                                                                            |
| Default command  | Scan current directory / path argument                                                                                                   |
| Flags            | `--json`, `--ci`, `--verbose`, `--min-score`, `--version`, `--help`                                                                      |
| Commands         | `scan`, `explain <rule>`, `doctor`                                                                                                       |
| Exit codes       | `0` success, `1` threshold failure (`--min-score`), `2` usage, `3` internal (see [exit-codes.md](exit-codes.md))                         |
| Rule IDs         | `category/name` strings documented in [rules.md](rules.md)                                                                               |
| Programmatic API | `scan()` and `PACKAGE_VERSION` from package root export                                                                                  |
| JSON top-level   | `version`, `repository`, `agents`, `findings`, `summary`, `scores`, `scoringAvailable`, `agentSecurityAnalysis`, `timing`, `diagnostics` |

## Scoring (v1 shipped)

| Surface             | Notes                                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------------- |
| `scoringAvailable`  | `true`                                                                                            |
| `scores`            | Populated `{ overall, categories, agents }` integers in `[0, 100]` (see [scoring.md](scoring.md)) |
| `--min-score N`     | Enforced: exit `1` when `scores.overall < N` (`N` in `0`–`100`)                                   |
| `--ci` alone        | Report mode; **no** implicit threshold; exit `0` on successful scan                               |
| Algorithm stability | Weights / caps are frozen in [scoring.md](scoring.md); retunes require an explicit doc revision   |

## Explicitly unstable / reserved

| Surface                          | Notes                                                       |
| -------------------------------- | ----------------------------------------------------------- |
| `fix`                            | Stub only; does not modify files                            |
| Finding `id` values              | Include paths/details; may change when evidence keys change |
| Re-exports beyond `scan` / types | Prefer `scan()`; other exports may tighten before v1.0      |
| Terminal readiness line          | Not rendered in v1 (JSON only)                              |
| GitHub Action score gates        | Action remains `--ci --json` report-only                    |

## Breaking-change policy

- **Patch / beta fixes:** bug fixes and false-positive reductions without renaming rule IDs
- **Minor:** new rules/adapters (additive preferred); scoring weight/cap changes only with a [scoring.md](scoring.md) revision
- **v1.0:** freeze CLI + JSON + rule ID contracts listed as stable above
