# AgentDoctor in 5 Minutes: Give an AI Coding Agent a Project Brain

Practical walkthrough. Commands and sample fields come from the published **1.1.0** product and the documented fixture demo — not fabricated chat answers.

## 1. The problem

AI coding agents can open files. Repository-scale questions stay hard:

- What are the real entrypoints?
- What is dangerous to change?
- Who owns this path?
- What evidence supports that claim?

## 2. The repository

Use either:

- **Your project** (absolute path), or
- The documented fixture: `fixtures/understanding-dependencies-project` (samples in [brain-mcp-demo.md](brain-mcp-demo.md))

## 3. Run AgentDoctor

```bash
npx @praneeth_54/agentdoctor@1.1.0 --help
```

Safety scan (optional, separate product path):

```bash
npx @praneeth_54/agentdoctor@1.1.0 scan /ABSOLUTE/PATH/TO/YOUR/PROJECT
```

## 4. Project Understanding

Understanding lives under `src/core/understanding/`: discovery of domains, entrypoints, dependencies, relationships, architecture, ownership, and change-danger risks. It compiles into a Project Brain — it is not a chat transcript.

## 5. Project Brain

Canonical artifact: claims + evidence + confidence + snapshot metadata, persisted under:

```text
<project>/.agentdoctor/project-brain/
```

Local only. Do not commit.

## 6. Start MCP

```bash
# After global install:
agentdoctor brain-mcp --root /ABSOLUTE/PATH/TO/YOUR/PROJECT

# Or from this repo after npm run build:
node dist/cli/index.js brain-mcp --root /ABSOLUTE/PATH/TO/YOUR/PROJECT
```

## 7. Connect the coding agent

Copy [examples/mcp/cursor.mcp.json](../../examples/mcp/cursor.mcp.json) (or Claude / Codex siblings) into project-local agent config. Replace absolute paths.

Confirm the host lists **agentdoctor-brain** with **10 tools**.

Documented Cursor discovery proof ([validation/mcp-agent/README.md](../../validation/mcp-agent/README.md)): MCP tools listed — PASS.

## 8. Ask for repository understanding

Call **`brain_overview`**.

Documented fixture sample:

| Field               | Example                               |
| ------------------- | ------------------------------------- |
| Snapshot id         | `snap_b87e5fd824105d4ea705827b`       |
| Confidence envelope | `0.74`                                |
| Entrypoints         | `3`                                   |
| Components          | `38`                                  |
| Active claims       | `22`                                  |
| Risks               | `15`                                  |
| Ownership           | UNKNOWN without explicit owners files |

## 9. Inspect evidence / provenance

Call **`brain_explain`** on an ACTIVE claim (or `brain_claims` / `brain_evidence`).

Documented chain:

```text
result → claim (ACTIVE) → evidenceIds → snapshot id/hash
```

Provenance envelope fields: `evidenceIds`, `confidence`, `snapshot`, `claimStatus`.

## 10. Query risk / ownership / trace

| Tool              | Documented behavior                                  |
| ----------------- | ---------------------------------------------------- |
| `brain_risk`      | Change-danger (e.g. `critical-entrypoint`) — not CVE |
| `brain_ownership` | Explicit evidence or **UNKNOWN**                     |
| `brain_trace`     | Capped dependency / blast-radius traces              |
| `brain_query`     | e.g. `ListEntrypoints`                               |

Ownership sample from the demo:

```json
{
  "ownership": "UNKNOWN",
  "note": "Ownership is UNKNOWN without explicit CODEOWNERS / MAINTAINERS / package evidence"
}
```

## 11. What the agent can now see

Structured Brain surfaces: overview, typed queries, explain, trace, claims, evidence, ownership, risk, delta, snapshot — each with provenance when successful.

## 12. What AgentDoctor deliberately does NOT claim

- Zero hallucinations / perfect understanding of every repository
- Autonomous coding or replacement of Cursor / Claude Code / Codex
- Generic RAG / chat memory
- Vulnerability scanning as Brain risk
- Invented ownership when evidence is missing

Next: [architecture-walkthrough.md](architecture-walkthrough.md) · [../mcp/brain-mcp.md](../mcp/brain-mcp.md) · [../quickstart.md](../quickstart.md)
