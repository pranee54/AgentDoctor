# AgentDoctor 2.0 — Documentation review

**Date:** 2026-09-21
**Scope:** Consistency pass after moving root `AGENTDOCTOR_2.0_*.md` → `docs/2.0/` and rewriting the README.

## Organization change

| Before                                  | After                                                                 |
| --------------------------------------- | --------------------------------------------------------------------- |
| 27× `AGENTDOCTOR_2.0_*.md` at repo root | Structured under [`docs/2.0/`](../README.md)                          |
| Hard to navigate                        | Index + `overview/` · `guides/` · `reports/` · `audits/` · `release/` |
| Root pointer                            | [`AGENTDOCTOR_2.0.md`](../../../AGENTDOCTOR_2.0.md) → `docs/2.0/`     |

## Contradictions found and handling

| Issue                                                                            | Handling                                                                                                             |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| README framed 2.0 as vague “future” while code already ships surfaces            | **Fixed** — README rewritten with honest status tables                                                               |
| Root reports claimed “complete implementation” without packaging caveats         | Clarified via readiness matrix + release blockers; implementation report remains historical evidence of in-tree work |
| `docs/archive/V2.0.0_FINAL_IMPLEMENTATION_REPORT.md` vs newer `docs/2.0/` audits | Marked as **historical / superseded for public claims** in `docs/README.md`                                          |
| Possible impression of blanket 5/5                                               | No 5/5 claims found in readiness matrix; README explicitly forbids blanket 5/5                                       |
| “Final” / “complete” wording in older plans                                      | Left in place as historical; index steers readers to `docs/2.0/` + readiness matrix                                  |
| CHANGELOG `[Unreleased]` still correct while version is 1.1.1                    | **Left unchanged** (proposal lives in `release/changelog-proposal.md`)                                               |
| `package.json` description outdated                                              | **Left unchanged** (proposal documented; not authorized to edit)                                                     |

## Features described carefully

| Surface     | Public wording now                            |
| ----------- | --------------------------------------------- |
| C4          | Experimental / inferred                       |
| Test-impact | Partial / heuristic                           |
| Team auth   | Local-dev, not SSO                            |
| Enforcement | Distinct from evaluate-only; not IDE blocking |
| AST         | TS/JS focus                                   |

## Updates made in this pass

- README rewrite (public positioning + limitations)
- `docs/2.0/` tree + index
- `docs/README.md` updated for 2.0 navigation
- `CHANGELOG.md` Unreleased links pointed at `docs/2.0/…`
- Supersession note on older V2 “final” report entry in docs hub
- Release blockers updated to credit README prep progress

## Intentionally not rewritten line-by-line

Deep audit / phase0 / early implementation plan prose (historical record). Readers should prefer:

1. README
2. `docs/2.0/overview/readiness-matrix.md`
3. `docs/2.0/audits/release-candidate-audit.md`

## Residual doc risks

- External bookmarks to root `AGENTDOCTOR_2.0_*.md` break → mitigated by `AGENTDOCTOR_2.0.md` pointer + git history
- `docs/features/v2-features.md` may lag CLI list → recommended post-prep sync (not a publish blocker if README is authoritative)
