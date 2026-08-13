# AgentDoctor Roadmap

AgentDoctor is evolving from repository analysis into an **evidence-backed context layer for AI coding agents**.

```text
Today (shipped)
Repository → Project Understanding → Project Brain → MCP → AI Agent

Direction (not shipped)
Project Brain → Agent Context → Agent Reliability → Agent-Aware Development Infrastructure
```

Status legend:

- 🟢 **Shipped** — available in a published release
- 🟡 **Planned** — intended next product direction; not implemented
- 🔵 **Exploratory** — under consideration; may change or never ship

This document is milestone-based. It does **not** promise calendar dates.

---

## Priority

| Priority | Direction                                                                         | Status               |
| -------- | --------------------------------------------------------------------------------- | -------------------- |
| P0       | Safety Scan → Fix → Verify → CI                                                   | 🟢 Shipped (`1.0.x`) |
| P0       | Project Brain stability (claims, evidence, confidence, UNKNOWN, snapshots/deltas) | 🟢 Shipped (`1.1.0`) |
| P0       | Brain MCP reliability (STDIO, 10 tools, provenance, security controls)            | 🟢 Shipped (`1.1.0`) |
| P1       | Agent Context layer (task-relevant context packaging)                             | 🟡 Planned           |
| P1       | Context freshness / stale-context detection                                       | 🟡 Planned           |
| P1       | Change-aware agent context (Brain Delta evolution)                                | 🟡 Planned           |
| P1       | Agent reliability surfaces (pre/post-change risk, invalidation)                   | 🟡 Planned           |
| P2       | CI / pull-request Brain analysis                                                  | 🔵 Exploratory       |
| P2       | Team-scale Project Intelligence                                                   | 🔵 Exploratory       |
| P3       | Additional MCP transports beyond STDIO                                            | 🔵 Exploratory       |
| P3       | Optional telemetry / key-gated AI-assisted analysis                               | 🔵 Exploratory       |

Safety precision work continues in parallel: prefer corpus-backed, measurable improvements over large architectural rewrites ([docs/scoring.md](docs/scoring.md), [docs/compatibility.md](docs/compatibility.md)).

---

## Shipped

### 1.0.x — Safety Foundation — 🟢 Shipped

First production Safety contract (`1.0.0`): audit project-level AI coding agent configuration.

- Local: `doctor` → `scan` → `fix` → `verify`
- Deterministic static analysis for Cursor, Claude Code, and Codex project configs
- Safe context Fix: Cursor `.cursorignore`, Claude Code Read deny, Codex filesystem deny
- Shared policy gates: `--min-score`, `--fail-on-severity`, `--fail-on-rule`, `--fail-on-new`
- GitHub Action with JSON report artifact; `version: workspace` for local `dist/cli`
- Readiness scoring (0–100) — [docs/scoring.md](docs/scoring.md)
- Cross-platform CI (including Windows) and Windows-safe Fix overwrite
- Compatibility promises — [docs/compatibility.md](docs/compatibility.md)

Brain risk in later releases is **change-danger analysis**, not a replacement for Safety or a vulnerability scanner.

### 1.1.0 — Project Brain → MCP → Agent — 🟢 Shipped

Minor release after Safety V1. Product shape:

```text
AgentDoctor
    ├── Safety (unchanged) — Scan → Fix → Verify → Policy → CI
    └── Project Brain → MCP (STDIO) → AI coding agent
```

**Project Understanding / Project Brain** (`src/core/understanding/`, `src/core/understanding/brain/`):

- Structured project model (architecture, domains, components, entrypoints, dependencies, relationships)
- Claims with lifecycle (`ACTIVE` · `INVALIDATED` · `SUPERSEDED` · `CONTRADICTED`)
- Typed evidence (redacted; epistemics `observed` | `inferred`)
- Confidence contract (`[0,1]`, rule-derived / uncalibrated)
- **UNKNOWN** preserved (`preserve-unknown-never-invent`) — ownership is never invented
- Explicit ownership evidence only (CODEOWNERS / MAINTAINERS / package maintainers)
- Change-danger risks (centrality, coupling, unclear ownership, critical entrypoints — not SAST/CVE)
- Local snapshots under `.agentdoctor/project-brain/` + serializable deltas
- Query / explain / trace: `BrainQueryEngine`, `explainClaim`, `traceBrain`

