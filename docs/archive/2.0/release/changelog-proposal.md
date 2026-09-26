# AgentDoctor 2.0 — Changelog proposal

> **Promoted.** This proposal was applied to `CHANGELOG.md` as
> **`[2.0.0] — 2026-09-21`** during the formal version cut.
> Canonical changelog: [`CHANGELOG.md`](../../../CHANGELOG.md).
> Package version in tree: **2.0.0** (not committed / tagged / published by the cut alone).

The historical proposal body follows for audit trail.

---

## [2.0.0] — 2026-09-21

AgentDoctor 2.0 expands the product from Safety + Project Brain into **codebase intelligence** for developers, agents, and engineering teams — while preserving Safety CLI behavior and Brain MCP tool names.

### Added

- Shared contracts layer (`CONTRACTS_VERSION`) unifying findings / graph / knowledge / policy shapes.
- Repository Brain productization: `init`, proposal artifacts, `brain review` / `brain proposals` / product snapshots (proposals never auto-approved).
- TypeScript/JavaScript AST intelligence graph (`graph`) with regex fallback.
- Git engineering intelligence (`health`) with per-metric method disclosure.
- C4-style architecture views (`c4`) labeled inferred/proposed.
- Impact surfaces: `impact`, `test-impact`, `refactor-impact`.
- Governed knowledge store with abstention (`knowledge`, `knowledge-create`, `knowledge-approve`).
- Policy packs + AgentDoctor-controlled enforcement runner (`enforce`) distinct from evaluate-only firewall.
- Combined MCP server (`agentdoctor mcp`) exposing Brain tools **plus** intelligence tools without renaming `brain_*`.
- Dashboard `/api/v2/*` endpoints (graph, health, c4, knowledge, projects/workspaces stubs).
- Local-dev team authentication (`team-register`, `team-login`) — not enterprise SSO.
- Ops health via `doctor --json`.
- Security hardening: MCP/dashboard path-safety, symlink skip in AST walk, secret redaction on exports/API samples.
- Documentation tree: `docs/2.0/` (overview, guides, reports, audits, release prep).

### Security

- Path-traversal hardening for MCP `dependency_lookup` and dashboard hostile URLs.
- Evaluate-only policy evaluation remains explicit (`executionResult: "not-executed"`).
- `blocked-by-enforcement` only on the AgentDoctor-controlled runner block path.
- Loopback dashboard default retained; non-loopback requires explicit opt-in.

### Compatibility

- Safety `scan` / `fix` / `verify` workflows and exit codes preserved.
- Brain MCP tool names preserved (`brain_overview`, …, `brain_snapshot`).
- Additive CLI commands only; no intentional removal of 1.x public surfaces.
- Platform evaluate-only firewall behavior preserved.

### Known limitations (at release)

- AST analysis is TypeScript/JavaScript-focused; other languages unsupported for deep graph analysis.
- Test-impact is heuristic/graph-based (no coverage-file oracle).
- C4 views are inferred, not approved architecture truth.
- No IDE interception of third-party agents.
- Local-dev team auth is not SSO.
- SQLite/Postgres/vector backends are not production-complete.
- See `docs/2.0/overview/known-limitations.md` and the README limitations section.

### Migration notes

- Upgrading from 1.1.x: existing `.agentdoctor` Safety/Brain data remains valid.
- New directories may appear under `.agentdoctor/repository-brain/`, `.agentdoctor/knowledge/`, `.agentdoctor/team/`, `.agentdoctor/platform/`.
- Treat `init` outputs as **proposed** until reviewed.
- Prefer `agentdoctor mcp` for combined tools; `brain-mcp` remains for Brain-only clients.
- Full guide: `docs/2.0/guides/migration.md`.

### Notes

- Readiness matrix classifications remain honest; many 2.0 surfaces are **implemented but partially validated**.
- Changelog promotion does **not** mean npm `2.0.0` has been published.
