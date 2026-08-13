# AgentDoctor Project Brain MCP

Local-first MCP bridge that exposes the **evidence-backed Project Brain** to AI coding agents.

```text
AI Agent
   ↓
MCP client (Cursor / Claude Code / Codex)
   ↓
agentdoctor brain-mcp --root <project>
   ↓
BrainQueryEngine / explainClaim / traceBrain / LocalBrainStore
```

This is **not** another codebase search MCP.

| Layer         | Question                                                                  |
| ------------- | ------------------------------------------------------------------------- |
| Understanding | What is in this repository?                                               |
| Trust         | What evidence supports that understanding?                                |
| Safety        | Is the agent configuration/context safe? (Scan → Fix → Verify — separate) |

## Install / run

Requires AgentDoctor built from this repository (Brain MCP ships in the CLI build).

```bash
npm install
npm run build
agentdoctor brain-mcp --root /absolute/path/to/project
```

Or via npx against a local checkout:

```bash
npx tsx src/cli/index.ts brain-mcp --root /absolute/path/to/project
```

- **Transport:** STDIO only
- **API key:** none
- **Upload:** never
- **Root:** `--root` is **required** (never silently uses `process.cwd()`)

Diagnostics go to **stderr**. Protocol traffic stays on **stdout**.

## Tools

| Tool              | Purpose                                          |
| ----------------- | ------------------------------------------------ |
| `brain_overview`  | Compact brain summary + provenance               |
| `brain_query`     | Typed `BrainQueryEngine` queries                 |
| `brain_explain`   | Evidence-backed `explainClaim`                   |
| `brain_trace`     | Capped deterministic `traceBrain`                |
| `brain_claims`    | Claim lifecycle (default truth filter)           |
| `brain_evidence`  | Typed redacted evidence                          |
| `brain_ownership` | Explicit CODEOWNERS / MAINTAINERS / package only |
| `brain_risk`      | Change-danger risk (not SAST)                    |
| `brain_delta`     | Read-only snapshot comparison                    |
| `brain_snapshot`  | current / history / compare / load / rebuild     |

All tools return a provenance envelope when successful:

```json
{
  "ok": true,
  "result": {},
  "evidenceIds": [],
  "confidence": 0.0,
  "snapshot": {
    "id": "…",
    "schemaVersion": "1.0.0",
    "contentHash": "…",
    "createdAt": "…",
    "brainId": "…",
    "projectName": "…"
  },
  "claimStatus": "ACTIVE",
  "metadata": {}
}
```

Errors:

```json
{
  "ok": false,
  "error": { "code": "invalid_argument", "message": "…" }
}
```

## Query types (`brain_query`)

Supported Brain query types (aliases accepted):

`ProjectSummary`, `ListDomains`, `ListComponents`, `ListEntrypoints`, `ListDependencies`, `ListRelationships`, `ListArchitectures`, `ListOwnership`, `ListRisks`, `ListClaims`, `ListEvidence`, `ListContradictions`, `ListUnknowns`, `ListInvalidations`, `Impact`, `BlastRadius`

Unsupported / rejected: arbitrary JS, shell fragments, `ListChanges` (use `brain_delta`).

## Claim lifecycle

Statuses: `ACTIVE` | `INVALIDATED` | `SUPERSEDED` | `CONTRADICTED`

Default `brain_claims` returns **ACTIVE + CONTRADICTED** only. Historical claims require `includeHistorical: true` or an explicit `status`.

## Ownership & risk

- Ownership: explicit evidence only. Missing → `UNKNOWN`. No git-blame / cwd guessing.
- Risk: **change-danger** (centrality, coupling, unclear ownership, architecture conflict, critical entrypoint). Not a vulnerability scanner.

## Security model

### Read operations

These tools never write to disk:

`brain_overview`, `brain_query`, `brain_explain`, `brain_trace`, `brain_claims`,
`brain_evidence`, `brain_ownership`, `brain_risk`, `brain_delta`, and
`brain_snapshot` actions `current` | `history` | `compare` | `load`.

### Controlled local write

`brain_snapshot` action `rebuild` may write **only** under:

```text
<validated project root>/.agentdoctor/project-brain/
```

Rebuild must never:

- modify source files
- modify agent configuration (Cursor / Claude / Codex)
- execute shell commands
- write outside Brain storage
- follow a symlink outside the workspace
- silently overwrite a divergent snapshot (same id, different checksum)
- expose secret plaintext

### Shared controls

- Explicit `--root`
- Realpath + containment checks
- Reject path traversal and symlink escapes
- No shell / eval / arbitrary FS reads outside the project
- Evidence uses Brain redaction (no secret plaintext)
- Corrupt / checksum-mismatched stores fail closed

## Agent configuration examples

See [examples/mcp/](../examples/mcp/):

- [cursor.mcp.json](../examples/mcp/cursor.mcp.json)
- [claude-code.mcp.json](../examples/mcp/claude-code.mcp.json)
- [codex.config.toml](../examples/mcp/codex.config.toml)

Copy into project-local agent config. Do **not** auto-modify global user settings.

## Limitations

- Brain must compile discovery passes on first use (or `rebuild`)
- No remote / multi-tenant service
- No LLM-generated explanations
- Safety Fix remains a separate CLI workflow
- Published npm packaging of Brain MCP follows the repository build; use the documented `brain-mcp` command after `npm run build`

## Troubleshooting

| Symptom                    | Check                                                                   |
| -------------------------- | ----------------------------------------------------------------------- |
| `project root is required` | Pass `--root`                                                           |
| `brain_corrupt`            | Delete `.agentdoctor/project-brain` and rebuild, or fix disk corruption |
| `unsupported query type`   | Use a listed query type                                                 |
| Protocol broken in agent   | Ensure nothing else writes to stdout; logs must use stderr              |
| Empty ownership            | Add CODEOWNERS / MAINTAINERS / package maintainers                      |

Related: [project-brain.md](../project-brain.md) · [compatibility.md](../compatibility.md)
