# AgentDoctor Quickstart

Get from GitHub clone to an evidence-backed Project Brain MCP call in about five minutes.

## What AgentDoctor does

AgentDoctor builds a local **Project Brain** — structured repository understanding with claims, evidence, confidence, ownership, change-danger risks, snapshots, and deltas — and exposes it to AI coding agents through **STDIO MCP**.

It also ships **Safety V1**: Scan → Fix → Verify for Cursor / Claude Code / Codex configuration.

## Who should use it

- Developers using Cursor, Claude Code, or Codex who want repository-level context, not only file search
- Maintainers who want agents to respect evidence and **UNKNOWN** instead of inventing owners
- Contributors improving Brain quality, fixtures, MCP docs, or Safety rules

## Problem it solves

Agents can read files; they still struggle with architecture, blast radius, ownership, and “why should I trust that?” AgentDoctor answers those questions with provenance, not chat memory.

## Prerequisites

- Node.js **20+**
- Absolute path to the repository you want to understand
- (Optional) Cursor / Claude Code / Codex for MCP consumption

## Installation

Package: `@praneeth_54/agentdoctor` · CLI: `agentdoctor` · Version: **1.1.0**

```bash
npx @praneeth_54/agentdoctor@1.1.0 --help
# or
npm install -g @praneeth_54/agentdoctor
agentdoctor --help
```

From a clone of this repository (for MCP examples that point at `dist/cli`):

```bash
git clone https://github.com/pranee54/AgentDoctor.git
cd AgentDoctor
npm install
npm run build
```

## First Project Brain MCP server

`--root` is **required** (never defaults to `process.cwd()`).

```bash
agentdoctor brain-mcp --root /ABSOLUTE/PATH/TO/YOUR/PROJECT
```

From this repo after `npm run build`:

```bash
node dist/cli/index.js brain-mcp --root /ABSOLUTE/PATH/TO/YOUR/PROJECT
```

On first start with no snapshot, the server may **compile** a Brain under:

```text
<project>/.agentdoctor/project-brain/
```

That directory is **local runtime state** — do not commit it. For large repositories, prefer building a snapshot before attaching an agent (see MCP docs).

Logs go to **stderr**. Protocol traffic stays on **stdout**.

## MCP setup

Copy examples from [examples/mcp/](../examples/mcp/). Replace absolute paths. Keep configs **project-local**; do not commit machine-specific paths.

### Cursor

[examples/mcp/cursor.mcp.json](../examples/mcp/cursor.mcp.json):

```json
{
  "mcpServers": {
    "agentdoctor-brain": {
      "command": "node",
      "args": [
        "/ABSOLUTE/PATH/TO/AgentDoctor/dist/cli/index.js",
        "brain-mcp",
        "--root",
        "/ABSOLUTE/PATH/TO/YOUR/PROJECT"
      ]
    }
  }
}
```

### Claude Code

Same shape: [examples/mcp/claude-code.mcp.json](../examples/mcp/claude-code.mcp.json).

### Codex

[examples/mcp/codex.config.toml](../examples/mcp/codex.config.toml) — merge under `[mcp_servers.agentdoctor-brain]`.

After a global install you may point `command` at `agentdoctor` with the same `brain-mcp --root …` arguments (host-dependent).

## First MCP call

Ask the agent (or your MCP client) to call **`brain_overview`**.

Documented compact shape from the fixture demo ([docs/demo/brain-mcp-demo.md](demo/brain-mcp-demo.md)):

```json
{
  "snapshot": {
    "id": "snap_b87e5fd824105d4ea705827b",
    "schemaVersion": "1.0.0",
    "contentHash": "cbba01b8ad190ffe8dde47624f7ce355",
    "confidenceEnvelope": 0.74
  },
  "domains": ["Orders", "…"],
  "entrypoints": 3,
  "components": 38,
  "activeClaims": 22,
  "risks": 15,
  "ownership": "UNKNOWN without CODEOWNERS / MAINTAINERS / package maintainers"
}
```

Successful tools also return a **provenance envelope** (`ok`, `result`, `evidenceIds`, `confidence`, `snapshot`, optional `claimStatus`). See [docs/mcp/brain-mcp.md](mcp/brain-mcp.md).

## Expected result

- MCP lists ten tools: `brain_overview`, `brain_query`, `brain_explain`, `brain_trace`, `brain_claims`, `brain_evidence`, `brain_ownership`, `brain_risk`, `brain_delta`, `brain_snapshot`
- Overview includes snapshot id/hash and confidence
- Missing ownership stays **UNKNOWN** (not invented)

## Troubleshooting

| Symptom                    | Check                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------- |
| `project root is required` | Pass `--root` with an absolute path                                                   |
| MCP protocol broken        | Nothing else may write to stdout; use stderr for logs                                 |
| Empty / slow first connect | Large roots compile on cold start; rebuild snapshot first                             |
| `brain_corrupt`            | Remove `<root>/.agentdoctor/project-brain` and rebuild, or fix disk corruption        |
| Empty ownership            | Add CODEOWNERS / MAINTAINERS / package maintainers — or accept UNKNOWN                |
| Agent “didn’t use MCP”     | Without tool-call evidence, usage is UNKNOWN — do not infer from answer quality alone |

## Current limitations (honest)

- Brain risk is **change-danger**, not CVE/SAST scanning
- Ownership is explicit-evidence only
- Confidence is rule-derived / uncalibrated
- Authenticated third-party LLM Q1–Q7 grading may be environment-blocked; MCP contracts still validate without it
- No separate non-MCP Brain query CLI — agent consumption is via `brain-mcp`

## Deeper docs

| Doc                                                | Purpose                  |
| -------------------------------------------------- | ------------------------ |
| [demo/first-5-minutes.md](demo/first-5-minutes.md) | Practical walkthrough    |
| [demo/brain-mcp-demo.md](demo/brain-mcp-demo.md)   | Fixture-backed MCP story |
| [mcp/brain-mcp.md](mcp/brain-mcp.md)               | Full MCP contract        |
| [project-brain.md](project-brain.md)               | Brain data model         |
| [why-agentdoctor.md](why-agentdoctor.md)           | Product rationale        |
| [../ROADMAP.md](../ROADMAP.md)                     | Shipped vs planned       |