**Brain MCP** (`src/mcp/brain/`, `agentdoctor brain-mcp --root <path>`):

- STDIO transport only (protocol on stdout; diagnostics on stderr)
- Required explicit `--root` (never silent `process.cwd()`)
- Ten tools: `brain_overview`, `brain_query`, `brain_explain`, `brain_trace`, `brain_claims`, `brain_evidence`, `brain_ownership`, `brain_risk`, `brain_delta`, `brain_snapshot`
- Provenance envelope on successful tool results
- Controlled write: `brain_snapshot` action `rebuild` only under `<root>/.agentdoctor/project-brain/`
- Security controls: containment, fail-closed corrupt stores, no secret plaintext in evidence

**Validation:**

- Understanding / Project Brain laboratory gates (`verify:understanding`, `verify:project-brain`)
- MCP protocol + STDIO client tests (`verify:mcp`)
- Real-agent harness (`validation/mcp-agent`) — Cursor MCP tool discovery exercised; authenticated LLM Q1–Q7 grading may remain environment-blocked
- Cross-platform CI hardening during the 1.1.0 release train

Docs: [docs/project-brain.md](docs/project-brain.md) · [docs/mcp/brain-mcp.md](docs/mcp/brain-mcp.md) · [docs/release-notes-v1.1.0.md](docs/release-notes-v1.1.0.md)

---

## NEXT — Agent Context Layer — 🟡 Planned

**Not implemented.** Direction only.

Move from exposing repository facts through MCP toward providing **higher-level, task-relevant context** to coding agents — the smallest useful context backed by the Brain.

```text
User Task
   ↓
Context Planner          ← planned
   ↓
Project Brain            ← shipped
   ↓
Relevant Claims / Evidence / Dependencies
   ↓
Context Package          ← planned
   ↓
AI Agent
```

Possible areas (future):

- context selection and prioritization
- task-aware retrieval from Project Brain
- relevant architecture / dependency slices
- evidence-aware context packaging
- context budgets and freshness

### Proposed future primitives (not current MCP tools)

These names are **proposals** for a future Agent Context surface. They are **not** shipped tools:

- `task_context`
- `relevant_components`
- `dependency_context`
- `architecture_context`
- `evidence_context`
- `change_context`

Current shipped tools remain the ten `brain_*` tools documented in [docs/mcp/brain-mcp.md](docs/mcp/brain-mcp.md).

---

## Agent Reliability — 🟡 Planned

**Not implemented.** Direction only.

Help agents answer not only “what exists?” but:

- What is safe to change?
- What evidence supports this?
- What changed since the previous snapshot?
- What should remain **UNKNOWN**?

Potential future capabilities:

- change-impact analysis beyond today’s capped `brain_trace` / `brain_risk`
- pre-change risk assessment packages for agents
- post-change Brain refresh guidance
- context consistency checks
- claim invalidation / superseded-claim surfacing for agents
- stale-context detection
- architecture / dependency drift detection
- evidence freshness signals

Builds on shipped claim lifecycle, risks, snapshots, and deltas — does not invent certainty.

---

## Brain Delta / Change Awareness — 🟡 Planned

**Not implemented as a continuous product loop.** Snapshot compare via `brain_delta` / `brain_snapshot` **is shipped**; continuous change-aware agent workflows are planned.

```text
Snapshot A
    ↓
Repository changes
    ↓
Snapshot B
    ↓
Brain Delta
    ↓
Agent Context Update   ← planned
```

Potential future capabilities grounded in today’s delta model:

- meaningful architecture / dependency / ownership / risk changes
- invalidated, new, and superseded claims
- context refresh recommendations for agents

---

## Ownership evolution — 🟡 Planned

