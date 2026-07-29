# Compatibility promises (v0.1.x-beta)

This document describes what consumers can rely on during the public beta.

## Stable in v0.1.x

| Surface          | Promise                                                                                                                                  |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| npm package name | `@praneeth_54/agentdoctor`                                                                                                               |
| CLI binary name  | `agentdoctor`                                                                                                                            |
| Default command  | Scan current directory / path argument                                                                                                   |
| Flags            | `--json`, `--ci`, `--verbose`, `--version`, `--help`                                                                                     |
| Commands         | `scan`, `explain <rule>`, `doctor`                                                                                                       |
| Exit codes       | `0` success, `2` usage, `3` internal (see [exit-codes.md](exit-codes.md))                                                                |
| Rule IDs         | `category/name` strings documented in [rules.md](rules.md)                                                                               |
| Programmatic API | `scan()` and `PACKAGE_VERSION` from package root export                                                                                  |
| JSON top-level   | `version`, `repository`, `agents`, `findings`, `summary`, `scores`, `scoringAvailable`, `agentSecurityAnalysis`, `timing`, `diagnostics` |

## Explicitly unstable / reserved

| Surface                          | Notes                                                       |
| -------------------------------- | ----------------------------------------------------------- |
| `scores`                         | Always `null` until scoring ships                           |
| `--min-score`                    | Accepted but ignored until scoring ships                    |
| `fix`                            | Stub only; does not modify files                            |
| Finding `id` values              | Include paths/details; may change when evidence keys change |
| Re-exports beyond `scan` / types | Prefer `scan()`; other exports may tighten before v1.0      |

## Breaking-change policy

- **Patch / beta fixes:** bug fixes and false-positive reductions without renaming rule IDs
- **Minor (0.2+):** scoring, CI threshold semantics, new rules/adapters (additive preferred)
- **v1.0:** freeze CLI + JSON + rule ID contracts listed as stable above
