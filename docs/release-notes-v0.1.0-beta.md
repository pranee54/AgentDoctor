# Release notes — v0.1.0-beta

**AgentDoctor** — Lighthouse for AI coding agents.

First public beta. Local, deterministic repository audits for AI coding agent configuration.

## Install

```bash
npx agentdoctor@0.1.0-beta
```

Or from source after cloning:

```bash
npm install
npm run build
node dist/cli/index.js
```

## Features

- Zero-config scan of a repository path
- Detection of project-level configuration for Cursor, Claude Code, and Codex
- Deterministic findings across security, context, instructions, and MCP
- Stable JSON output for automation
- `agentdoctor explain <rule>` for rule documentation
- Local scans: no API key, no default network upload, no remote model calls

## Example

```bash
npx agentdoctor
npx agentdoctor --json
npx agentdoctor explain security/env-file-exposure
```

## Known limitations

- Readiness scores are not shipped yet (`scores: null`)
- `agentdoctor fix` does not modify files yet
- Findings use conservative heuristics — not a full secret scanner
- Some agent behaviors that are undocumented are intentionally not asserted

## Roadmap

See [ROADMAP.md](../ROADMAP.md):

1. Scoring
2. Safe auto-fix
3. GitHub Action

## Feedback

- Bugs / features: GitHub Issues
- Security: [SECURITY.md](../SECURITY.md)

Thank you for trying the beta.
