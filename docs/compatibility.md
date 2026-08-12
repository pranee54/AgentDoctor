# Compatibility promises (v1.0)

This document describes what consumers can rely on in AgentDoctor v1.0.

## Stable in v1.0

| Surface          | Promise                                                                                                                                   |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| npm package name | `@praneeth_54/agentdoctor`                                                                                                                |
| CLI binary name  | `agentdoctor`                                                                                                                             |
| Default command  | Scan current directory / path argument                                                                                                    |
| Flags            | `--json`, `--ci`, `--verbose`, `--min-score`, `--fail-on-severity`, `--fail-on-rule`, `--summary`, `--annotations`, `--version`, `--help` |
| Verify flags     | `--baseline`, `--fail-on-new`, plus shared policy flags above                                                                             |
| Commands         | `scan`, `fix`, `verify`, `explain <rule>`, `doctor`                                                                                       |
| Exit codes       | `0` success, `1` policy / threshold / CI regression, `2` usage, `3` internal (see [exit-codes.md](exit-codes.md))                         |
| Rule IDs         | `category/name` strings documented in [rules.md](rules.md)                                                                                |
| Programmatic API | `scan()`, `verify()`, `buildFixPlan()`, `applyFixPlan()`, `evaluatePolicy()`, and `PACKAGE_VERSION` from package root export              |
| JSON top-level   | `version`, `repository`, `agents`, `findings`, `summary`, `scores`, `scoringAvailable`, `agentSecurityAnalysis`, `timing`, `diagnostics`  |

## Scoring (v1)

| Surface              | Notes                                                                                             |
| -------------------- | ------------------------------------------------------------------------------------------------- |
| `scoringAvailable`   | `true`                                                                                            |
| `scores`             | Populated `{ overall, categories, agents }` integers in `[0, 100]` (see [scoring.md](scoring.md)) |
| Terminal summary     | Prints overall readiness (`N/100`), or `n/a` when analysis is limited                             |
| `--min-score N`      | Exit `1` when `scores.overall < N`, or when analysis is `limited`                                 |
| `--fail-on-severity` | Exit `1` when any finding is at/above the given severity                                          |
| `--fail-on-rule`     | Exit `1` when any finding matches a listed rule id                                                |
| `--ci` (scan)        | Exit `1` on any **critical** finding (override with `--fail-on-severity`)                         |
| Algorithm stability  | Weights / caps are frozen in [scoring.md](scoring.md); retunes require an explicit doc revision   |

## Fix + Verify

| Surface                         | Notes                                                                                                                              |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `fix`                           | Safe context exclusions: Cursor `.cursorignore`, Claude Code `permissions.deny` Read, Codex filesystem deny; review/manual skipped |
| `verify`                        | Compares a re-scan to a prior `scan --json` baseline (`fixed` / `remaining` / `new`)                                               |
| `verify --ci` / `--fail-on-new` | Exit `1` when **new** findings appear relative to the baseline                                                                     |
| Finding `id` values             | Stable for compare when evidence paths are unchanged; may change if evidence keys change                                           |

## Platforms

| Surface | Notes                                                                          |
| ------- | ------------------------------------------------------------------------------ |
| Node.js | `>=20`                                                                         |
| CI      | Ubuntu (Node 20/22) and Windows (Node 20) quality jobs                         |
| Paths   | Reports use POSIX-style relative paths; Fix writers use Windows-safe overwrite |

## Explicitly unstable / reserved

| Surface                          | Notes                                                 |
| -------------------------------- | ----------------------------------------------------- |
| Additional fix writers           | Security / review-manual remediations remain non-auto |
| Re-exports beyond documented API | Prefer documented exports                             |

## Breaking-change policy

- **Patch:** bug fixes and false-positive reductions without renaming rule IDs
- **Minor:** new rules/adapters (additive preferred); scoring weight/cap changes only with a [scoring.md](scoring.md) revision
- **Major:** intentional CLI / JSON / rule ID contract breaks
