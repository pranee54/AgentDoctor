# Roadmap

AgentDoctor aims to be the standard health check for AI coding agent environments.

## Released

### v1.0.0 — Scan → Fix → Verify → CI

First production release. Contracts frozen in [docs/compatibility.md](docs/compatibility.md).

- Local: `doctor` → `scan` → `fix` → `verify`
- CI: GitHub Action policy gates → Step Summary **Next** → local reproduce / fix / explain → verify → push
- Safe context Fix: Cursor `.cursorignore`, Claude Code Read deny, Codex filesystem deny
- Shared policy evaluator: `--min-score`, `--fail-on-severity`, `--fail-on-rule`, `--fail-on-new`
- `scan --ci` fails on critical findings (report-only = omit `--ci`)
- Windows CI quality job + Windows-safe Fix overwrite

Engineering priority after v1: user-reported bugs, corpus-driven precision, performance regressions, and adoption feedback — not more workflow chrome.

**Precision policy:** Prefer small, measurable precision improvements over large architectural rewrites. Ship the largest _safe_ corpus-backed slice; leave harder residual noise until new evidence appears.

### Readiness scoring (v0.2.0-beta → v1)

Deterministic 0–100 scores derived from current findings. Documented in [docs/scoring.md](docs/scoring.md).

### CI packaging (v0.1.4-beta → v1)

- First-class GitHub Action wrapping the published CLI and emitting a JSON artifact
- Policy inputs and `version: workspace` for local Action CI against `dist/cli`

## Near term

### Scoring follow-ups (v2+)

- Deferred items listed in [docs/scoring.md](docs/scoring.md)

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
- Shipping a Software Understanding / Project Brain product in the published V1 CLI pack (Brain remains a separate laboratory module; see [docs/project-brain.md](docs/project-brain.md))
- Memory layers, RAG, vector/graph databases, or chat products as part of AgentDoctor V1

Suggestions welcome via GitHub issues.
