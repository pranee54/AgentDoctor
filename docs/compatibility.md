# Compatibility promises (v0.3.x-beta)

This document describes what consumers can rely on during the public beta.

## Stable in v0.3.x

| Surface          | Promise                                                                                                                                  |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| npm package name | `@praneeth_54/agentdoctor`                                                                                                               |
| CLI binary name  | `agentdoctor`                                                                                                                            |
| Default command  | Scan current directory / path argument                                                                                                   |
| Flags            | `--json`, `--ci`, `--verbose`, `--min-score`, `--version`, `--help`                                                                      |
| Commands         | `scan`, `fix`, `verify`, `explain <rule>`, `doctor`                                                                                      |
| Exit codes       | `0` success, `1` threshold / CI regression, `2` usage, `3` internal (see [exit-codes.md](exit-codes.md))                                 |
| Rule IDs         | `category/name` strings documented in [rules.md](rules.md)                                                                               |
| Programmatic API | `scan()`, `verify()`, `buildFixPlan()`, `applyFixPlan()`, and `PACKAGE_VERSION` from package root export                                 |
| JSON top-level   | `version`, `repository`, `agents`, `findings`, `summary`, `scores`, `scoringAvailable`, `agentSecurityAnalysis`, `timing`, `diagnostics` |

## Scoring (v1 shipped)

| Surface             | Notes                                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------------- |
| `scoringAvailable`  | `true`                                                                                            |
| `scores`            | Populated `{ overall, categories, agents }` integers in `[0, 100]` (see [scoring.md](scoring.md)) |
| Terminal summary    | Prints overall readiness (`N/100`); category/agent breakdown via `--json`                         |
| `--min-score N`     | Enforced: exit `1` when `scores.overall < N` (`N` in `0`–`100`)                                   |
| `--ci` alone        | Report mode; **no** implicit threshold; exit `0` on successful scan                               |
| Algorithm stability | Weights / caps are frozen in [scoring.md](scoring.md); retunes require an explicit doc revision   |

## Fix + Verify

| Surface             | Notes                                                                                          |
| ------------------- | ---------------------------------------------------------------------------------------------- |
| `fix`               | Applies **safe** Cursor `.cursorignore` exclusions for context findings; review/manual skipped |
| `verify`            | Compares a re-scan to a prior `scan --json` baseline (`fixed` / `remaining` / `new`)           |
| `verify --ci`       | Exit `1` when **new** findings appear relative to the baseline                                 |
| Finding `id` values | Stable for compare when evidence paths are unchanged; may change if evidence keys change       |

## Explicitly unstable / reserved

| Surface                          | Notes                                                    |
| -------------------------------- | -------------------------------------------------------- |
| Non-Cursor fix writers           | Claude Code / Codex writers not implemented yet          |
| Re-exports beyond documented API | Prefer documented exports; others may tighten before 1.0 |
| GitHub Action score gates        | Action remains `--ci --json` report-only                 |

## Breaking-change policy

- **Patch / beta fixes:** bug fixes and false-positive reductions without renaming rule IDs
- **Minor:** new rules/adapters (additive preferred); scoring weight/cap changes only with a [scoring.md](scoring.md) revision
- **v1.0:** freeze CLI + JSON + rule ID contracts listed as stable above
