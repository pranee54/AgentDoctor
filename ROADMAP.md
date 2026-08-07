# Roadmap

AgentDoctor aims to be the standard health check for AI coding agent environments.

## Released

### Readiness scoring (v0.2.0-beta)

Deterministic 0–100 scores derived from current findings:

- Overall
- Security / Context / Instructions / MCP / Compatibility / Performance
- Per-agent readiness
- CLI `--min-score` enforcement
- Terminal overall readiness line (`N/100`, or `n/a` when analysis is limited)

Documented in [docs/scoring.md](docs/scoring.md).

### Safe context Fix writers

Conservative, reversible fixes with dry-run and confirmation:

- Cursor `.cursorignore` (published `0.3.0-beta`)
- Claude Code `permissions.deny` Read rules and Codex filesystem `deny` keys (Unreleased in this repository)

### CI packaging (v0.1.4-beta)

- First-class GitHub Action wrapping the published CLI and emitting a JSON artifact

### CI policy enforcement (Unreleased)

- Shared policy evaluator reused by CLI + Action
- Action inputs: `minimum-score`, `fail-on-severity`, `fail-on-rule`, `fail-on-new`, `verify-baseline`, `json-output`, `summary`, `annotations`
- CLI flags: `--fail-on-severity`, `--fail-on-rule`, `--fail-on-new`, `--summary`, `--annotations`
- `scan --ci` fails on critical findings (report-only = omit `--ci`; published `0.3.0-beta` `--ci` remains report-only)
- `version: workspace` for local Action CI against `dist/cli`

### Scan → Fix → Verify → CI loop (complete)

First-user workflow is feature-complete and frozen unless real users report friction:

- Local: `doctor` → `scan` → `fix` → `verify`
- CI: GitHub Action policy failure → Step Summary **Next** → local reproduce / fix / explain → verify → push
- Terminal Next footers on scan, fix, and verify point to the shortest path back to green

Engineering priority after this milestone: user-reported bugs, corpus-driven precision, performance regressions, and adoption feedback — not more workflow chrome.

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

Suggestions welcome via GitHub issues.
