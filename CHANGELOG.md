# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [3.0.0] — 2026-09-26

Public release of the **AgentDoctor 3.0 local core**: project intelligence, doctors,
student/agent workflows, MCP, dashboard, evidence/proof, and honest EXTERNAL
boundaries. AI providers remain **opt-in**. Correctness is never claimed.

Limitations: [docs/LIMITATIONS.md](docs/LIMITATIONS.md).
Release prep: [docs/FINAL_PRE_RELEASE_CHECK.md](docs/FINAL_PRE_RELEASE_CHECK.md).

### Highlights

- **Project intelligence** — discovery, DNA, Brain, software map, hybrid search,
  dependency/lockfile analysis, architecture contracts, git/change impact.
- **Project Chat** — deterministic `ask` / `chat` with truth labels
  (`VERIFIED` | `INFERRED` | `UNKNOWN` | `EXTERNAL`); optional AI when configured.
- **Coding agent** — plan → human approval → path-safe tools → verify; no
  unrestricted shell; `ENGINEERING_CORRECTNESS_NOT_CLAIMED` preserved.
- **Student workflows** — `learn`, viva, docs, Build With Me (explain → plan →
  approve → apply → verify).
- **Security & approval** — Security Doctor (static), secret redaction, forensic
  read-only mode, MCP approval tokens + planHash (bare `approved:true` rejected).
- **Evidence & verification** — change analysis, evidence bundles, change proof
  (hash integrity; engineering correctness not claimed).
- **MCP** — combined server with **38** tools (project, intelligence, agent,
  assurance); path/workspace escape blocked.
- **Dashboard** — embedded local UI + APIs (status, DNA, graph, search, security,
  twin, what-if, forensic, chat).
- **Digital Twin / What-If** — local refreshable twin snapshot; graph-derived
  impact with uncertainty (not certainty).
- **Doctors** — API, Database, Event, Security, Privacy, Incident, Deployment
  (file/static evidence); live runtime / IdP / brokers remain **EXTERNAL**.
- **Evaluation Lab** — fixture-driven eval including prompt-injection detect-only.
- **Self-diagnosis** — product self-check surfaces.

### Providers (local)

- Implemented: `none` | `mock` | `openai-compatible` | `ollama`.
- Native Anthropic / Gemini SDKs: **not implemented** (fail closed via `none`).

### Limitations (not unfinished stubs)

- Live cloud/DB/K8s/APM runtime intelligence: **EXTERNAL**.
- Neural embeddings / enterprise IdP-SSO: **EXTERNAL**.
- Full compiler-grade AST/call binding for every language: not claimed.
- Not an OS sandbox / EDR; not a replacement for commercial SAST/SCA.
- Proof asserts hash integrity — not absolute engineering correctness.

### Docs / packaging

- Rebuilt public README; public docs under `docs/`; audits in `docs/internal/`.
- npm package contents: `dist`, `README.md`, `LICENSE`, `CHANGELOG.md`.
- GitHub Action default package pin: **3.0.0**.

## [2.1.0] — 2026-09-23

Optional Project AI Agent line on top of 2.0.1 assurance. AI remains **opt-in**.
Historical notes: [docs/internal/RELEASE_2_1_0.md](docs/internal/RELEASE_2_1_0.md).
Checklist: [docs/internal/RELEASE_CHECKLIST_2_1_0.md](docs/internal/RELEASE_CHECKLIST_2_1_0.md).

#### Project Intelligence

- Project-aware context retrieval (Brain / graph / planContext orchestration).
- Project Chat CLI (`agentdoctor chat` / `ask`) with evidence-backed answers.
- Truth labels: `VERIFIED` | `INFERRED` | `UNKNOWN` | `EXTERNAL`.

#### AI Agent

- Provider abstraction (`ModelProvider`): `none` | `mock` | `openai-compatible` | `ollama`.
- Optional AI architecture: model reasons; AgentDoctor provides context, controls tools, verifies results.
- Native Anthropic / Gemini SDKs remain **NOT IMPLEMENTED** (fail closed via `none`).

