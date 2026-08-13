# Architecture walkthrough

Senior-developer oriented view of AgentDoctor **1.1.0** as implemented.

```text
Repository
    ↓
Understanding (discovery passes)
    ↓
Structured model
    ↓
Evidence / claims / confidence
    ↓
Project Brain
    ↓
Snapshot / delta
    ↓
MCP (STDIO)
    ↓
AI Coding Agent
```

## Layers

| Layer                   | Location                                      | Role                                                                                                       |
| ----------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Understanding           | `src/core/understanding/`                     | Deterministic discovery: domains, entrypoints, dependencies, relationships, architecture, ownership, risks |
| Project Brain           | `src/core/understanding/brain/`               | Durable mind: model, claims, evidence, confidence contract, unknowns, snapshots, deltas                    |
| Query / explain / trace | Brain modules                                 | `BrainQueryEngine`, `explainClaim`, `traceBrain`                                                           |
| MCP                     | `src/mcp/brain/`                              | STDIO tools + provenance envelopes                                                                         |
| CLI                     | `src/cli/commands/brain-mcp.ts`               | `agentdoctor brain-mcp --root <abs>`                                                                       |
| Safety (separate)       | `src/core/{scanner,rules,fix,verify,policy}/` | Config audit — not Brain architecture                                                                      |

MCP depends on Brain. Brain does not depend on MCP.

## Structured surfaces

| Concept                      | Meaning in 1.1.0                                                                         |
| ---------------------------- | ---------------------------------------------------------------------------------------- |
| Components                   | Module / entrypoint / package / domain surfaces in the Brain                             |
| Entrypoints                  | High-blast-radius start surfaces discovered by rules                                     |
| Architecture                 | Conservative multi-hypothesis architecture objects                                       |
| Dependencies / relationships | Deterministic edges with evidence                                                        |
| Ownership                    | CODEOWNERS / MAINTAINERS / package maintainers only                                      |
| Risks                        | Change-danger (centrality, coupling, unclear ownership, critical entrypoints) — not SAST |
| Claims                       | First-class assertions with lifecycle                                                    |
| Evidence                     | Typed locators; redacted; epistemics `observed` \| `inferred`                            |
| Confidence                   | `[0,1]`, rule-derived, uncalibrated                                                      |
| Snapshots                    | Persisted Brain under `.agentdoctor/project-brain/` with checksum                        |
| Deltas                       | Serializable before→after compare (`brain_delta`)                                        |

## Provenance

```text
Agent-facing result
    ↓
Claim (status)
    ↓
Evidence ids
    ↓
Snapshot id + contentHash
```

Claim statuses: `ACTIVE` · `INVALIDATED` · `SUPERSEDED` · `CONTRADICTED`.

## UNKNOWN handling

Policy: `preserve-unknown-never-invent`.

Missing ownership evidence → **UNKNOWN**. Inventing an owner is a product failure mode.

## MCP boundary

- Transport: STDIO only
- `--root` required
- Read tools never write
- Controlled write: `brain_snapshot` `rebuild` only under store root
- Fail closed on corrupt / checksum-mismatched stores

Tools (exact): `brain_overview`, `brain_query`, `brain_explain`, `brain_trace`, `brain_claims`, `brain_evidence`, `brain_ownership`, `brain_risk`, `brain_delta`, `brain_snapshot`.

## Architectural boundaries

| In scope                          | Out of scope (1.1.0)                   |
| --------------------------------- | -------------------------------------- |
| Local deterministic understanding | LLM inside Brain compile               |
| Evidence-backed agent tools       | Task-aware context planner (roadmap)   |
| Change-danger risk                | Vulnerability / secret-content scanner |
| Explicit ownership                | Git-blame ownership invention          |
| Snapshot / delta                  | Continuous team Brain SaaS             |

## Further reading

[project-brain.md](../project-brain.md) · [mcp/brain-mcp.md](../mcp/brain-mcp.md) · [../ROADMAP.md](../../ROADMAP.md)
