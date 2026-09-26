# Optional local AI

```bash
agentdoctor local-ai [--provider none|mock|ollama] [--prompt "..."] [--json]
```

## Rules

- Core Safety / Brain / Fix **never** require AI.
- Default provider is `none`.
- `mock` returns labeled `[AI-GENERATED]` text for tests.
- `ollama` calls `http://127.0.0.1:11434` with timeout; failures return an `error` field (fail closed).
- Inputs are redacted (`redactForModel`) before optional calls.
- AI output must not bypass Safe Fix validation (AI is not in the apply path).