#### Agent Tools

- Read / search tools (path-safe).
- Create / edit / delete with diffs (approval required).
- Controlled command and test execution via `runControlledCommand` (`shell=false`).
- Coding loop: PLAN → APPROVAL → TOOLS → OBSERVE → VERIFY.

#### Safety

- Path safety and symlink-dir escape rejection on writes.
- Workspace isolation when `WorkspaceModel` is provided; otherwise repo-root binding.
- Mode `allowWrites` enforcement (LEARN hard-blocks writes).
- Approval gates (`--approve` / `approvedByHuman`); model cannot self-approve.
- Dangerous command blocking; prompt-injection data separation (`PROJECT_DATA` / `TOOL_OUTPUT_UNTRUSTED`).
- Secret redaction (reuses existing redaction infrastructure).
- Hard agent limits: tool calls, iterations, wall time, files modified, context chars.

#### Verification

- Post-change analysis / evidence / proof / architecture (where applicable).
- Optional controlled test run (`--run-tests`).
- Always preserves `ENGINEERING_CORRECTNESS_NOT_CLAIMED`.

#### Student

- `agentdoctor learn` — project explain, viva, docs.
- Default student experience: **BUILD_WITH_ME** (explain → plan → teach → approve → `runCodingLoop` → verify).
- Rich interactive student UI remains **PARTIAL**.

#### MCP

- Agent tools: `project_context`, `project_ask`, `code_search`, `file_read`, `file_create`, `file_edit`, `agent_plan`, `change_verify`.
- No unrestricted shell.
- `project_ask` fail-closed when provider is `none`.
- MCP `approved=true` is **trusted-caller input**, not cryptographic human identity; MCP does not carry `AgentMode`.

#### Dashboard

- Project Chat via `POST /api/chat` (ask-only; no file writes).
- Fail-closed when AI provider resolves to `none` (no silent mock fallback).

#### Known limitations

- Not an OS sandbox / EDR (**EXTERNAL LIMITATION**).
- Native Anthropic / Gemini SDKs **NOT IMPLEMENTED**.
- Correctness is never guaranteed.
- MCP approval is trusted-caller input (not cryptographic human identity); MCP does not carry AgentMode.
- Rich interactive student UI remains **PARTIAL**.

## [2.0.1] — 2026-09-23

Hardening and change-assurance cut on top of 2.0.0, plus a deepening pass that
closes controllable PARTIALs with honest EXTERNAL/EXPERIMENTAL gates. Canonical
docs: [docs/2.0.1/](docs/2.0.1/README.md). Completion map:
[docs/2.0.1/FINAL_COMPLETION_AUDIT.md](docs/2.0.1/FINAL_COMPLETION_AUDIT.md).

### Added

- Change assurance CLI: `agentdoctor change analyze|verify|explain|diff|status`
  assemble repository signals into a structured `ChangeAssessment`.
- Evidence bundles under `.agentdoctor/evidence/<change-id>/` with versioned
  `manifest.json` and SHA-256 file hashes; `evidence inspect|verify`.
- Change Proof CLI: `proof build|inspect|explain|verify|export` (integrity +
  optional engineering checks; `correctnessStatus` always
  `ENGINEERING_CORRECTNESS_NOT_CLAIMED`).
- Architecture contract: `architecture init|analyze|check|explain`.
- Optional coverage-backed test impact (`--coverage`) with explicit
  `testAttribution` labels (`coverage-map` / `hybrid-heuristic` / `none`).
- Controlled runner: `run` / `run explain` and `policy check|explain|enforce`
  (execute only when explicitly allowed).
- Policy composition (builtin pack + `.agentdoctor/policy.json`).
- Incremental graph surfaces: `graph build|update|rebuild|status`.
- Workspace isolation CLI: `workspace create|add|list|status|remove`.
- Language adapters: Python/PHP toolchain bridges; Go honest unsupported stub;
  Java/Kotlin/Rust/Dart unsupported stubs.
