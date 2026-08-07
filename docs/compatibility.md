# Compatibility promises (v0.3.x-beta)

This document describes what consumers can rely on during the public beta.

## Stable in v0.3.x

| Surface                        | Promise                                                                                                                                    |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| npm package name               | `@praneeth_54/agentdoctor`                                                                                                                 |
| CLI binary name                | `agentdoctor`                                                                                                                              |
| Default command                | Scan current directory / path argument                                                                                                     |
| Flags (published `0.3.0-beta`) | `--json`, `--ci` (report-only on scan), `--verbose`, `--min-score`, `--version`, `--help`                                                  |
| Flags (Unreleased tree)        | Above, plus `--fail-on-severity`, `--fail-on-rule`, `--fail-on-new` (verify), `--summary`, `--annotations`; `scan --ci` fails on criticals |
| Commands                       | `scan`, `fix`, `verify`, `explain <rule>`, `doctor`                                                                                        |
| Exit codes                     | `0` success, `1` policy / threshold / CI regression, `2` usage, `3` internal (see [exit-codes.md](exit-codes.md))                          |
| Rule IDs                       | `category/name` strings documented in [rules.md](rules.md)                                                                                 |
| Programmatic API               | `scan()`, `verify()`, `buildFixPlan()`, `applyFixPlan()`, and `PACKAGE_VERSION` from package root export                                   |
| JSON top-level                 | `version`, `repository`, `agents`, `findings`, `summary`, `scores`, `scoringAvailable`, `agentSecurityAnalysis`, `timing`, `diagnostics`   |

## Scoring (v1 shipped)

| Surface              | Notes                                                                                                                      |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `scoringAvailable`   | `true`                                                                                                                     |
| `scores`             | Populated `{ overall, categories, agents }` integers in `[0, 100]` (see [scoring.md](scoring.md))                          |
| Terminal summary     | Prints overall readiness (`N/100`); category/agent breakdown via `--json`                                                  |
| `--min-score N`      | Enforced: exit `1` when `scores.overall < N` (`N` in `0`–`100`); Unreleased also fails when analysis is `limited`          |
| `--fail-on-severity` | Unreleased: exit `1` when any finding is at/above the given severity                                                       |
| `--fail-on-rule`     | Unreleased: exit `1` when any finding matches a listed rule id                                                             |
| `--ci` (scan)        | Published `0.3.0-beta`: report-only. Unreleased: exit `1` on any **critical** finding (override with `--fail-on-severity`) |
| Algorithm stability  | Weights / caps are frozen in [scoring.md](scoring.md); retunes require an explicit doc revision                            |

## Fix + Verify

| Surface                         | Notes                                                                                                                                                                                |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `fix`                           | Published `0.3.0-beta`: safe Cursor `.cursorignore` only. Unreleased: also Claude Code `permissions.deny` Read and Codex filesystem deny for context findings; review/manual skipped |
| `verify`                        | Compares a re-scan to a prior `scan --json` baseline (`fixed` / `remaining` / `new`)                                                                                                 |
| `verify --ci` / `--fail-on-new` | Exit `1` when **new** findings appear relative to the baseline (`--fail-on-new` Unreleased)                                                                                          |
| Finding `id` values             | Stable for compare when evidence paths are unchanged; may change if evidence keys change                                                                                             |

## Explicitly unstable / reserved

| Surface                          | Notes                                                    |
| -------------------------------- | -------------------------------------------------------- |
| Additional fix writers           | Security / review-manual remediations remain non-auto    |
| Re-exports beyond documented API | Prefer documented exports; others may tighten before 1.0 |

## Breaking-change policy

- **Patch / beta fixes:** bug fixes and false-positive reductions without renaming rule IDs
- **Minor:** new rules/adapters (additive preferred); scoring weight/cap changes only with a [scoring.md](scoring.md) revision
- **v1.0:** freeze CLI + JSON + rule ID contracts listed as stable above
