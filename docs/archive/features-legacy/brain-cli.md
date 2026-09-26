# Project Brain CLI

```bash
agentdoctor brain init [path]
agentdoctor brain status [path] [--json]
agentdoctor brain inspect [path] [--json]
agentdoctor brain rebuild [path] [--json]
agentdoctor brain history [path] [--json]
agentdoctor brain search <query> [path] [--json]
agentdoctor brain export --file out.json [--snapshot <id>] [path]
agentdoctor brain import --file in.json [path]
```

## Behavior

- Wraps `LocalBrainStore` under `.agentdoctor/project-brain/`.
- `rebuild` compiles via `compileProjectBrain` and saves a snapshot (identical content is idempotent).
- Search is deterministic substring matching over claims/components/unknowns/limitations.
- Export/import always go through storage redaction (`redactBrainForStorage`).
- MCP `brain-mcp` remains the agent-facing STDIO surface; CLI is for humans/scripts.

## Migration

Existing Brain stores from 1.x continue to load when schema-compatible. Corrupt or incompatible meta fails closed via `BrainStorageError`.
