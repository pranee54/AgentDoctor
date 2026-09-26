# AgentDoctor 2.0 — CLI Documentation

Package: `@praneeth_54/agentdoctor@2.0.0`. Binary: `agentdoctor`.

## Safety (preserved)

- `scan` — audit agent configs
- `fix` / `fix-undo` / `fix-history` — Safe Fix
- `verify` — re-check after fixes
- `explain` — rule help
- `doctor` — install / ops health (`--json` for structured ops)

## Repository Brain

- `init` — write **PROPOSED** artifacts only
- `brain init|status|inspect|rebuild|history|search|export|import`
- `brain snapshot|update|review|proposals` — productization lifecycle

## Intelligence / platform surfaces

- `graph [--mode auto|regex|typescript-ast]`
- `health` — git hotspots
- `impact` / `test-impact`
- `refactor-impact --symbol <name>`
- `c4` — architecture views
- `knowledge` / `knowledge-create` / `knowledge-approve`
- `enforce --command <cmd>` — controlled runner check (no execute by default)
- `team-register` / `team-login` — **local-dev only**
- `session [--id]`
- `report` — platform scan + export
- `platform …` — existing platform subcommands
- `dashboard` — local UI
- `changes` / `context-health` / `secrets` / `baseline` / `pr-review` / …

## MCP

- `brain-mcp --root <path>` — Brain tools only (names preserved)
- `mcp --root <path>` — Brain + intelligence tools

Exit codes unchanged from Safety layer conventions.
