# Change assurance (2.0.1)

**Status:** PARTIAL

Change assurance assembles existing AgentDoctor repository signals into a structured `ChangeAssessment`. It does **not** prove the change is correct, safe, or complete.

## Commands

```bash
agentdoctor change analyze [--since <rev>] [--coverage <path>] [--json]
agentdoctor change verify [--since <rev>] [--change-id <id>] [--coverage <path>] [--json]
```

| Command          | Result                                                                               |
| ---------------- | ------------------------------------------------------------------------------------ |
| `change analyze` | In-memory / stdout assessment; `verificationStatus: not-run`                         |
| `change verify`  | Writes `.agentdoctor/evidence/<change-id>/`; `verificationStatus: evidence-produced` |

## What is assembled

- Git changed files (and optional `--since` range)
- Graph-derived changed symbols when path metadata exists
- Dependency / related-path impact (observed when Brain impact edges exist; otherwise unknown/heuristic)
- Inferred C4 architecture view levels
- Approved knowledge references (abstention-aware)
- Heuristic secret findings (redacted patterns)
- Evaluate-only policy verdict (`executionResult: not-executed`)
- Test-impact recommendations (heuristic by default; coverage-backed when `--coverage` is supplied)

## Status rules

| `verificationStatus` | Meaning                                                                                               |
| -------------------- | ----------------------------------------------------------------------------------------------------- |
| `not-run`            | Assessment only; no evidence directory                                                                |
| `evidence-produced`  | Bundle written; hashes not yet checked via `evidence verify`                                          |
| `verified`           | **Never** set by `change analyze` / `change verify` — only by successful `evidence verify` hash check |
| `partial` / `failed` | Hash check incomplete or mismatched                                                                   |

## Honesty constraints

- Test impact mode is labeled **heuristic** or **coverage-backed** from the analyzer — never “verified tests.”
- Architecture impact is **inferred** (C4) unless a separate architecture contract check is used.
- Policy is **evaluate-only** by default.
- Limitations arrays are part of the contract — read them.

See also: [evidence.md](evidence.md) · [limitations.md](limitations.md).
