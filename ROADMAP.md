# Roadmap

AgentDoctor aims to be the standard health check for AI coding agent environments.

## Released

### Readiness scoring (v0.2.0-beta)

Deterministic 0–100 scores derived from current findings:

- Overall
- Security / Context / Instructions / MCP / Compatibility / Performance
- Per-agent readiness
- CLI `--min-score` enforcement (`--ci` alone remains report-only)

Documented in [docs/scoring.md](docs/scoring.md).

### CI packaging (v0.1.4-beta)

- First-class GitHub Action wrapping the published CLI and emitting a JSON artifact

## Near term

### Safe fixes

Conservative, reversible fixes with dry-run and confirmation:

- Ignore entries for sensitive / generated paths
- Non-destructive boilerplate only when safe

### Scoring follow-ups (v2+)

- Terminal readiness line
- GitHub Action `min-score` / severity-gate inputs
- Other deferred items listed in [docs/scoring.md](docs/scoring.md)

## Medium term

- Additional agent adapters via the existing registry
- Richer MCP analysis without executing servers
- Badge generation strategy from CI artifacts (no misleading hosted service required for v1)
- Broader instruction quality heuristics (still deterministic, no LLM required)

## Longer term

- Optional opt-in telemetry (off by default)
- Optional AI-assisted analysis as a clearly separated, key-gated feature
- Hosted badge service (separate product decision)

## Non-goals

- Replacing coding agents
- Becoming an LLM gateway
- Claiming complete security certification

Suggestions welcome via GitHub issues.