- Storage: SQLite (`node:sqlite`) and Postgres (`tryCreatePostgresStorage`) with
  env/runtime gates.
- Auth library path: OIDC JWT/JWKS validation + RBAC helpers (browser OAuth
  redirect remains experimental).
- Combined MCP tools: `change_analyze`, `architecture_check`, `proof_inspect`,
  `evidence_inspect`, `graph_query`.
- Docs: `docs/2.0.1/` including FINAL_COMPLETION_AUDIT and updated limitations.

### Changed

- Package positioning: engineering assurance for AI coding agents; description
  and keywords updated (`change-assurance`, `evidence`, `engineering-assurance`).
- Action default `version` input and CI published-package pins → **2.0.1**.
- `npm run verify` builds before tests so STDIO MCP suites use fresh `dist/`.
- Firewall load path seeds DEFAULT_POLICY when no repo policy exists; force-push
  is `require-approval` (not hard-block via baseline pack alone).
- README / CONTRIBUTING / ROADMAP aligned to honest status labels.

### Fixed

- CodeQL high alerts: crypto usage, ReDoS hardening, temp-file handling, and
  TOCTOU fixes across secrets scan, graph/health/tokens, team auth, and related
  tests.
- CI Typecheck / Lint / Test / Build: track plugin fixtures previously ignored
  under `.agentdoctor/`, and normalize TypeScript AST source paths so Windows
  runners match discovered files.
- Language adapter barrel exports (`pythonAvailable` / `phpAvailable` /
  `goAvailable`) kept consistent.

### Security

- CodeQL-driven hardening on path/temp and regex surfaces (see Fixed).
- Central path safety helpers; secret severity≠confidence fields.
- Change assurance / policy path remains evaluate-only by default
  (`executionResult: "not-executed"`); no fake full browser SSO.

### Known limitations (at release)

- Test impact is heuristic without coverage; hybrid when coverage lacks a test
  map.
- Architecture C4 impact remains **inferred**; contract is repo-local only.
- Proof `verified` / hash integrity ≠ engineering correctness or compliance.
- Browser OAuth incomplete (EXPERIMENTAL); Postgres needs live URL (EXTERNAL);
  Java/Kotlin/Rust/Dart/Go AST extractors EXTERNAL; IDE interception EXTERNAL.
- Published npm Action pins require a human `npm publish` of 2.0.1 before remote
  CI against `version: 2.0.1` succeeds.

## [2.0.0] — 2026-09-21

AgentDoctor 2.0 expands the product from Safety + Project Brain into **codebase
intelligence** for developers, agents, and engineering teams — while preserving
Safety CLI behavior and Brain MCP tool names.

Canonical docs: [docs/2.0/](docs/2.0/README.md). Readiness:
[docs/2.0/overview/readiness-matrix.md](docs/2.0/overview/readiness-matrix.md).
Limitations: [docs/2.0/overview/known-limitations.md](docs/2.0/overview/known-limitations.md).

### Added

- Shared contracts layer (`CONTRACTS_VERSION`) unifying findings / graph /
  knowledge / policy shapes.
- Repository Brain productization: `init`, proposal artifacts, `brain review` /
  `brain proposals` / product snapshots (proposals never auto-approved).
- TypeScript/JavaScript AST intelligence graph (`graph`) with regex fallback.
- Git engineering intelligence (`health`) with per-metric method disclosure.
- C4-style architecture views (`c4`) labeled inferred/proposed.
- Impact surfaces: `impact`, `test-impact`, `refactor-impact`.
- Governed knowledge store with abstention (`knowledge`, `knowledge-create`,
  `knowledge-approve`).
- Policy packs + AgentDoctor-controlled enforcement runner (`enforce`) distinct
  from evaluate-only firewall.
- Combined MCP server (`agentdoctor mcp`) exposing Brain tools **plus**
  intelligence tools without renaming `brain_*`.
