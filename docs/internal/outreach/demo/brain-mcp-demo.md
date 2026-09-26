# Demo: AgentDoctor Project Brain via MCP

One story: a developer is about to change a high-blast-radius surface.
Instead of editing blind, the agent asks AgentDoctor Brain.

Fixture used for these numbers: `fixtures/understanding-dependencies-project`  
Captured in: `validation/mcp-agent/results.json` (2026-08-13)

```text
Agent
  ↓
MCP (STDIO)
  ↓
agentdoctor brain-mcp --root <project>
  ↓
Project Brain
  ↓
Evidence + confidence + snapshot
  ↓
Agent decision
```

## 1. What is this project?

**Tool:** `brain_overview`

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

## 2. What are the main entrypoints?

**Tool:** `brain_query` `type=ListEntrypoints`

Real entrypoints from Brain (not invented):

| File                       | Framework | Confidence |
| -------------------------- | --------- | ---------- |
| `services/billing/main.go` | Go        | 0.95       |
| `apps/api/routes/web.php`  | Laravel   | 0.90       |
| `services/cli/src/main.rs` | Rust      | 0.90       |

## 3. What is risky to change?

**Tool:** `brain_risk` (change-danger — **not** a CVE scanner)

Top risk from Brain:

```json
{
  "kind": "critical-entrypoint",
  "severity": "high",
  "target": "apps/api/routes/web.php",
  "rationale": "Entrypoints are high-blast-radius change surfaces",
  "confidence": 0.87,
  "evidence": ["path:apps/api/routes/web.php", "Route::", "entrypoint:Laravel"]
}
```

Also present: `dependency-centrality`, `high-coupling`, `unclear-ownership`.

## 4. Who owns it?

**Tool:** `brain_ownership` `path=packages/payments`

```json
{
  "ownership": "UNKNOWN",
  "note": "Ownership is UNKNOWN without explicit CODEOWNERS / MAINTAINERS / package evidence"
}
```

Brain does **not** guess via git blame.

## 5. What depends on / is impacted?

**Tool:** `brain_trace` (capped: max depth 25, max edges 5000)

Root observed in validation: `Payments` (blast-radius mode). Trace terminates under caps.

## 6. Why do you believe that?

**Tool:** `brain_explain` on an ACTIVE claim

```json
{
  "claimStatus": "ACTIVE",
  "confidence": 1,
  "snapshot": "snap_b87e5fd824105d4ea705827b"
}
```

Chain:

```text
result → claim (ACTIVE) → evidenceIds → snapshot id/hash
```

No LLM-generated evidence.

## 7. What changed?

**Tools:** `brain_snapshot` + `brain_delta`

```text
from: snap_b87e5fd824105d4ea705827b
to:   snap_d7359fa837b7e69775ebeec1
```

## Agent wiring proof (Cursor)

Without fabricating LLM answers, Cursor Agent MCP listed all 10 Brain tools:

```text
Tools for agentdoctor-brain (10):
- brain_claims
- brain_delta
- brain_evidence
- brain_explain
- brain_overview
- brain_ownership
- brain_query
- brain_risk
- brain_snapshot
- brain_trace
```

Claude Code / Codex interactive LLM turns were **NOT AVAILABLE** in this environment (auth / missing CLI). See `validation/mcp-agent/README.md`.

## Run it yourself

```bash
npm run build
agentdoctor brain-mcp --root /absolute/path/to/project
```

Config examples: `examples/mcp/`.
Docs: `docs/mcp/brain-mcp.md`.
