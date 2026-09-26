# AgentDoctor 2.0.1 — Product Contract

## Positioning

**AgentDoctor** is an **engineering assurance layer for AI coding agents.**

Tagline: _Engineering assurance for AI coding agents._

### Core question

> Does this repository change have enough evidence to be trusted?

AgentDoctor helps gather and structure that evidence. It does **not** guarantee correctness, security, or compliance.

## What AgentDoctor is

1. Repository intelligence (structure, graphs, Git signals)
2. Change assurance (structured assessment + evidence bundles)
3. Architecture intelligence (views + optional rule checks — labeled when inferred)
4. Engineering knowledge governance (Brain + approved knowledge)
5. Policy evaluation (and controlled enforcement only where AgentDoctor owns the boundary)
6. Test-impact analysis (heuristic and/or coverage-backed when data exists)
7. Security analysis (Safety scan, secrets, path controls)
8. Evidence generation (durable, inspectable bundles)
9. MCP integration (Brain + intelligence tools)
10. CLI / local API / dashboard surfaces
11. CI/CD via GitHub Action (Safety gates)
12. npm distribution (`@praneeth_54/agentdoctor`)

## What AgentDoctor is not

- A coding agent
- A replacement for Cursor, Claude Code, Codex, Copilot, or Gemini
- A generic LLM wrapper
- A compliance certification authority
- A promise of complete security
- Enterprise SSO / IdP (unless a fully tested provider ships — current: local-dev only)

## Principles

| Principle       | Meaning                                                    |
| --------------- | ---------------------------------------------------------- |
| Local-first     | Default work stays on the developer machine                |
| Deterministic   | Same inputs → same structural outputs where claimed        |
| Explainable     | Findings and decisions carry reasons and evidence pointers |
| Privacy-first   | No API key required for core flows; no silent code upload  |
| Evidence-first  | Prefer abstention / UNKNOWN over invention                 |
| Agent-agnostic  | Adapters for multiple agents; no lock-in to one host       |
| Offline-capable | Core scan / Brain / graph work without network             |
| Reproducible    | Evidence bundles record versions, revisions, hashes        |

## Status vocabulary (mandatory)

| Label                   | Use when                                                 |
| ----------------------- | -------------------------------------------------------- |
| IMPLEMENTED / SUPPORTED | Shipped and tested for intended use                      |
| VERIFIED                | Underlying evidence was actually produced for that claim |
| EXPERIMENTAL            | Available but unstable / not a hard contract             |
| HEURISTIC               | Useful estimate; not ground truth                        |
| ADVISORY                | Guidance only — not enforcement                          |
| NOT IMPLEMENTED         | Absent                                                   |
| NOT SUPPORTED           | Explicitly out of scope                                  |

**Forbidden conversions:** heuristic→verified · inferred→authoritative · advisory→enforcement · local auth→enterprise SSO · evaluate-only→runtime enforcement · synthetic benchmark→production scale.

## Change assurance contract

`agentdoctor change analyze` produces a `ChangeAssessment` with structured fields and an explicit `verificationStatus` that is never `"verified"` unless `change verify` (or equivalent) produced the underlying evidence artifacts.

Evidence lives under `.agentdoctor/evidence/<change-id>/` with a versioned manifest.

## Trust boundaries

1. **Analysis** — scan, graph, brain, assessments
2. **Policy evaluation** — allow/deny/warn/require-approval without side effects by default
3. **Human approval** — knowledge / proposals
4. **Controlled execution** — only when a real, audited runner exists; otherwise evaluate-only

## Release truth for 2.0.1

See [IMPLEMENTATION_GAP_AUDIT.md](IMPLEMENTATION_GAP_AUDIT.md) and [FINAL_RELEASE_AUDIT.md](FINAL_RELEASE_AUDIT.md) (written at end of cut).
