# AgentDoctor 2.0 — Complete Implementation Plan

**Started:** 2026-09-21
**Baseline HEAD:** `559aa30c604648bd0eb9621830b682642d0dd27a`
**Baseline verify:** 45 files / 365 tests PASS @ `1.1.1`
**Authority:** Master execution prompt — all phases sequential, no per-phase approval gate
**Constraint:** Preserve Safety / Brain / MCP / Platform contracts; no version bump / commit / publish

## Strategy

Extend existing layers; do not rewrite Safety or Brain stores.

| Phase | Focus                                      | Primary paths                                       |
| ----- | ------------------------------------------ | --------------------------------------------------- |
| 1     | Shared contracts                           | `src/contracts/**`                                  |
| 2     | Repository Brain productization            | `src/core/brain-product/**`, CLI `init` / `brain *` |
| 3     | TS/JS AST intelligence                     | `src/intelligence/**`, feature flag                 |
| 4     | Git / engineering intelligence             | `src/intelligence/git/**`                           |
| 5     | Architecture-first                         | `src/architecture/**`                               |
| 6     | Expanded MCP                               | `src/mcp/platform/**` + preserve Brain tools        |
| 7–8   | Sessions / policy / enforcement interfaces | extend `src/platform` + `src/enforcement/**`        |
| 9     | Governed knowledge                         | `src/knowledge/**`                                  |
| 10    | Impact upgrades                            | extend platform impact modules                      |
| 11    | Storage + workspaces                       | `src/storage/**`                                    |
| 12    | Team auth (dev-local + RBAC)               | `src/team/**`                                       |
| 13    | CLI / API / dashboard                      | wire commands + versioned API                       |
| 14–16 | Tests, ops, final docs                     | `AGENTDOCTOR_2.0_*.md`                              |

## Honesty rule

Abstractions + local working path + tests + feature flags + documented limitations when external IdP/cloud/DB not configured. Never fake enterprise SSO completeness.

## Progress log

- Phase 0: complete (baseline report)
- Phases 1–16: implemented additively in-tree (contracts, brain product, AST graph, git, C4, MCP intelligence, knowledge, storage, team local-dev, enforcement, CLI/API/dashboard, ops, docs)
- Package version remains 1.1.1; no commit/publish
- See AGENTDOCTOR_2.0_IMPLEMENTATION_REPORT.md and AGENTDOCTOR_2.0_READINESS_MATRIX.md
