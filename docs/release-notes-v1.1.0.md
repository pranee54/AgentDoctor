# AgentDoctor v1.1.0

Minor release after Safety V1 (`1.0.0`): **Brain → MCP → Agent**.

## Product shape

```text
AgentDoctor
    │
    ├── Safety
    │     └── Scan → Fix → Verify → Policy → CI
    │
    └── Project Brain
          │
          ├── Understanding / Evidence / Confidence
          ├── Ownership / Risk / Claims / Snapshots
          ├── Delta / Explain / Trace
          │
          ▼
        MCP (STDIO)
          │
  Cursor · Claude Code · Codex
          │
          ▼
    AI coding agent
```

Promise: help AI coding agents understand what is in a repository, what can be trusted, and why.

Not a generic coding assistant. Not chatbot memory. Not RAG.

## Highlights

- `agentdoctor brain-mcp --root <path>` — local STDIO MCP server (required `--root`)
- Ten evidence-backed tools with provenance envelopes
- Controlled write only: `brain_snapshot` rebuild under `.agentdoctor/project-brain/`
- Safety Scan → Fix → Verify → CI unchanged

## Install (after npm publish)

```bash
npx @praneeth_54/agentdoctor@1.1.0
```

```bash
agentdoctor brain-mcp --root /absolute/path/to/project
```

Action consumers can keep pinning `version: "1.0.0"` for Safety-only CI until they intentionally adopt `1.1.0`. Bump the Action default `version` input only after npm has published `1.1.0`.

## Docs

- [CHANGELOG.md](../CHANGELOG.md)
- [docs/mcp/brain-mcp.md](mcp/brain-mcp.md)
- [docs/project-brain.md](project-brain.md)
- [docs/demo/brain-mcp-demo.md](demo/brain-mcp-demo.md)
- [validation/mcp-agent/](../validation/mcp-agent/)

## Owner publish checklist (manual)

1. Confirm `npm run verify` and validation scripts green on the release commit
2. `npm publish` (owner only)
3. Git tag `v1.1.0` + GitHub Release from these notes
4. Optionally bump Action default `version` to `1.1.0` in a follow-up commit

Do **not** publish, tag, or push from unattended agents unless the owner explicitly requests it.
