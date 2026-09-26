# AgentDoctor 2.0 — MCP

Local **STDIO** MCP servers. No API key. Absolute `--root` required (never silent `process.cwd()`).

Deep Brain protocol notes: [../../mcp/brain-mcp.md](../../mcp/brain-mcp.md)

---

## Servers

| Command                              | Server       | Status        | Tools                              |
| ------------------------------------ | ------------ | ------------- | ---------------------------------- |
| `agentdoctor brain-mcp --root <abs>` | Brain MCP    | **SUPPORTED** | `brain_*` only                     |
| `agentdoctor mcp --root <abs>`       | Combined MCP | **PARTIAL**   | All `brain_*` + intelligence tools |

Transport: STDIO only. Additional transports are **PLANNED** (see [ROADMAP.md](../../../ROADMAP.md)).

---

## Brain tools (stable names)

Implemented:

`brain_overview`, `brain_query`, `brain_explain`, `brain_trace`, `brain_claims`, `brain_evidence`, `brain_ownership`, `brain_risk`, `brain_delta`, `brain_snapshot`

Do not rename these without a major-version compatibility decision.

---

## Intelligence tools (combined MCP)

| Tool                 | Purpose                           | Status       |
| -------------------- | --------------------------------- | ------------ |
| `repo_overview`      | Graph builder + counts            | PARTIAL      |
| `codebase_search`    | Bounded node search               | PARTIAL      |
| `symbol_lookup`      | Functions / classes / modules     | PARTIAL      |
| `dependency_lookup`  | Incident edges                    | PARTIAL      |
| `call_graph_lookup`  | Call edges (best-effort)          | PARTIAL      |
| `test_impact`        | Test impact report                | PARTIAL      |
| `refactor_impact`    | Rename blast radius               | PARTIAL      |
| `code_health`        | Git intelligence                  | PARTIAL      |
| `architecture_info`  | C4 views (labeled inferred)       | EXPERIMENTAL |
| `knowledge_retrieve` | Approved knowledge or abstain     | PARTIAL      |
| `policy_evaluate`    | Evaluate-only; **never executes** | PARTIAL      |

Source of truth: `src/mcp/intelligence/registry.ts`, `src/mcp/brain/tools/registry.ts`.

---

## Startup

```bash
agentdoctor brain-mcp --root /ABS/PATH/TO/REPO
agentdoctor mcp --root /ABS/PATH/TO/REPO
```

Optional: `--no-build-if-missing` fails when no Brain snapshot exists instead of compiling.

---

## Safety properties

- Inputs validated; unknown tools error
- Repository root required; path escape rejected
- No arbitrary shell execution from MCP
- Structured JSON results with confidence / limitations where applicable
- Unsupported languages / coverage gaps reported honestly
- `policy_evaluate` is evaluate-only (`executionResult: "not-executed"`)

---

## Limitations / future

| Item                                   | Status                                    |
| -------------------------------------- | ----------------------------------------- |
| STDIO Brain MCP                        | SUPPORTED                                 |
| Combined intelligence tools            | PARTIAL                                   |
| HTTP / SSE MCP transports              | PLANNED                                   |
| Change Proof MCP tools                 | PLANNED (design direction)                |
| Invented competitor tool parity claims | Not applicable — document real tools only |
