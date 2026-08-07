# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.0-beta] — 2026-08-07

Minor beta: completes the Scan → Fix → Verify CLI loop and corrects release-facing honesty.

### Added

- `agentdoctor verify` — re-scan and compare against a prior `scan --json` baseline
  (`fixed` / `remaining` / `new` / `unchanged`). Supports `--json`, `--ci` (fails on new
  findings), `--baseline`, and `--min-score`. Completes the Scan → Fix → Verify CLI loop.
- Terminal summary prints overall readiness (`N/100`); category/agent scores remain in JSON.

### Fixed

- `agentdoctor scan --json` (and `--ci` / `--verbose` / `--min-score` on the `scan`
  subcommand) now honor flags correctly. Overlapping root/subcommand options are read via
  Commander `optsWithGlobals()`, so CI scripts using `scan … --json` receive JSON instead of
  a terminal report.
- `instructions/missing-path-reference` no longer treats Go/npm module imports
  (`github.com/…`, `@scope/pkg`), Go stdlib paths (`io/ioutil`), glob patterns, code tokens
  (`try/finally`), or bare build roots (`dist/`) as missing local paths.
- `agentdoctor fix` now reports skip reasons for review/manual findings instead of an empty
  “no applicable fixes” message with no explanation.
- Sample/test/example paths and env templates no longer inflate security/context false positives.

### Compatibility

- Default Action `version` input is `0.3.0-beta` (pin CI smoke to last published until npm ships)
- Fix remains Cursor `.cursorignore` safe-context only; security findings stay review/manual

### Planned

- GitHub Action score-gate inputs (deferred; see scoring.md v2+)

## [0.2.0-beta] — 2026-08-02

Minor beta: deterministic readiness scoring and CLI `--min-score` enforcement.

### Added

- Deterministic readiness scoring (v1): `scan()` populates `scoringAvailable: true` and
  `scores` (`overall`, `categories`, `agents`) from post-dedupe findings
  ([docs/scoring.md](docs/scoring.md))
- CLI `--min-score N` enforcement: exit code `1` when `scores.overall < N`
- `--ci` without `--min-score` remains report-only (exit `0` on successful scan)
- Scoring specification and compatibility / exit-code docs updated for shipped behavior

### Compatibility

- No new JSON top-level fields (`scoringModel` / `scoreExplanation` deferred)
- Findings, rule IDs, and agent detection unchanged
- GitHub Action remains `--ci --json` report-only (no score-gate inputs)
- Default Action `version` input is `0.2.0-beta`

## [0.1.4-beta] — 2026-08-02

Backward-compatible distribution release: first-class GitHub Action packaging. CLI and scanner behavior are unchanged from 0.1.3-beta.

### Added

- Composite GitHub Action (`action.yml`) that installs the published `@praneeth_54/agentdoctor` package and emits a workspace-contained JSON report
- CI `action-smoke` matrix covering normal/nested output paths and rejection of traversal, parent-symlink escape, final-file symlink, and directory output targets
- README GitHub Action usage section and ROADMAP update for CI packaging

### Compatibility

- No scanner, rule, or JSON finding-schema changes
- Scoring remains unavailable (`scoringAvailable: false`)
- `--min-score` remains accepted but ignored until scoring ships
- Default Action `version` input is `0.1.4-beta` (exact npm version or `latest` / `beta` dist-tags)

## [0.1.3-beta] — 2026-07-29

Backward-compatible security-signal and detection-quality patch.

### Security

- Repositories without supported agent configuration no longer receive an unqualified clean result when relevant repository-risk findings exist
- Agent exposure and repository risk remain semantically distinct (`affectedAgents` is empty when exposure is not asserted)
- Additive `agentSecurityAnalysis` field: `full` | `limited`
- Environment templates (`.env.example`, `.env.sample`, `.env.template`, `.env.dist`) receive informational treatment
- Common environment backup filenames (`.env_backup`, `.env_old`, `.env_local`) receive conservative warning treatment

### Detection

- Prevent false Django detection from arbitrary nested `settings.py` files
- Detect nested FastAPI projects using dependency + `app/main.py` structure evidence
- Detect React from nested project manifests
- Prevent Poetry detection from generic non-Poetry `pyproject.toml` files (for example hatchling)
- Improve multi-stack terminal summaries for multi-project repositories

### Testing

- Added Excepta FastAPI/React/Flutter and security-semantics fixtures/tests
- Total test suite is now 122 tests
- Three real-world regression families validated (ProxyShield, Flutter/Laravel multi-app, Excepta)

## [0.1.2-beta] — 2026-07-29

Backward-compatible quality patch.

### Fixed

- More reliable CLI/package binary execution (local bin shim + executable CLI entry)
- Nested `context/generated-directory` ignore handling and precise evidence paths
- Multi-project repository detection without requiring Node workspace tooling
- Mixed Composer / Pub / npm package-manager detection
- False malformed-package diagnostic when root `package.json` is absent
- Conservative credential-file detection for `.der` and service-account JSON names
- Quieter permission diagnostics under already-skipped directories

### Testing

- Added real-world multi-app, generated-directory, credential, and CLI bin fixtures/tests
- Total test suite is now 104 tests

## [0.1.1-beta] — 2026-07-29

Patch release.

### Fixed

- False missing-path warnings for repository-root paths referenced from nested instruction files
- CSS-like backtick tokens such as `.content` being interpreted as filesystem paths

### Testing

- Added real-world regression fixtures
- Added 17 regression tests
- Total test suite is now 91 tests

## [0.1.0-beta] — 2026-07-29

First public beta.

### Added

- CLI: `scan` (default), `explain`, `doctor`, `fix` stub
- Flags: `--json`, `--ci`, `--verbose`, `--min-score`, `--version`, `--help`
- Repository detection (languages, frameworks, package managers, monorepos)
- Agent adapters for Cursor, Claude Code, and Codex
- Rule engine with security, context, instruction, and MCP findings
- Stable rule IDs and cross-agent finding deduplication
- Terminal and JSON reporters
- Programmatic `scan()` API
- Fixture-based unit and integration tests

### Changed

- Published npm package as `@praneeth_54/agentdoctor` (unscoped `agentdoctor` blocked by npm as too similar to `agent-doctor`)

### Security

- Conservative wording for exposure findings
- Secret values never printed
- Repository boundary enforcement for paths and symlinks
- Control-character sanitization in output

### Known limitations

- Readiness scores are not yet available (`scoringAvailable: false`)
- Automatic fixes are not applied
- Not a complete secret scanner
- Git “tracked secret” detection deferred

[Unreleased]: https://github.com/pranee54/AgentDoctor/compare/v0.3.0-beta...HEAD
[0.3.0-beta]: https://github.com/pranee54/AgentDoctor/releases/tag/v0.3.0-beta
[0.2.0-beta]: https://github.com/pranee54/AgentDoctor/releases/tag/v0.2.0-beta
[0.1.4-beta]: https://github.com/pranee54/AgentDoctor/releases/tag/v0.1.4-beta
[0.1.3-beta]: https://github.com/pranee54/AgentDoctor/releases/tag/v0.1.3-beta
[0.1.2-beta]: https://github.com/pranee54/AgentDoctor/releases/tag/v0.1.2-beta
[0.1.1-beta]: https://github.com/pranee54/AgentDoctor/releases/tag/v0.1.1-beta
[0.1.0-beta]: https://github.com/pranee54/AgentDoctor/releases/tag/v0.1.0-beta
