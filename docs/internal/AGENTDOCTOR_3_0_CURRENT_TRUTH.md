# AgentDoctor 3.0.1 — Current Truth (release candidate)

**Updated:** 2026-09-27T08:20:00Z
**Authoritative freeze audit:** `AGENTDOCTOR_3_0_FINAL_FREEZE_AUDIT.md`
**Release relationship:** `AGENTDOCTOR_3_0_1_RELEASE_RELATIONSHIP.md`
**Feature matrix:** `AGENTDOCTOR_3_0_FINAL_FEATURE_MATRIX.md`

## Verdict

**3.0.1 RELEASE CANDIDATE** (version transition from verified freeze remediation).
Public **3.0.0** history is unchanged.

## Identity

| Field                      | Value                |
| -------------------------- | -------------------- |
| CURRENT PACKAGE VERSION    | **3.0.1**            |
| Freeze remediation commit  | `319810a`            |
| Public 3.0.0 commit        | `c21faf1`            |
| Public 3.0.0 tag           | `v3.0.0` (untouched) |
| OWNERSHIP_BOUNDARY_VERSION | 4                    |

## Public vs candidate

| Artifact                                | 3.0.0                                        | 3.0.1                                  |
| --------------------------------------- | -------------------------------------------- | -------------------------------------- |
| npm                                     | `@praneeth_54/agentdoctor@3.0.0` (published) | candidate — not published by this prep |
| Git tag                                 | `v3.0.0` → `c21faf1`                         | none yet                               |
| GitHub Release                          | existing                                     | none yet                               |
| Contains freeze remediation (`319810a`) | **No**                                       | **Yes**                                |

## Documented limitations (unchanged)

- Full TTY `chat` REPL not automated (`ask` + dashboard chat certified)
- Native Anthropic/Gemini not implemented
- Vendor LLMs / live ops telemetry EXTERNAL
- Knowledge docs shallow readdir completeness
- Historical internal audits retained; do not treat older "RELEASE READY" prose as current

## Release actions

This preparation commit does **not** publish, push, tag, or create a GitHub release.