- Dashboard `/api/v2/*` endpoints (graph, health, c4, knowledge,
  projects/workspaces stubs).
- Local-dev team authentication (`team-register`, `team-login`) — not enterprise SSO.
- Ops health via `doctor --json`.
- Security hardening: MCP/dashboard path-safety, symlink skip in AST walk,
  secret redaction on exports/API samples.
- Documentation tree: `docs/2.0/` (overview, guides, reports, audits, release).
- Additional 2.0 platform / Safety surfaces landed with this release train:
  evaluate-only Action Policy Evaluator (`platform policy-check`, alias
  `firewall-check`), session audit, provenance, context-security, architecture
  drift, time-machine, token planner, readiness scorecard, multi-format reports,
  Copilot / Windsurf / Gemini CLI / Aider adapters, Project Brain CLI
  (`brain init|status|inspect|rebuild|history|search|export|import`),
  `changes`, `context-health`, `secrets`, Safe Fix 2.0 backup/undo, named
  baselines, monorepo `packages`, local `pr-review`, loopback `dashboard`,
  `plugins`, optional `local-ai`.

### Security

- Path-traversal hardening for MCP `dependency_lookup` and dashboard hostile URLs.
- Evaluate-only policy evaluation remains explicit (`executionResult: "not-executed"`).
- `blocked-by-enforcement` only on the AgentDoctor-controlled runner block path.
- Loopback dashboard default retained; non-loopback requires explicit opt-in.
- Safe Fix target hardening: refuse symlink write-through, symlink ancestors,
  directory targets, and non-allowlisted paths.

### Compatibility

- Safety `scan` / `fix` / `verify` workflows and exit codes preserved.
- Brain MCP tool names preserved (`brain_overview`, …, `brain_snapshot`).
- Additive CLI commands only; no intentional removal of 1.x public surfaces.
- Platform evaluate-only firewall behavior preserved.

### Known limitations (at release)

- AST analysis is TypeScript/JavaScript-focused; other languages unsupported for
  deep graph analysis.
- Test-impact is heuristic/graph-based (no coverage-file oracle).
- C4 views are inferred, not approved architecture truth.
- No IDE interception of third-party agents.
- Local-dev team auth is not SSO.
- SQLite/Postgres/vector backends are not production-complete.
- See README limitations and `docs/2.0/overview/known-limitations.md`.

### Migration notes

- Upgrading from 1.1.x: existing `.agentdoctor` Safety/Brain data remains valid.
- New directories may appear under `.agentdoctor/repository-brain/`,
  `.agentdoctor/knowledge/`, `.agentdoctor/team/`, `.agentdoctor/platform/`.
- Treat `init` outputs as **proposed** until reviewed.
- Prefer `agentdoctor mcp` for combined tools; `brain-mcp` remains for Brain-only clients.
- Full guide: [docs/2.0/guides/migration.md](docs/2.0/guides/migration.md).

### Notes

- Readiness matrix classifications remain honest; many 2.0 surfaces are
  **implemented but partially validated**. No blanket 5/5 claims.
- Multi-writer Safe Fix is still not fully atomic across targets after preflight.
- Vitest 3 → 4/5 major upgrade remains deferred (dev-only moderate advisory).
- Do **not** auto-publish from CI agents. Tag/publish require a separate human step.

## [1.1.1] — 2026-09-20

Patch release: Marketplace Action naming + dependency security pins. npm, git tag,
GitHub Release, and Action default are aligned on **`1.1.1`**.

### Changed

- GitHub Action Marketplace display name is now `AgentDoctor Safety`.
- npm overrides pin patched transitive versions: `js-yaml@4.3.2`, `fast-uri@3.1.8`,
  `hono@4.13.8`, `qs@6.16.0`.
- Fixture `fixtures/multi-agent-project` pins `next@15.5.24` (scan fixture only).
- Action default `version` input and CI smoke pins use `1.1.1`.

### Security

- Clears known high/moderate advisories on transitive lint/MCP stack dependencies
  without changing the Safety CLI public API.
