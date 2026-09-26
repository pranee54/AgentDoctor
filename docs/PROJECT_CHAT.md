# Project Chat (2.1)

**Status:** IMPLEMENTED · **Release:** NOT PERFORMED

## CLI

```bash
agentdoctor chat [path]
agentdoctor ask "How does login work?" [path]
```

## Truth labels

VERIFIED | INFERRED | UNKNOWN | EXTERNAL

## Security

Repository content is wrapped as PROJECT_DATA (untrusted). Prompt injection in README/source is ignored as instructions.

## Dashboard

Loopback dashboard includes Project Chat (`POST /api/chat`) — ask-only, no file writes.

**Fail-closed:** when `AGENTDOCTOR_AI_PROVIDER` resolves to `none`, `/api/chat` returns `provider-none` (HTTP 503). Silent Mock fallback is disabled. Use `AGENTDOCTOR_AI_PROVIDER=mock` (or openai-compatible) explicitly.

## Institutional memory (related)

`queryMemory(root, query)` merges Brain, decision ledger, change ledger, and DNA (substring ranking). **Maturity:** PARTIAL — not semantic search; see `docs/PROJECT_BRAIN.md`.