Ownership today: explicit evidence only → otherwise **UNKNOWN**.

Future improvements may strengthen evidence sources (CODEOWNERS, MAINTAINERS, package metadata, repository conventions) while keeping **UNKNOWN as a first-class outcome**. Automatic ownership invention remains a non-goal.

---

## MCP evolution

**Shipped:** ten Brain tools over STDIO MCP.

**🟡 Planned:**

- richer agent-context tools (see Agent Context)
- task-oriented Brain queries
- better context packaging for hosts
- more robust MCP interoperability with Cursor / Claude Code / Codex configuration examples

**🔵 Exploratory:**

- additional transports (for example HTTP/SSE) — **not promised**; STDIO remains the intentional local product path
- agent feedback loops that write back into Brain policy (see below)

---

## Agent Feedback — 🔵 Exploratory

**Not implemented.** Concept only:

```text
Agent
  ↓
uses Brain
  ↓
performs work
  ↓
repository changes
  ↓
Brain refresh
  ↓
delta
  ↓
agent receives updated context
```

Possible ideas: detect stale context, changed assumptions, invalidated claims; recommend rebuild; compare pre/post-change state. No product commitment.

---

## CI / Developer Workflow — 🔵 Exploratory → 🟡 Planned (selected)

Potential integrations:

| Idea                                    | Status                          |
| --------------------------------------- | ------------------------------- |
| CI Brain validation gates               | 🔵 Exploratory                  |
| Pull-request Brain delta                | 🟡 Planned (priority candidate) |
| Architecture change detection in review | 🟡 Planned                      |
| Change-danger reports for PRs           | 🟡 Planned                      |
| Pre-merge context verification          | 🔵 Exploratory                  |

```text
Pull Request
   ↓
Brain Delta
   ↓
Impact / Risk
   ↓
Evidence
   ↓
Developer / Agent
```

Safety CI Action already ships for configuration audit; Brain-aware PR workflows do not.

---

## Team-Scale Project Intelligence — 🔵 Exploratory

Longer-term possibilities (none shipped as enterprise product):

- repository-wide ownership surfaces
- team-aware context packaging
- organization policies for agent context
- shared / reproducible Brain snapshots
- auditability of provenance for reviews
- CI integration of Brain deltas
- pull-request impact analysis

**Not claimed:** authentication platforms, cloud multi-tenant Brain hosting, dashboards, or SaaS control planes.

---

## Safety / adapters (continuing)

Still relevant from the prior roadmap and still valid:

- **🟡 Planned:** scoring follow-ups deferred in [docs/scoring.md](docs/scoring.md)
- **🟡 Planned:** additional agent adapters via the existing registry
- **🟡 Planned:** richer MCP **configuration** analysis without executing servers (Safety path)
- **🔵 Exploratory:** badge generation from CI artifacts; optional opt-in telemetry; optional clearly separated key-gated AI-assisted analysis; hosted badge service (separate product decision)

---

## Long-Term Direction

AgentDoctor aims to become an **evidence-backed context infrastructure layer for AI coding agents**.

```text
Today
Repository → Project Brain → MCP → Agent

Future direction (aspirational)
Repository
   ↓
Project Brain
   ↓
Context Intelligence
   ↓
Evidence / Provenance
   ↓
Agent Interaction
   ↓
Change Feedback
   ↓
Continuously Updated Project Context
```

This is a direction statement, not a feature checklist and not a claim of an “AI operating system.”

---

## Deliberate Non-Goals

AgentDoctor provides structured, evidence-backed repository context to coding agents. It will not become:

- a generic chatbot
- a generic RAG / vector-memory product
- an autonomous coding agent
- a replacement for Cursor, Claude Code, or Codex
- a vulnerability-scanner substitute
- a system that fabricates ownership or unsupported certainty
- an LLM gateway
- a complete security certification

Memory layers, RAG, vector/graph databases, and chat products remain outside the AgentDoctor product core unless explicitly redesigned and documented as a separate decision.

---

Suggestions welcome via GitHub issues.