- Vitest / `@vitest/mocker` moderate advisory deferred (requires major upgrade).

### Docs

- [docs/archive/DEPENDENCY_SECURITY_AUDIT.md](docs/archive/DEPENDENCY_SECURITY_AUDIT.md)
- [docs/archive/DEPENDABOT_PR_REVIEW.md](docs/archive/DEPENDABOT_PR_REVIEW.md)
- [docs/release-notes/v1.1.1.md](docs/release-notes/v1.1.1.md)

## [1.1.0] — 2026-08-13

Minor release: Brain → MCP → Agent consumption for Project Brain (Safety V1 unchanged).

### Added

- Project Brain MCP bridge (`agentdoctor brain-mcp --root <path>`): STDIO MCP server
  exposing evidence-backed Brain tools (`brain_overview`, `brain_query`, `brain_explain`,
  `brain_trace`, `brain_claims`, `brain_evidence`, `brain_ownership`, `brain_risk`,
  `brain_delta`, `brain_snapshot`) with provenance envelopes. Local-only; no API key.
  Docs: [docs/mcp/brain-mcp.md](docs/mcp/brain-mcp.md). Examples: [examples/mcp/](examples/mcp/).
  Demo: [docs/demo/brain-mcp-demo.md](docs/demo/brain-mcp-demo.md).
  Validation: [validation/mcp-agent/](validation/mcp-agent/).

### Changed

- Build packaging now includes `src/core/understanding/**` and `src/mcp/**` so the
  `brain-mcp` CLI command can run from `dist/` (Safety public API export remains
  Scan/Fix/Verify-focused).
- MCP tool descriptions explicitly mark READ vs CONTROLLED WRITE (`brain_snapshot` rebuild
  only under `.agentdoctor/project-brain/`).

### Notes

- Product promise: help AI coding agents understand what is in a repository, what can be
  trusted, and why. Not a generic coding assistant, not RAG, not chatbot memory.
- Authenticated third-party agent LLM smoke (Cursor / Claude Code / Codex Q1–Q7) remains an
  environment/auth gate; engineering MCP + Brain contracts pass without it.

## [1.0.0] — 2026-08-12

First production release: Scan → Fix → Verify → CI contract frozen for v1.

### Added

- Claude Code safe-context Fix writer: `agentdoctor fix` appends allowlisted
  `permissions.deny` Read rules to `.claude/settings.json` for
  `context/generated-directory` and `context/large-log-file` when Claude Code is
  configured (alongside existing Cursor `.cursorignore` fixes).
- Codex safe-context Fix writer: `agentdoctor fix` merges allowlisted filesystem
  `deny` keys into `.codex/config.toml` permission profiles for the same safe
  context findings when Codex is detected. Skips when `sandbox_mode` is set or
  `default_permissions` selects a built-in `:…` profile.
- GitHub Action / CLI CI policy enforcement: `minimum-score` / `--min-score`,
  `fail-on-severity` / `--fail-on-severity`, `fail-on-rule` / `--fail-on-rule`,
  `fail-on-new` / `--fail-on-new`, `verify-baseline`, `json-output`, `summary` /
  `--summary`, and `annotations` / `--annotations`. Action `version: workspace`
  runs the checked-out `dist/cli` for local CI.
- Guided Next steps on failed `scan` / `fix` / `verify` terminal output, and on
  GitHub Step Summary when a policy gate fails — shortest path back to green
  (reproduce → fix or explain → verify).
- Windows CI quality job (Node 20) and Windows-safe Fix/Action overwrite writes.
- Action smoke coverage for `fail-on-rule`, `verify-baseline`, and baseline
  symlink escape rejection.

### Fixed

- `instructions/missing-path-reference` also resolves non-`./` paths relative to the
  instruction file directory (monorepo package docs), while root-level instruction
  files still require repository-root paths. Corpus-100: 121 → 88 findings for this
  rule (−33); other rules unchanged.
