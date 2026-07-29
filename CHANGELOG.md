# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned

- Deterministic readiness scoring
- Safe automatic fixes
- Packaged GitHub Action

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

[Unreleased]: https://github.com/pranee54/AgentDoctor/compare/v0.1.1-beta...HEAD
[0.1.1-beta]: https://github.com/pranee54/AgentDoctor/releases/tag/v0.1.1-beta
[0.1.0-beta]: https://github.com/pranee54/AgentDoctor/releases/tag/v0.1.0-beta
