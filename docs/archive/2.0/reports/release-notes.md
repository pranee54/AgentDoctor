# AgentDoctor 2.0 — Release Notes (pre-release)

**npm version:** `1.1.1` (unchanged)
**Date:** 2026-09-21
**Status:** In-repository complete implementation push — **not** an official 2.0.0 publish

## Added

- Shared core contracts (`src/contracts`) with adapters
- Repository Brain initializer + proposal review CLI
- TypeScript AST intelligence graph with regex fallback
- Git hotspot / co-change / bus-factor analysis with method disclosure
- Dead-code epistemic categories
- C4-style inferred architecture views
- Governed knowledge store with abstention
- Storage provider abstraction (FS/memory; SQLite flag off)
- Policy packs + controlled enforcement runner interface
- Local-dev team auth (scrypt) + RBAC helpers
- Combined MCP server (`agentdoctor mcp`) preserving Brain tool names
- Dashboard `/api/v2/*` graph/health/c4/knowledge endpoints
- Ops health probe (`doctor --json`)
- Full `AGENTDOCTOR_2.0_*.md` documentation set

## Preserved

- Safety scan/fix/verify contracts and exit codes
- Project Brain store + Brain MCP tool names
- Platform evaluate-only firewall behavior
- Loopback dashboard defaults

## Explicitly not in this pre-release

- npm version bump to 2.0.0
- Enterprise SSO
- Production SQLite/Postgres/vector backends
- Multi-language AST parity
- Invented accuracy/performance scores

See `AGENTDOCTOR_2.0_KNOWN_LIMITATIONS.md` and `AGENTDOCTOR_2.0_READINESS_MATRIX.md`.
