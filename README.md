# AgentDoctor

Evidence-backed Project Brain for AI Coding Agents

![AgentDoctor hero](docs/assets/agentdoctor-hero.svg)

AI coding agents can read files. They still lack reliable **repository-level** understanding — what is in a project, what evidence supports a claim, what is dangerous to change, and what must stay **UNKNOWN**.

AgentDoctor analyzes a repository, builds a structured **Project Brain** (claims, evidence, confidence, ownership, risks, snapshots, deltas), and exposes it to agents through local **STDIO MCP**.

[![npm](https://img.shields.io/npm/v/@praneeth_54/agentdoctor?label=npm)](https://www.npmjs.com/package/@praneeth_54/agentdoctor)
[![CI](https://img.shields.io/github/actions/workflow/status/pranee54/AgentDoctor/ci.yml?branch=main&label=CI)](https://github.com/pranee54/AgentDoctor/actions/workflows/ci.yml)
[![Node](https://img.shields.io/node/v/@praneeth_54/agentdoctor)](https://nodejs.org)
[![License](https://img.shields.io/github/license/pranee54/AgentDoctor)](LICENSE)

[Documentation](docs/README.md) · [Project Brain](docs/project-brain.md) · [MCP](docs/mcp/brain-mcp.md) · [Demo](docs/demo/brain-mcp-demo.md) · [Security](SECURITY.md) · [Roadmap](ROADMAP.md)

```text
Repository
   ↓
Project Understanding
   ↓
Project Brain
   ↓
Evidence / Claims / Confidence
   ↓
MCP
   ↓
AI Coding Agent
```

Also ships **Safety V1**: Scan → Fix → Verify → Policy → CI for Cursor, Claude Code, and Codex configuration. Brain risk is **change-danger analysis**, not vulnerability scanning.

---

## What is AgentDoctor?

Local developer infrastructure for AI coding agents (`@praneeth_54/agentdoctor`, CLI `agentdoctor`, **1.1.0**, Node.js **20+**).

It:

- analyzes repositories with deterministic discovery passes
- builds a structured Project Brain
- represents claims with typed evidence and confidence
- preserves **UNKNOWN** when evidence is missing
- persists snapshots and computes deltas
- exposes Brain capabilities through MCP (`agentdoctor brain-mcp --root <path>`)

It is **not** an autonomous coding agent, chatbot, RAG memory product, AGI claim, or vulnerability scanner. It does not claim universal or perfect repository understanding.

---

## Why Project Brain?

Agents edit with fragmented context. Ownership gets invented. Blast radius stays implicit. “Why should I trust that?” rarely has an answer with a snapshot id.

Project Brain structures understanding that exists in this codebase:

architecture · domains · components · entrypoints · dependencies · relationships · ownership · change-danger risks · claims · evidence · confidence · snapshots · deltas

Details: [docs/project-brain.md](docs/project-brain.md)

---

## Architecture

![Architecture](docs/assets/architecture.svg)

| Layer                     | Location                                                    |
| ------------------------- | ----------------------------------------------------------- |
| Understanding / discovery | `src/core/understanding/`                                   |
| Project Brain             | `src/core/understanding/brain/`                             |
| MCP bridge                | `src/mcp/brain/`                                            |
| CLI                       | `src/cli/commands/brain-mcp.ts`                             |
| Safety (separate path)    | `src/core/{scanner,rules,fix,verify,policy}/`, `action.yml` |

MCP depends on Brain. Brain does not depend on MCP.

---

## Project Brain

![Provenance](docs/assets/provenance.svg)

### Evidence & provenance

```text
Claim
  ↓
Evidence
  ↓
Snapshot
```

Successful MCP tools return a provenance envelope: `result`, `evidenceIds`, `confidence` (`[0,1]`, rule-derived / uncalibrated), `snapshot` (`id` + `contentHash`), and `claimStatus` when applicable.

Claim lifecycle: `ACTIVE` · `INVALIDATED` · `SUPERSEDED` · `CONTRADICTED`

Epistemics on evidence: `observed` | `inferred`. ACTIVE claims must reference evidence. Serialization redacts secret-like values.

### UNKNOWN semantics

```text
Ownership evidence unavailable
        ↓
     UNKNOWN
```

No invented owners. Contract: `preserve-unknown-never-invent`.

Local runtime store (not committed product source): `<repo>/.agentdoctor/project-brain/`.

---

## MCP

![MCP tools](docs/assets/mcp-tools.svg)

```text
AI Coding Agent → MCP client → agentdoctor brain-mcp --root <abs> → Project Brain
```

STDIO only. No API key. No upload. `--root` is required. Diagnostics on **stderr**; protocol on **stdout**.

### Tools (from `src/mcp/brain/tools/registry.ts`)

| Tool              | Purpose                                                |
| ----------------- | ------------------------------------------------------ |
| `brain_overview`  | Compact summary + confidence envelope                  |
| `brain_query`     | Typed `BrainQueryEngine` queries                       |
| `brain_explain`   | Evidence-backed `explainClaim`                         |
| `brain_trace`     | Capped deterministic `traceBrain`                      |
| `brain_claims`    | Claim lifecycle (default ACTIVE + CONTRADICTED)        |
| `brain_evidence`  | Typed redacted evidence                                |
| `brain_ownership` | Explicit CODEOWNERS / MAINTAINERS / package only       |
| `brain_risk`      | Change-danger risk (not SAST / CVE)                    |
| `brain_delta`     | Read-only snapshot comparison                          |
| `brain_snapshot`  | `current` · `history` · `compare` · `load` · `rebuild` |

Only controlled write: `brain_snapshot` `rebuild` under `<root>/.agentdoctor/project-brain/`.

Contract: [docs/mcp/brain-mcp.md](docs/mcp/brain-mcp.md)

---

## Real Cursor Agent Validation

![Agent validation](docs/assets/agent-validation.svg)

```text
Cursor Agent
    ↓
MCP discovery (agentdoctor-brain)
    ↓
brain_* tool call
    ↓
Project Brain
    ↓
Evidence-backed result (+ provenance)
```

Harness: `validation/mcp-agent` on `fixtures/understanding-dependencies-project`.

| Q   | Focus          | Expected tools                                    |
| --- | -------------- | ------------------------------------------------- |
| Q1  | Overview       | `brain_overview`                                  |
| Q2  | Entrypoints    | `brain_query`                                     |
| Q3  | Change risk    | `brain_risk`                                      |
| Q4  | Ownership      | `brain_ownership`                                 |
| Q5  | Impact / trace | `brain_trace`                                     |
| Q6  | Provenance     | `brain_explain`, `brain_claims`, `brain_evidence` |
| Q7  | Delta          | `brain_delta`, `brain_snapshot`                   |

Documented harness results ([validation/mcp-agent/README.md](validation/mcp-agent/README.md), 2026-08-13, AgentDoctor 1.1.0):

- Deterministic Brain tool exercise: **10/10** succeeded (actual tool calls, not prose inference)
- Cursor MCP tools discovered: **PASS** (all 10 listed)
- Security checks: **10/10**
- Provenance (tool-level): **PASS**
- Authenticated LLM Q1–Q7 grading: **BLOCKED** without agent login — kept separate from MCP contract PASS

Checks include grounding, UNKNOWN ownership guard, risk semantics, provenance, snapshot/delta semantics — not “zero hallucinations.”

Demo: [docs/demo/brain-mcp-demo.md](docs/demo/brain-mcp-demo.md)

---

## Built Through Real Validation

1.1.0 was hardened under real MCP, CI, and Windows pressure — not README theater.

| Problem                      | What we learned                                                                                                                                                                                                              |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MCP cold start               | Session loads latest snapshot or, by default, **compiles on first connect** (`buildIfMissing`). Large roots make host MCP timeouts more likely — prefer an existing snapshot / explicit `rebuild` before attaching an agent. |
| Large Brain init             | First compile writes under `.agentdoctor/project-brain/`; local Brain state ≠ committed source.                                                                                                                              |
| STDIO discipline             | Protocol on stdout only; logs on stderr (`src/mcp/brain/server.ts`, `tests/unit/mcp/`).                                                                                                                                      |
| Cross-process MCP tests      | Unit STDIO client + protocol tests matter more than assuming tool use from answer quality.                                                                                                                                   |
| Windows CLI                  | `.cmd` / POSIX shim pitfalls → invoke via `node` + `npm-cli.js`; native `cmd` quoting.                                                                                                                                       |
| Argument escaping            | CodeQL-driven hardening of Windows command argument escaping in test helpers.                                                                                                                                                |
| CI matrix                    | Ubuntu + Windows quality job; Project Brain laboratory requires `npm run build` before spawn (`f3cd550`).                                                                                                                    |
| Snapshots                    | Atomic writes, checksum fail-closed, refuse divergent overwrite of the same snapshot id.                                                                                                                                     |
| Terminal / injection surface | Findings must not become escape channels; Security policy calls out terminal escape injection.                                                                                                                               |
| UNKNOWN                      | Inventing ownership is a product failure mode.                                                                                                                                                                               |

---

## Repository Structure

![Repository layout](docs/assets/repository-architecture.svg)

```text
src/
├── core/
│   └── understanding/          # discovery + Project Brain
├── mcp/
│   └── brain/                  # STDIO MCP bridge
└── cli/
    └── commands/
        └── brain-mcp.ts

tests/
└── unit/
    ├── understanding/
    └── mcp/

validation/
├── project-brain/
├── software-understanding/
├── real-world/
└── mcp-agent/

docs/
├── assets/                     # README diagrams (this landing page)
├── mcp/
├── demo/
└── project-brain.md

examples/mcp/                   # Cursor / Claude Code / Codex config samples
```

Do not treat `.agentdoctor/` or project-local agent config dirs as committed AgentDoctor source.

---

## Validation

![Validation pipeline](docs/assets/validation-pipeline.svg)

```bash
npm run verify                 # typecheck · lint · format · unit · build
npm run verify:understanding
npm run verify:mcp
npm run verify:project-brain   # understanding + validate:project-brain + benchmark
npm run validate:mcp-agent
```

| Layer            | How verified                                            | Current note                                                                      |
| ---------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Core / Safety    | `npm run verify` + CI quality (Ubuntu/Windows)          | Live [CI badge](https://github.com/pranee54/AgentDoctor/actions/workflows/ci.yml) |
| Understanding    | `npm run verify:understanding`                          | Unit surface under `tests/unit/understanding/`                                    |
| Project Brain    | `npm run verify:project-brain` + CI `project-brain` job | Requires built CLI                                                                |
| MCP              | `npm run verify:mcp`                                    | Protocol + STDIO client tests                                                     |
| Agent validation | `npm run validate:mcp-agent`                            | MCP discovery **PASS**; LLM Q1–Q7 **BLOCKED** (see report)                        |
| Benchmark        | `benchmark:project-brain`                               | Part of `verify:project-brain`                                                    |
| Package          | npm `@praneeth_54/agentdoctor`                          | Published **1.1.0**                                                               |
| Security         | mcp-agent security suite + [SECURITY.md](SECURITY.md)   | Tool-level **10/10** in report                                                    |

Re-run the commands above for live status; do not treat this table as a substitute for CI.

---

## Installation

```bash
npx @praneeth_54/agentdoctor@1.1.0
# or
npm install -g @praneeth_54/agentdoctor
agentdoctor --help
```

```bash
agentdoctor brain-mcp --root /ABSOLUTE/PATH/TO/YOUR/PROJECT

agentdoctor .
agentdoctor scan . --json
agentdoctor fix . --dry-run
agentdoctor verify . --baseline agentdoctor-report.json
agentdoctor explain security/env-file-exposure
agentdoctor doctor
```

---

## MCP Quick Start

Configs: [examples/mcp/](examples/mcp/). Use placeholders — never commit machine paths.

**Cursor** ([examples/mcp/cursor.mcp.json](examples/mcp/cursor.mcp.json)):

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

Also: [examples/mcp/claude-code.mcp.json](examples/mcp/claude-code.mcp.json), [examples/mcp/codex.config.toml](examples/mcp/codex.config.toml).

Tip: rebuild or ensure a snapshot exists before attaching an agent if the repository is large.

---

## Design Boundaries

| AgentDoctor IS           | AgentDoctor IS NOT                 |
| ------------------------ | ---------------------------------- |
| Repository understanding | Chatbot                            |
| Structured Project Brain | Generic RAG / AI memory            |
| Evidence-backed claims   | Autonomous coding agent            |
| MCP interface            | Vulnerability scanner              |
| Change-danger analysis   | “Understands every repo perfectly” |
| Snapshots / deltas       | Zero-hallucination guarantee       |

---

## Release 1.1.0

Version verified in `package.json` / `PACKAGE_VERSION`: **1.1.0** (also on npm).

Shipped: Project Brain packaging, `brain-mcp`, ten provenance tools, snapshots/delta, agent validation harness + docs. Safety V1 unchanged.

[docs/release-notes-v1.1.0.md](docs/release-notes-v1.1.0.md) · [CHANGELOG.md](CHANGELOG.md)

GitHub Action default `version` input remains `1.0.0` unless you pin `1.1.0`.

---

## Documentation

| Doc                                                          | Contents                    |
| ------------------------------------------------------------ | --------------------------- |
| [docs/project-brain.md](docs/project-brain.md)               | Project Brain model         |
| [docs/mcp/brain-mcp.md](docs/mcp/brain-mcp.md)               | MCP contract                |
| [docs/demo/brain-mcp-demo.md](docs/demo/brain-mcp-demo.md)   | Demo narrative              |
| [docs/release-notes-v1.1.0.md](docs/release-notes-v1.1.0.md) | 1.1.0 notes                 |
| [SECURITY.md](SECURITY.md)                                   | Vulnerability reporting     |
| [ROADMAP.md](ROADMAP.md)                                     | Near / medium / longer term |
| [docs/README.md](docs/README.md)                             | Full index                  |

---

## Roadmap

From [ROADMAP.md](ROADMAP.md): scoring follow-ups; additional agent adapters; richer MCP config analysis without executing servers; optional opt-in telemetry and clearly separated key-gated AI-assisted analysis longer term. Non-goals: replacing coding agents, LLM gateway, complete security certification.

---

## Contributing

[CONTRIBUTING.md](CONTRIBUTING.md) · [Code of Conduct](CODE_OF_CONDUCT.md) · [good first issues](docs/good-first-issues.md)

```bash
git clone https://github.com/pranee54/AgentDoctor.git
cd AgentDoctor
npm install
npm run verify
```

---

## Security

Local analysis. No API key for core Brain/Safety. No default upload. Redacted Brain serialization.

Report privately via [SECURITY.md](SECURITY.md).

---

## License

[MIT](LICENSE) © AgentDoctor Contributors
