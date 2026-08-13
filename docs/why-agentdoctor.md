# Why AgentDoctor exists

## Engineering problem

AI coding agents already read repositories. The hard part is **repository-scale reasoning**: architecture, blast radius, ownership, and trustworthy explanations.

File search and RAG retrieve text. They do not, by themselves, give a durable, auditable model of “what is in this project and why we believe it.”

## Two paths

### Traditional agent

```text
repository
→ search / read files
→ infer architecture in the prompt
→ make changes
```

Inferences are ephemeral. Ownership may be guessed. Evidence is hard to audit later.

### AgentDoctor-assisted

```text
repository
→ structured understanding
→ evidence
→ claims
→ confidence
→ risks
→ ownership (or UNKNOWN)
→ Project Brain
→ MCP
→ coding agent
```

The agent still decides what to edit. AgentDoctor supplies **structured, provenance-backed context**.

## Differentiation

| Approach                    | AgentDoctor stance                                                   |
| --------------------------- | -------------------------------------------------------------------- |
| Chatbot                     | Not a chatbot                                                        |
| Generic RAG / vector memory | Claims + evidence + snapshots — not chat memory                      |
| Vulnerability scanner       | Safety audits agent config; Brain risk is change-danger              |
| Autonomous coding agent     | Exposes understanding; does not replace Cursor / Claude Code / Codex |

## Design commitments

1. **Evidence first** — ACTIVE claims reference typed evidence
2. **Preserve UNKNOWN** — never invent owners
3. **Fail closed** — corrupt stores reject
4. **Local STDIO MCP** — no API key for core Brain/Safety
5. **Honest limits** — confidence is uncalibrated; coverage is incomplete by design

## What success looks like

A developer who knows a repository well can:

1. Connect Brain MCP
2. Call `brain_overview` / `brain_risk` / `brain_ownership`
3. Say where the Brain is wrong or incomplete
4. File a Brain-quality report without pasting secrets

That feedback loop — not star counts — is the adoption goal after **1.1.0**.

See [quickstart.md](quickstart.md) · [ROADMAP.md](../ROADMAP.md)
