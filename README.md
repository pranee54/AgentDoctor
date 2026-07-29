# AgentDoctor

**Lighthouse for AI coding agents.**

AgentDoctor audits a repository’s AI coding agent configuration — instructions, ignore rules, permissions, and MCP setup — using local static analysis. No API key. No upload by default.

```bash
npx agentdoctor
```

|                |                                                                                     |
| -------------- | ----------------------------------------------------------------------------------- |
| **What it is** | A CLI health check for agent config in your repo                                    |
| **Why use it** | Catch misconfigurations, sensitive context exposure, and instruction problems early |
| **Install**    | `npx agentdoctor` or `npm install -g agentdoctor`                                   |
| **Requires**   | Node.js 20+                                                                         |

[![CI](https://img.shields.io/github/actions/workflow/status/pranee54/AgentDoctor/ci.yml?branch=main&label=CI)](https://github.com/pranee54/AgentDoctor/actions)
[![npm](https://img.shields.io/npm/v/agentdoctor?label=npm)](https://www.npmjs.com/package/agentdoctor)
[![Node](https://img.shields.io/node/v/agentdoctor)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Release](https://img.shields.io/badge/release-v0.1.0--beta-orange)](CHANGELOG.md)

---

## Demo

```text
$ npx agentdoctor

AgentDoctor v0.1.0-beta

Repository
  Framework: Next.js
  Language: TypeScript
  Package manager: npm
  Files scanned: 46

AI Coding Agents

✓ Cursor       configured
✓ Claude Code  configured
✓ Codex        configured

Findings

CRITICAL

  ✗ Sensitive environment file may enter agent context
    .env.production
    Affected: Claude Code, Codex
    Fix: Exclude the file from agent context and keep it out of version control.

WARNING

  ! Large instruction file
    CLAUDE.md — 38 KB

Summary

  1 critical
  1 warning
  0 info

Scoring is not included in this beta
```

---

## Why AgentDoctor exists

Teams adopt AI coding agents quickly and accumulate project instructions, ignore rules, MCP servers, and permission settings. Those files are easy to misconfigure and hard to review consistently.

| Tooling analogy | Domain                           |
| --------------- | -------------------------------- |
| Lighthouse      | Web pages                        |
| `npm audit`     | Dependencies                     |
| ESLint          | Source code                      |
| **AgentDoctor** | **AI coding agent environments** |

AgentDoctor analyzes configuration files. It does not run agents or edit your project.

---

## Installation

### One-shot

```bash
npx agentdoctor
```

### Global (optional)

```bash
npm install -g agentdoctor
agentdoctor
```

### Library

```bash
npm install agentdoctor
```

```ts
import { scan } from "agentdoctor";

const result = await scan({ cwd: process.cwd() });
console.log(result.summary);
```

---

## Quick start

```bash
# Scan the current directory
npx agentdoctor

# Scan a path
npx agentdoctor ./my-app

# Machine-readable output
npx agentdoctor --json

# Extra detail (paths, timing, finding rationale)
npx agentdoctor --verbose

# Explain a rule
npx agentdoctor explain security/env-file-exposure

# Environment health check
npx agentdoctor doctor
```

---

## Features

| Capability                                              | Status  |
| ------------------------------------------------------- | ------- |
| Zero-config first run                                   | ✓       |
| Works offline / no API key                              | ✓       |
| Detects project-level agent configuration               | ✓       |
| Deterministic security / context / instruction findings | ✓       |
| Inspects supported MCP project configuration            | ✓       |
| Stable JSON output for CI                               | ✓       |
| `explain <rule>` documentation                          | ✓       |
| Readiness scoring                                       | Planned |
| Safe automatic fixes                                    | Planned |
| Official GitHub Action package                          | Planned |

### Feature comparison

| Concern                                      | Manual review | Generic linters | AgentDoctor      |
| -------------------------------------------- | ------------- | --------------- | ---------------- |
| Agent instruction files present and usable   | Manual        | —               | ✓                |
| Empty or duplicated instructions             | Manual        | —               | ✓                |
| Sensitive filenames vs agent access patterns | Manual        | Partial         | ✓ (conservative) |
| Broad MCP filesystem scopes                  | Manual        | —               | ✓                |
| Large always-on instruction files            | Manual        | —               | ✓                |
| Uploads repository by default                | —             | Sometimes       | **Never**        |

---

## What it detects

### Supported agents

| Agent       | Project-level detection                    |
| ----------- | ------------------------------------------ |
| Cursor      | Rules, ignore files, MCP, `AGENTS.md`      |
| Claude Code | Instructions, settings, rules, MCP         |
| Codex       | `AGENTS.md` / overrides, project `.codex/` |

### Finding categories

Security, context efficiency, instruction quality, and MCP configuration. Full catalog: [docs/rules.md](docs/rules.md).

Adapters are pluggable — additional agents can be registered without rewriting the scanner.

---

## Architecture

```text
┌─────────────┐
│  Discovery  │  bounded filesystem walk
└──────┬──────┘
       ▼
┌─────────────────┐
│ Project detect  │  language / framework / package manager
└──────┬──────────┘
       ▼
┌─────────────────┐
│ Agent adapters  │  Cursor · Claude Code · Codex
└──────┬──────────┘
       ▼
┌─────────────────┐
│  Rule engine    │  security · context · instructions · MCP
└──────┬──────────┘
       ▼
┌─────────────────┐
│    Findings     │  deterministic IDs · deduped · fixability metadata
└──────┬──────────┘
       ▼
┌─────────────────┐
│   Reporters     │  terminal · JSON
└─────────────────┘
```

Details: [docs/architecture.md](docs/architecture.md)

---

## JSON output

```bash
npx agentdoctor --json
```

```json
{
  "version": "0.1.0-beta",
  "repository": {
    "primaryFramework": "nextjs",
    "primaryLanguage": "typescript",
    "filesScanned": 46
  },
  "agents": [
    {
      "id": "cursor",
      "detected": true,
      "configured": true,
      "status": "configured"
    }
  ],
  "findings": [
    {
      "id": "security/env-file-exposure:.env.production",
      "ruleId": "security/env-file-exposure",
      "category": "security",
      "severity": "critical",
      "title": "Sensitive environment file may enter agent context",
      "affectedAgents": ["claude-code", "codex"],
      "fixability": "review"
    }
  ],
  "summary": { "critical": 1, "warning": 0, "info": 0, "total": 1 },
  "scoringAvailable": false,
  "scores": null
}
```

Exit codes: [docs/exit-codes.md](docs/exit-codes.md)

---

## Privacy

**Your code stays on your machine.**

Normal scans do not:

- send source code to external services
- require authentication
- call an LLM
- execute project code
- start MCP servers
- enable telemetry by default

If anonymous telemetry is ever introduced, it will be opt-in.

---

## FAQ

**Does AgentDoctor require an API key?**  
No. Core scanning is local and deterministic.

**Is this a secret scanner?**  
No. It uses conservative filename and configuration heuristics. It never prints secret values and does not claim complete coverage.

**Will it modify my repository?**  
Not in this release. `agentdoctor fix` is reserved for a future safe-fix mode.

**Can I use it in CI?**  
Yes — prefer `--json`. `--min-score` is ignored until readiness scoring ships.

**How do I understand a finding?**

```bash
npx agentdoctor explain <rule-id>
```

---

## Documentation

Start at [docs/README.md](docs/README.md).

| Doc                                            | Contents                    |
| ---------------------------------------------- | --------------------------- |
| [docs/architecture.md](docs/architecture.md)   | Pipeline and package layout |
| [docs/rules.md](docs/rules.md)                 | Stable rule IDs             |
| [docs/exit-codes.md](docs/exit-codes.md)       | Process exit codes          |
| [docs/compatibility.md](docs/compatibility.md) | Beta compatibility promises |
| [docs/development.md](docs/development.md)     | Local development           |
| [ROADMAP.md](ROADMAP.md)                       | Near- and medium-term plans |
| [CHANGELOG.md](CHANGELOG.md)                   | Release history             |

---

## Roadmap

See [ROADMAP.md](ROADMAP.md). Highlights:

1. Deterministic readiness scoring
2. Conservative auto-fix for safe findings
3. Packaged GitHub Action
4. Additional agent adapters

---

## Contributing

Issues and pull requests are welcome.

1. Read [CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md)
2. Set up locally with [docs/development.md](docs/development.md)
3. Report security issues via [SECURITY.md](SECURITY.md)

```bash
git clone https://github.com/pranee54/AgentDoctor.git
cd AgentDoctor
npm install
npm run typecheck && npm run lint && npm test && npm run build
node dist/cli/index.js ./fixtures/clean-configured-project
```

---

## License

[MIT](LICENSE) © AgentDoctor Contributors
