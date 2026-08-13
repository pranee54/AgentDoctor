# MCP ↔ Agent validation

Date: 2026-08-13T06:46:21.742Z  
AgentDoctor version: 1.1.0  
Fixture: `fixtures/understanding-dependencies-project`  
Snapshots: `snap_fbdaaa21804375317ae801ee`, `snap_ec686dd69d06c094bf77bbb5`

## Verdicts

| Surface | Result |
| --- | --- |
| MCP contract | `PASS` |
| Project Brain | `PASS` |
| Safety V1 | `PASS` |
| Security | `PASS` |
| Provenance (tool-level) | `PASS` |
| Provenance (MCP→LLM→answer) | `PARTIAL` |
| Real LLM agent usage | `BLOCKED` |
| Real-agent validation (incl. MCP discovery) | `PASS` |
| Release | `READY` |

## Agents

| Agent | Auth | Status | MCP connected | Tools discovered | LLM Q1–Q7 |
| --- | --- | --- | --- | --- | --- |
| Cursor | `AUTHENTICATED_OR_UNKNOWN` | `PASS` | `PASS` | `PASS` | `BLOCKED` |
| Claude Code | `NOT AUTHENTICATED` | `NOT AVAILABLE` | `NOT AVAILABLE` | `PASS` | `BLOCKED` |
| Codex | `NOT AVAILABLE` | `NOT AVAILABLE` | n/a | n/a | `NOT AVAILABLE` |

Codex note: codex CLI binary not found on PATH (config dir may exist but CLI missing)

## Cursor Q1–Q7 (authenticated LLM)

| Q | Status | MCP usage evidence | Grade |
| --- | --- | --- | --- |
| Q1 | `BLOCKED` | `UNKNOWN` | `NOT GRADED` |
| Q2 | `BLOCKED` | `UNKNOWN` | `NOT GRADED` |
| Q3 | `BLOCKED` | `UNKNOWN` | `NOT GRADED` |
| Q4 | `BLOCKED` | `UNKNOWN` | `NOT GRADED` |
| Q5 | `BLOCKED` | `UNKNOWN` | `NOT GRADED` |
| Q6 | `BLOCKED` | `UNKNOWN` | `NOT GRADED` |
| Q7 | `BLOCKED` | `UNKNOWN` | `NOT GRADED` |

Provenance follow-up (“Why should I trust that conclusion?”): `BLOCKED`  
MCP→LLM→final-answer provenance: `BLOCKED`

Do **not** infer MCP tool usage from answer quality. Without tool-call evidence, usage is `UNKNOWN`.

## Brain tool exercise

Brain-side tool calls (deterministic adapter, not LLM): **10/10** succeeded.

## Security

**10/10** checks passed (traversal, symlink escape, shell injection query, unknown tool, corrupt store, trace caps, invalid snapshot, determinism).

## Write semantics

- Read tools never write.
- `brain_snapshot` action `rebuild` may write only under `<root>/.agentdoctor/project-brain/`.

## Limitations

- Authenticated Cursor / Claude Code / Codex LLM conversations were not available in this environment.
- `NOT AVAILABLE` (missing CLI / not logged in) is kept separate from `FAIL`.
- Product architecture was not changed to force agent MCP usage.

## Machine report

See [results.json](./results.json).
