# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Publish as scoped package `@praneeth_54/agentdoctor` (unscoped `agentdoctor` blocked by npm as too similar to `agent-doctor`)

### Fixed

- Track fake credential fixtures required by CI (were excluded by `.gitignore`)
- Align package and docs URLs with the public GitHub repository
- Release workflow selects notes by tag and attaches the npm tarball
- CLI help text matches shipped capabilities (`--min-score` no-op until scoring)

### Planned

- Deterministic readiness scoring
- Safe automatic fixes
- Packaged GitHub Action

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

[Unreleased]: https://github.com/pranee54/AgentDoctor/compare/v0.1.0-beta...HEAD
[0.1.0-beta]: https://github.com/pranee54/AgentDoctor/releases/tag/v0.1.0-beta
