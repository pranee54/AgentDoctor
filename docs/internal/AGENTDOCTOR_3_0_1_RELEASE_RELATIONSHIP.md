# AgentDoctor — 3.0.0 vs 3.0.1 release relationship

**Purpose:** Prevent confusion between the original public 3.0.0 release and the
freeze-remediation follow-up prepared as 3.0.1.

## AgentDoctor 3.0.0 (public, historical)

| Item           | Value                                                           |
| -------------- | --------------------------------------------------------------- |
| npm            | `@praneeth_54/agentdoctor@3.0.0`                                |
| Git tag        | `v3.0.0`                                                        |
| GitHub Release | https://github.com/pranee54/AgentDoctor/releases/tag/v3.0.0     |
| Commit         | `c21faf1` (`release: AgentDoctor 3.0.0`)                        |
| Status         | **Already published** — do not force-move, delete, or republish |

This is the original public 3.0.0 line. It does **not** include the later freeze
remediation commit `319810a`.

## AgentDoctor 3.0.1 (candidate)

| Item        | Value                                                   |
| ----------- | ------------------------------------------------------- |
| npm         | `@praneeth_54/agentdoctor@3.0.1` (when published)       |
| Based on    | freeze remediation commit `319810a`                     |
| Parent line | continues from public 3.0.0 (`c21faf1`) + freeze commit |
| Status      | Release **preparation** only until explicitly published |

### What 3.0.1 adds relative to public 3.0.0

Ownership boundary v4 (realpath), CLI broad-root refusal, MCP transport adversarial
coverage, local provider adversarial E2E, what-if ownership gate, Brain/Twin/Graph
stale-state stamps, dashboard hostile/ask-only certification, and related docs/skills.

## Rules

1. Do **not** claim that public npm/GitHub **3.0.0** contains `319810a`.
2. Do **not** move or delete `v3.0.0`.
3. Do **not** republish npm `3.0.0`.
4. Ship freeze remediation as **3.0.1** (or later) with a new tag/release when authorized.
