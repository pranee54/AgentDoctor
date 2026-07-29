# Architecture

AgentDoctor is a CLI-first, local-first auditor for AI coding agent configuration.

## Pipeline

```text
Discovery
   │  bounded walk · ignore heavy dirs · size limits
   ▼
Project detection
   │  language · framework · package manager · monorepo
   ▼
Agent adapters
   │  pluggable registry (Cursor · Claude Code · Codex · …)
   ▼
Rule engine
   │  shared RuleContext · registered rules · no terminal coupling
   ▼
Findings
   │  deterministic IDs · cross-agent dedupe · fixability metadata
   ▼
Reporters
      terminal (human) · JSON (CI / machines)
```

Scoring and automatic fixes are intentionally separate later stages.

## Package layout

```text
src/
  cli/           command parsing and process exit codes
  agents/        adapter interface + registry + detectors
  core/
    scanner/     public scan() orchestration
    rules/       rule types, runner, security/context/instructions/mcp
    mcp/         project MCP config parsing (no execution)
    scoring/     reserved for readiness scoring
  detectors/     repository fingerprinting
  discovery/     filesystem walk
  reporters/     terminal + JSON
  security/      redaction / sanitization helpers
  types/         shared contracts
  index.ts       programmatic API
```

## Design principles

1. **Zero config** for first use
2. **Useful offline** — no API key for core features
3. **Local-first / privacy-first** — no default upload
4. **Never modify files** unless explicitly requested (future fix mode)
5. **Every finding explains why** and, when possible, what to do
6. **Adapters over hardcoding** — new agents register without rewriting the scanner
7. **Minimal dependencies**
8. **Strict TypeScript**

## Public API

```ts
import { scan } from "@praneeth_54/agentdoctor";

const result = await scan({ cwd: process.cwd() });
```

Scanning must not depend on terminal formatting.

## CLI surface

```text
agentdoctor [path]
agentdoctor scan [path]
agentdoctor explain <rule>
agentdoctor doctor
agentdoctor fix          # reserved
agentdoctor --json
agentdoctor --ci
agentdoctor --verbose
agentdoctor --version
agentdoctor --help
```

## Related docs

- [Rules catalog](rules.md)
- [Exit codes](exit-codes.md)
- [Development](development.md)
- [Roadmap](../ROADMAP.md)