- `context/generated-directory` and `context/large-log-file` honor Claude Code Read
  deny exclusions when computing `affectedAgents`, so Fix → Verify clears Claude
  context findings after a deny rule is applied.
- The same rules honor Codex filesystem deny keys in `.codex/config.toml` when
  computing `affectedAgents`.
- Action writes the JSON report even when a policy gate fails (exit `1`), so
  artifacts remain available for triage.
- `--min-score` / Action `minimum-score` fail when no supported agents are
  configured (`agentSecurityAnalysis: limited`) instead of passing on a vacuous 100.
- Terminal readiness prints `n/a` when analysis is limited (no agents).
- Agentless first scan no longer shows a green “No agent-configuration findings”
  success line; it tells the user to add Cursor / Claude Code / Codex config and
  re-run.
- Invalid `--min-score` values exit `2` (usage) instead of `3` (internal).
- Codex Fix refuses invalid `.codex/config.toml` during planning (same as Claude
  invalid JSON) instead of silently skipping Codex and writing Cursor-only fixes.
- Codex Fix refuses unrecognizable / invalid `.codex/config.toml` content instead of
  appending permission profiles into garbage TOML.
- `agentdoctor fix` exits `2` when confirmation is cancelled (non-TTY without `--yes`)
  or when Fix refuses invalid settings / cannot write due to permissions.
- `scan --ci` now fails (exit `1`) when any **critical** finding exists. Omit `--ci` for
  report-only scans. The GitHub Action stays report-only unless policy inputs are set
  (it no longer passes a bare `--ci`).
- Discovery keeps oversized log/dump-like paths as size metadata so
  `context/large-log-file` flags files above the content-read limit (previously silent
  false negatives for the largest logs).
- Action `verify-baseline` re-checks workspace containment after `realpath` so a
  workspace-relative symlink cannot escape to an outside file.
- Fix writers and Action report overwrite use Windows-safe replace (rename cannot
  overwrite an existing destination on Windows).

### Compatibility

- CLI + JSON + rule ID contracts frozen for v1 (see [docs/reference/compatibility.md](docs/reference/compatibility.md))
- Action `version` input default is `1.0.0` (bumped after npm published `@praneeth_54/agentdoctor@1.0.0`)

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
  ([docs/reference/scoring.md](docs/reference/scoring.md))
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

[Unreleased]: https://github.com/pranee54/AgentDoctor/compare/v3.0.0...HEAD
[3.0.0]: https://github.com/pranee54/AgentDoctor/compare/v2.1.0...v3.0.0
[2.1.0]: https://github.com/pranee54/AgentDoctor/compare/v2.0.1...v2.1.0
[2.0.1]: https://github.com/pranee54/AgentDoctor/compare/v2.0.0...v2.0.1
[2.0.0]: https://github.com/pranee54/AgentDoctor/compare/v1.1.1...v2.0.0
[1.1.1]: https://github.com/pranee54/AgentDoctor/releases/tag/v1.1.1
[1.1.0]: https://github.com/pranee54/AgentDoctor/releases/tag/v1.1.0
[1.0.0]: https://github.com/pranee54/AgentDoctor/releases/tag/v1.0.0
[0.3.0-beta]: https://github.com/pranee54/AgentDoctor/releases/tag/v0.3.0-beta
[0.2.0-beta]: https://github.com/pranee54/AgentDoctor/releases/tag/v0.2.0-beta
[0.1.4-beta]: https://github.com/pranee54/AgentDoctor/releases/tag/v0.1.4-beta
[0.1.3-beta]: https://github.com/pranee54/AgentDoctor/releases/tag/v0.1.3-beta
[0.1.2-beta]: https://github.com/pranee54/AgentDoctor/releases/tag/v0.1.2-beta
[0.1.1-beta]: https://github.com/pranee54/AgentDoctor/releases/tag/v0.1.1-beta
[0.1.0-beta]: https://github.com/pranee54/AgentDoctor/releases/tag/v0.1.0-beta
