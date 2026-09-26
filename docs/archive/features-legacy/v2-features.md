# AgentDoctor v2.0 — Feature Guide

Package version: **2.1.0**.
Feature work for the 2.0 line is implemented locally-first.

## New CLI commands

| Command                                                 | Purpose                                                                                  |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `agentdoctor brain …`                                   | Project Brain init/status/inspect/rebuild/history/search/export/import                   |
| `agentdoctor changes [--impact]`                        | Git change report; optional observed-edge impact from Brain                              |
| `agentdoctor context-health`                            | Deterministic instruction/ignore conflict heuristics                                     |
| `agentdoctor secrets`                                   | **Opt-in** content secret hygiene (always redacted)                                      |
| `agentdoctor fix-history` / `fix-undo`                  | Safe Fix audit list + restore from backup                                                |
| `agentdoctor baseline save\|list\|diff\|delete\|trends` | Named scan baselines                                                                     |
| `agentdoctor packages [--scan]`                         | Workspace package discovery + optional per-package scan                                  |
| `agentdoctor pr-review`                                 | Local PR review dry-run (**never posts** to GitHub)                                      |
| `agentdoctor dashboard`                                 | Local read-only HTTP UI (loopback by default; `--allow-non-loopback` unsafe)             |
| `agentdoctor platform …`                                | AgentDoctor 2.0 local platform (scan, test-impact, Action Policy Evaluator, sessions, …) |
| `agentdoctor plugins [--run]`                           | Discover/validate plugins; optionally run analyzer hooks                                 |
| `agentdoctor local-ai`                                  | Optional provider probe (`none` \| `mock` \| `ollama`)                                   |

### Platform subcommands (evaluate-only policy)

| Command                                                         | Purpose                                                                      |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `platform scan`                                                 | Graph + health + context-security + knowledge + test-impact snapshot/reports |
| `platform test-impact`                                          | Heuristic test recommendations for git changes (does not run tests)          |
| `platform policy-check` / `firewall-check`                      | Action Policy Evaluator — **never executes**; no agent interception          |
| `platform session-*` / `demo-session`                           | Local session audit / replay export                                          |
| `platform time-machine` / `refactor` / `context` / `provenance` | Supporting analyses                                                          |

**Honest UX:** Action Policy Evaluator prints: “Evaluate-only: no commands are executed and no agents are intercepted.”

Existing Safety commands (`scan`, `fix`, `verify`, `explain`, `doctor`, `brain-mcp`) are unchanged.

## Storage layout

```text
<repo>/.agentdoctor/
  project-brain/     # existing Brain snapshots
  baselines/         # named baseline JSON
  fix-audit/<id>/    # audit.json + backups/
  plugins/<id>/      # plugin.json manifests
```

## Security notes

- Content secret scanning is off unless you run `agentdoctor secrets`.
- Findings never include raw secret values; platform evidence is secret-redacted before reports/API.
- Safe Fix creates a backup audit **before** writes; use `fix-undo <auditId>`.
- Dashboard is GET-only, loopback-bound by default, and does not apply fixes. Local `?user=` is not authentication.
- Action Policy Evaluator does **not** intercept Cursor/Claude or execute shell commands.
- `pr-review` never posts comments; GitHub tokens are not required.

- Local AI is optional; core remains deterministic without it. AI text is labeled `[AI-GENERATED]`.

## Related docs

- [Brain CLI](brain-cli.md)
- [Safe Fix 2.0](safe-fix-2.md)
- [Plugin SDK](plugin-sdk.md)
- [Dashboard](dashboard.md)
- [PR review](pr-review.md)
- [Local AI](local-ai.md)
- [Migration 1.x → 2.0](../guides/migration-v2.md)
- [Final implementation report](../archive/V2.0.0_FINAL_IMPLEMENTATION_REPORT.md)
