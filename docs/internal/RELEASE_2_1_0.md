# AgentDoctor 2.1.0 — Release Notes

**Package:** `@praneeth_54/agentdoctor@2.1.0`  
**Status:** Release cut authorized  
**Release notes:** this document

---

## What 2.0.1 was

AgentDoctor **2.0.1** is engineering assurance for AI coding agents:

- Repository intelligence (graph, impact, architecture signals)
- Project Brain and knowledge surfaces
- Safety scan → Safe Fix → verify
- Change assurance, evidence bundles, and Change Proof **integrity**
- Policy / controlled runner (`shell=false` by default)
- Workspace isolation
- Brain + intelligence MCP tools
- Local dashboard (read-oriented)

It was **not** a general chatbot and did **not** claim engineering correctness.

---

## What 2.1.0 adds

An **optional** Project AI Agent line on top of the same assurance substrate.

AI is **opt-in**. Core scan / fix / verify / change / Brain / MCP intelligence remain usable **without** a model provider.

### Architecture (invariant)

```text
THE MODEL REASONS.
AGENTDOCTOR PROVIDES PROJECT CONTEXT.
AGENTDOCTOR CONTROLS TOOLS.
AGENTDOCTOR VERIFIES RESULTS.
```

The model never becomes the source of truth for repository facts. Tool results and repository excerpts are **DATA**, not SYSTEM instructions.

### Surfaces

| Surface                    | Role                                                          |
| -------------------------- | ------------------------------------------------------------- |
| CLI `chat` / `ask`         | Evidence-backed project Q&A with truth labels                 |
| CLI `plan` / `agent`       | Plan + approved coding loop (path-safe tools)                 |
| CLI `learn`                | Student explain / viva / docs / BUILD_WITH_ME                 |
| Dashboard `POST /api/chat` | Ask-only Project Chat; fail-closed if provider=`none`         |
| MCP agent tools            | Context, ask, search, path-safe file ops, plan, change verify |

### Providers

| Provider                       | Status                                  |
| ------------------------------ | --------------------------------------- |
| `none`                         | Default — fail closed for chat surfaces |
| `mock`                         | Explicit tests / offline demos only     |
| `openai-compatible`            | Optional HTTP (incl. custom base URL)   |
| `ollama`                       | Optional via OpenAI-compatible endpoint |
| Native Anthropic / Gemini SDKs | **NOT IMPLEMENTED**                     |

Configure via `AGENTDOCTOR_AI_PROVIDER` (and related env). Keys are never stored in Brain/evidence.

---

## Highlights by area

### Project intelligence

- Project-aware context packing
- Project Chat with citations
- Truth labels: VERIFIED / INFERRED / UNKNOWN / EXTERNAL

### Agent tools & coding loop

- Read / search
- Create / edit / delete (approval required)
- Controlled `run_command` / `run_tests`
- PLAN → APPROVAL → EXECUTE → OBSERVE → VERIFY

### Safety

- Path + symlink write protection
- Workspace isolation (when WorkspaceModel provided) + repo-root binding
- Mode `allowWrites` (LEARN cannot write)
- Approval gates; model cannot self-approve
- Dangerous command blocking
- Prompt-injection channel separation
- Secret redaction
- Hard limits (tool calls, iterations, wall time, files, context)

### Verification

- Change analysis, evidence, proof, architecture where applicable
- Optional test run after edits
- Always: `ENGINEERING_CORRECTNESS_NOT_CLAIMED`

### Student

- Learn / viva / docs
- BUILD_WITH_ME → shared coding loop after approval

### MCP & dashboard

- Agent MCP subset (no unrestricted shell)
- Dashboard ask-only chat; fail-closed on unconfigured AI

---

## Limitations (must ship in release notes)

- **Not** an OS sandbox or EDR (**EXTERNAL LIMITATION**).
- Native Anthropic / Gemini SDKs **NOT IMPLEMENTED**.
- MCP `approved=true` is **trusted-caller input**, not cryptographic human identity.
- MCP does **not** carry `AgentMode` (LEARN ban is CLI/loop-scoped).
- Rich interactive student UI is **PARTIAL**.
- Correctness is **never** guaranteed — integrity ≠ correctness.
- Do not claim: fully autonomous, 100% correct, completely safe, production guaranteed, or understands everything.

---

## Upgrade notes (after version cut + publish)

```bash
npm install -g @praneeth_54/agentdoctor@2.1.0
agentdoctor --version   # expect 2.1.0 after cut

# Optional AI
export AGENTDOCTOR_AI_PROVIDER=mock   # or openai-compatible / ollama
agentdoctor ask "How does authentication work?" .

# Writes still require explicit approval
agentdoctor agent --goal "Add feature" --approve --apply --apply-ops '[...]' .
```

2.0.1 assurance CLIs (`scan`, `fix`, `verify`, `change`, `evidence`, `proof`, Brain MCP) remain available.

---

## Related docs

- [CHANGELOG.md](../CHANGELOG.md) — Unreleased / planned 2.1.0 section
- [docs/RELEASE_CHECKLIST_2_1_0.md](./RELEASE_CHECKLIST_2_1_0.md)
- [docs/AI_AGENT.md](./AI_AGENT.md)
- [docs/SECURITY_AGENT.md](./SECURITY_AGENT.md)
- [docs/STUDENT_MODE.md](./STUDENT_MODE.md)
- [docs/AGENTDOCTOR_2_1_ARCHITECTURE.md](./AGENTDOCTOR_2_1_ARCHITECTURE.md)
