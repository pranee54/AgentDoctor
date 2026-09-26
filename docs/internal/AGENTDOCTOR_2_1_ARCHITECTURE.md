# AgentDoctor 2.1 — Project AI Agent Architecture

**Status:** Development line (NOT RELEASED)  
**Base:** AgentDoctor **2.0.1** (released & verified)  
**Scope of this document:** Phase 0 reconnaissance + target architecture for the Project AI Agent.

**Labels used here:** `IMPLEMENTED` (in 2.0.1) · `PLANNED` (2.1) · `EXPERIMENTAL` · `EXTERNAL LIMITATION` · `NOT IMPLEMENTED`

---

## 1. Explicit product decision

AgentDoctor 2.0.1 product contract and ROADMAP list intentional **non-goals**:

- not a generic chatbot
- not an autonomous coding agent
- not an LLM gateway

**2.1 expands the product** to add an **opt-in Project AI Agent** that sits **on top of** the existing assurance substrate. This is a deliberate scope change for the 2.1 development line — not a silent contradiction of 2.0.1.

Invariant that **does not change**:

> THE MODEL REASONS.  
> AGENTDOCTOR PROVIDES PROJECT CONTEXT.  
> AGENTDOCTOR CONTROLS TOOLS.  
> AGENTDOCTOR VERIFIES RESULTS.  
> The model is **never** the source of truth for repository facts.

Core 2.0.1 flows (scan, graph, change, evidence, proof, policy, run, workspace, MCP, Brain) remain available **with or without** an AI provider.

---

## 2. Existing architecture (2.0.1) — IMPLEMENTED

### 2.1 Package topology

| Surface       | Path                                      | Role                                                   |
| ------------- | ----------------------------------------- | ------------------------------------------------------ |
| Package       | `@praneeth_54/agentdoctor@2.1.0`          | npm + CLI bin `agentdoctor`                            |
| Entry         | `src/cli/index.ts` → `src/cli/program.ts` | Commander registration                                 |
| Public API    | `src/index.ts`                            | Library exports                                        |
| Contracts     | `src/contracts/`                          | StorageProvider, evidence, feature flags               |
| Storage       | `src/storage/`                            | FS default; SQLite / Postgres optional                 |
| On-disk state | `.agentdoctor/`                           | brain, graph, evidence, audit, workspaces, platform, … |

### 2.2 Capability map (reuse — do not duplicate)

| Capability                 | Key modules                                                                        | Notes                                                            |
| -------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Safety scan / fix / verify | `src/core/scanner`, `src/core/fix`, `src/core/verify`                              | Agent-config hygiene for Cursor/Claude/Codex/…                   |
| Project Brain              | `src/core/understanding/brain/*`, `src/core/brain-cli`                             | Deterministic claims/evidence; **no LLM**                        |
| Graph / AST                | `src/intelligence/graph/*`, `src/languages/*`                                      | TS/JS AST; optional Python/PHP; Go unsupported extract           |
| Change / Evidence / Proof  | `src/assurance/change.ts`, `proof.ts`                                              | Integrity ≠ correctness                                          |
| Architecture               | `src/architecture/*`                                                               | Contract + C4 views                                              |
| Policy + controlled run    | `src/policy/*`, `src/enforcement/runner.ts`, `src/platform/firewall`               | Default `shell=false`, audit jsonl                               |
| Workspace isolation        | `src/workspace/*`                                                                  | Multi-root; cross-read off by default                            |
| Path safety                | `src/security/paths.ts`                                                            | Traversal / symlink / absolute escape                            |
| Secrets / redaction        | `src/core/secrets`, `src/security/redaction.ts`, `src/platform/security/redact.ts` | Pattern scan + display redaction                                 |
| Context budget planner     | `src/platform/tokens/plan.ts`                                                      | Deterministic path selection; excludes secret-like paths         |
| Sessions (audit)           | `src/platform/sessions/store.ts`                                                   | Event log — **not** LLM chat memory                              |
| MCP Brain                  | `src/mcp/brain/*`                                                                  | `brain_*` tools; explicit `--root`                               |
| MCP Intelligence           | `src/mcp/intelligence/*`                                                           | graph/search/change/architecture/… tools                         |
| Combined MCP               | `src/mcp/agentdoctor/server.ts`                                                    | Brain + intelligence merge (~26 tools)                           |
| Dashboard                  | `src/dashboard/server.ts`                                                          | Loopback read-oriented UI                                        |
| Local AI stub              | `src/integrations/local-ai/provider.ts`                                            | `none \| mock \| ollama` only; redacts; labeled `[AI-GENERATED]` |
| Auth                       | `src/auth/*`, `src/team/auth.ts`                                                   | Local-dev + OIDC JWT library path                                |

### 2.3 Existing “AI” surface (narrow)

`LocalAiProvider` is an **opt-in probe**, not a chat/agent runtime:

- IDs: `none` | `mock` | `ollama`
- Redacts before call (`redactForModel`)
- Must not bypass Safe Fix
- CLI: `agentdoctor local-ai`

There is **no** OpenAI/Anthropic/Gemini Generative API client, **no** tool-calling loop, **no** conversation memory, **no** autonomous file-edit agent.

---

## 3. Target 2.1 architecture — PLANNED

### 3.1 Layering

```
┌─────────────────────────────────────────────────────────────┐
│  Surfaces: CLI (chat/ask/agent/learn/start) · MCP · Dashboard │
├─────────────────────────────────────────────────────────────┤
│  Agent Runtime (state machine + audit events)                 │
│  Modes: LEARN | DEVELOPER | AI_AGENT  (same core, different   │
│          prompts / tool ACLs / UX defaults)                   │
├──────────────┬──────────────────────┬─────────────────────────┤
│ Context      │ Tools                │ Verification            │
│ Engine       │ (controlled)         │ (existing assurance)    │
│ Brain/Graph/ │ read/search/edit/    │ change/evidence/proof/  │
│ planContext/ │ run/tests/…          │ architecture/policy     │
│ truth labels │                      │                         │
├──────────────┴──────────────────────┴─────────────────────────┤
│  ModelProvider (chat/stream/tools) — OPTIONAL                 │
│  Config: AGENTDOCTOR_AI_*  · never store keys in Brain        │
├─────────────────────────────────────────────────────────────┤
│  Security substrate (paths, runner, policy, redaction, WS)    │
│  = existing 2.0.1 controls (not weakened)                     │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Data flow (canonical turn)

```
User message
  → Agent (UNDERSTANDING)
  → Context Engine (retrieve citations; budget tokens)
  → ModelProvider.chat (SYSTEM + USER + DATA + TOOL schemas)
  → Tool calls (Agent selects; AgentDoctor executes)
  → Observation (tool results as DATA, not trusted instructions)
  → Loop until COMPLETED / FAILED / CANCELLED / limits hit
  → Verification (change/evidence/tests/policy as applicable)
  → Response (VERIFIED | INFERRED | UNKNOWN | EXTERNAL labeled)
  → Audit session event log
```

### 3.3 Boundaries

| Boundary             | Rule                                                                                                                                                                                                |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Model / provider** | Optional. Fail closed if unconfigured or unavailable. No silent provider failover. Keys via env only; never printed; never in Brain/evidence.                                                       |
| **Agent / tools**    | Model proposes tool calls; AgentDoctor validates + executes. Model cannot bypass approval or path/policy gates.                                                                                     |
| **Verification**     | Post-change verification uses existing change/evidence/proof/test-impact/architecture/policy. Never claim “everything is correct.” Maintain `ENGINEERING_CORRECTNESS_NOT_CLAIMED` where applicable. |
| **Trust**            | SYSTEM / USER / PROJECT DATA / TOOL OUTPUT / MODEL OUTPUT are separated. Repository content is **untrusted data** (prompt-injection resistant).                                                     |

### 3.4 Security boundaries (reuse + extend)

| Control      | 2.0.1                                      | 2.1 addition                                    |
| ------------ | ------------------------------------------ | ----------------------------------------------- |
| Path resolve | `resolveSafeRepoPath` / `assertInsideRepo` | All agent file I/O                              |
| Runner       | `runControlledCommand`, `shell=false`      | Agent `run_command` / `run_tests` only via this |
| Policy       | firewall evaluate + packs                  | Risk-based approval (LOW→CRITICAL)              |
| Workspace    | `assertWorkspacePathAccess`                | Agent workspace root binding                    |
| Redaction    | `redactForModel` + platform redact         | All outbound model payloads                     |
| MCP          | `path_escape`                              | New agent tools inherit same codes              |

### 3.5 Truth model (answers)

Every project claim in agent output must be tagged:

| Label      | Meaning                                             |
| ---------- | --------------------------------------------------- |
| `VERIFIED` | Directly supported by retrieved repository evidence |
| `INFERRED` | Reasonable from evidence; not directly established  |
| `UNKNOWN`  | Cannot determine from current evidence              |
| `EXTERNAL` | Requires information outside the repository         |

Citations carry `{ source, path, range?, evidenceType, confidence }`. Fabrication is a defect.

---

## 4. Integration points (plug-in map)

| Need                   | Call (do not reimplement)                                                         |
| ---------------------- | --------------------------------------------------------------------------------- |
| Project facts          | Brain build/query/explain; MCP `brain_*`                                          |
| Symbols / deps / blast | Graph build; intelligence MCP tools                                               |
| Context packing        | Extend `planContext`                                                              |
| Commands               | `runControlledCommand` only                                                       |
| File paths             | `resolveSafeRepoPath` / workspace helpers                                         |
| Change after edits     | `analyzeChange` / `verifyChange` / proof                                          |
| Architecture           | `checkArchitectureAtRoot`                                                         |
| Audit trail            | Extend `platform/sessions` event types carefully                                  |
| CLI                    | `src/cli/commands/*.ts` + register in `program.ts`                                |
| MCP                    | registries under `src/mcp/brain` and `src/mcp/intelligence`                       |
| Local AI migrate       | Absorb `LocalAiProvider` into new `ModelProvider` (`none`/`mock`/`ollama` remain) |

---

## 5. Proposed module layout (2.1)

```
src/ai/                     # NEW — provider-agnostic model layer
  types.ts                  # ModelProvider, ChatMessage, ToolSpec, Usage
  config.ts                 # AGENTDOCTOR_AI_* + .agentdoctor/ai.json (no secrets)
  providers/
    none.ts
    mock.ts
    openai-compatible.ts    # OpenAI-compatible HTTP (incl. custom base URL)
    # anthropic / gemini: stubs or later milestones — NOT claimed until shipped
  redact.ts                 # wraps / extends redactForModel

src/agent/                  # NEW — agent runtime
  state.ts                  # IDLE…CANCELLED enum + transitions
  runtime.ts                # loop + hard limits
  approvals.ts              # risk levels
  memory.ts                 # short-term / task / project session memory (no secrets)
  modes.ts                  # LEARN | DEVELOPER | AI_AGENT
  tools/                    # tool definitions → existing services
  audit.ts                  # session event mapping

src/agent/context/          # NEW — context engine
  retrieve.ts               # orchestrates Brain/graph/planContext/…
  citations.ts
  truth.ts                  # VERIFIED|INFERRED|UNKNOWN|EXTERNAL helpers

src/cli/commands/
  chat.ts | ask.ts | agent.ts | learn.ts | start.ts | config-ai.ts   # as needed

docs/
  AGENTDOCTOR_2_1_ARCHITECTURE.md   # this file
  AI_AGENT.md, PROJECT_CHAT.md, …   # later milestones
```

Version cut to **2.1.0** (this release). Prior assurance substrate remains 2.0.1-compatible.

---

## 6. Gaps (honest)

| Capability                                                      | Status                                                     |
| --------------------------------------------------------------- | ---------------------------------------------------------- |
| Cloud / OpenAI-compatible `ModelProvider`                       | IMPLEMENTED (optional; none/mock/openai-compatible/ollama) |
| Agent state machine                                             | IMPLEMENTED                                                |
| `chat` / `ask` CLI                                              | IMPLEMENTED (fail-closed on provider none)                 |
| `plan` / `agent` CLI                                            | IMPLEMENTED (read + approved writes + `--run-tests`)       |
| Conversation memory                                             | IMPLEMENTED (short-term; no secrets)                       |
| Evidence-labeled chat answers                                   | IMPLEMENTED                                                |
| Read/search agent tools + approvals                             | IMPLEMENTED                                                |
| Agent-controlled file create/edit (path-safe + diffs)           | IMPLEMENTED (symlink escape rejected)                      |
| Controlled command execution via agent (`runControlledCommand`) | IMPLEMENTED                                                |
| Coding loop PLAN→APPROVAL→EDIT→RUN + hard limits                | IMPLEMENTED (incl. model loop + limit enforcement)         |
| Post-change verification pipeline                               | IMPLEMENTED (`ENGINEERING_CORRECTNESS_NOT_CLAIMED`)        |
| Student Learn / Build With Me                                   | IMPLEMENTED (`buildFeature` → `runCodingLoop`)             |
| Project Chat dashboard panel                                    | IMPLEMENTED (ask-only; fail-closed on none)                |
| Agent MCP tools (`project_ask`, …)                              | IMPLEMENTED (no unrestricted shell)                        |
| Prompt-injection isolation suite for agent                      | IMPLEMENTED (tool-output + repo content)                   |
| ModeProfile.allowWrites enforcement                             | IMPLEMENTED (LEARN hard-block)                             |

---

## 7. Milestones

| #       | Milestone                                                      | Exit criteria                                                                                                                                              | Status |
| ------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| **M1**  | Provider abstraction + Agent core + Context engine scaffolding | Types, config, none/mock/(openai-compatible) providers; state machine; context retrieve stub wired to Brain/graph/planContext; tests; core CLI still green | DONE   |
| **M2**  | Project chat + truth labels + memory                           | `agentdoctor chat`/`ask`; citations; session memory; no provider → clear message                                                                           | DONE   |
| **M3**  | Read/search tools + plan/approval                              | Tools call existing services; LOW/MEDIUM approvals                                                                                                         | DONE   |
| **M4**  | File create/edit + controlled execution                        | Path-safe writes + diffs; runner-only commands                                                                                                             | DONE   |
| **M5**  | Test/verify/change-proof integration                           | Post-edit verification pipeline                                                                                                                            | DONE   |
| **M6**  | Student Learn + Build With Me                                  | Modes + educational UX                                                                                                                                     | DONE   |
| **M7**  | Dashboard Project Chat                                         | If dashboard ready                                                                                                                                         | DONE   |
| **M8**  | MCP agent tools                                                | Safe subset only                                                                                                                                           | DONE   |
| **M9**  | Security hardening                                             | Injection / hostile repo tests                                                                                                                             | DONE   |
| **M10** | Docs + full verification                                       | Honest status; no fake claims                                                                                                                              | DONE   |

**Rule:** Do not mark later milestones complete early. No release actions from feature work.

---

## 8. Risks

| Risk                                      | Mitigation                                                       |
| ----------------------------------------- | ---------------------------------------------------------------- |
| Scope vs 2.0 “non-goals”                  | Document 2.1 as explicit product expansion; keep core without AI |
| Duplicate Brain/graph logic               | Context engine only orchestrates existing APIs                   |
| Weakened security for “agent convenience” | Forbidden; reuse path/runner/policy                              |
| Infinite tool loops                       | Hard caps: tool calls, iterations, wall time, files touched      |
| Secret leakage to models                  | Redact + exclude secret-like paths; never store keys in Brain    |
| Provider lock-in                          | OpenAI-compatible HTTP first; other vendors isolated             |
| Silent provider failover                  | Explicitly forbidden                                             |
| Over-claiming verification                | Preserve honesty labels + `ENGINEERING_CORRECTNESS_NOT_CLAIMED`  |

---

## 9. Test strategy (M1+)

| Area            | Approach                                                         |
| --------------- | ---------------------------------------------------------------- |
| Provider        | Unit: none/mock; config parsing; no key echo; failure messages   |
| Agent state     | Unit: legal transitions; cancel; limit exceeded → FAILED         |
| Context         | Unit: citations; budget; secret path exclusion; path_escape      |
| Regression      | Full existing `npm run verify` / vitest suite must stay green    |
| Hostile (later) | README injection; `../../etc/passwd`; `rm -rf` proposals blocked |
| MCP (later)     | New tools only after path/policy parity                          |

---

## 10. Files likely touched in M1

**Create**

- `src/ai/**`
- `src/agent/**` (core + context scaffolding)
- `tests/unit/ai/**`, `tests/unit/agent/**`
- this architecture doc (done)

**Touch cautiously**

- `src/integrations/local-ai/provider.ts` (delegate to `src/ai` or thin wrapper)
- `src/cli/program.ts` (optional `config ai` probe only if needed in M1)
- `src/index.ts` (exports)
- `package.json` (deps only if openai-compatible HTTP needs fetch — Node 20 native preferred)

**Do not touch for M1**

- Published version / tags / npm
- Existing MCP tool contracts (behavior-preserving)
- Safe Fix allowlist expansion (file edit is M4)

---

## 11. Current milestone

**MILESTONE 1 — IMPLEMENTED (scaffolding)** — `src/ai/**`, agent runtime/state, `retrieveProjectContext`, provider config.

**MILESTONE 2 — IMPLEMENTED (local development; not released)**

- `agentdoctor chat` / `agentdoctor ask`
- `ChatService` + memory + truth/citations
- PROJECT_DATA prompt-injection channel separation
- Docs: [PROJECT_CHAT.md](./PROJECT_CHAT.md)

**Not in M2:** file edits, command execution, student mode, dashboard, agent MCP tools.

**MILESTONE 3 — IMPLEMENTED (local development; not released)**

- Provider-neutral `ToolSpec` / `ToolCall` / `ToolResult` (`src/agent/tools/`)
- Read/search tools reuse intelligence MCP handlers + path-safe `read_file` / discovery
- Risk levels LOW→CRITICAL + `evaluateApproval` (model cannot self-approve)
- `buildAgentPlan` / `agentdoctor plan` / `agentdoctor agent` — plan + approval request; **no file modifications**
- Write/execute tools registered but return `not_enabled` until M4

**Not in M3:** create/edit/delete files, controlled command execution, agent loop with iteration.

**MILESTONE 4 — IMPLEMENTED (local development; not released)**

- `create_file` / `edit_file` / `delete_file` via path-safe writes + `atomicWriteTextFile` + diffs
- Structured edits: exact `oldContent` replace, line-range, or full content
- `run_command` / `run_tests` only through `runControlledCommand` (shell=false; blocks `rm -rf`, etc.)
- `runCodingLoop`: PLAN → APPROVAL → EDIT/RUN → observe; hard limits; model cannot self-approve
- CLI: `agentdoctor agent --approve --apply --apply-ops '...'`
- Path resolve fix for non-existent nested creates on macOS (`/var` vs `/private/var`)

**Not in M4:** post-change proof/evidence pipeline (M5), student modes, dashboard, agent MCP.

**MILESTONE 5 — IMPLEMENTED (local development; not released)**

- `verifyAgentWork` reuses `analyzeChange` / `verifyChange` / `buildProofFromEvidence` / architecture
- Coding loop VERIFYING stage produces verified vs not-verified lists
- Always emits `ENGINEERING_CORRECTNESS_NOT_CLAIMED`
- CLI: `--skip-verify`, `--run-tests` on agent apply

**Not in M5:** student modes, dashboard Project Chat, agent MCP tools.

**MILESTONE 6 — IMPLEMENTED** — modes + `agentdoctor learn` / viva / docs (`StudentService`).

**MILESTONE 7 — IMPLEMENTED** — dashboard Project Chat panel + `POST /api/chat` (ask-only).

**MILESTONE 8 — IMPLEMENTED** — MCP agent tools (`project_context`, `project_ask`, `file_read`, `file_create`, `file_edit`, `agent_plan`, `change_verify`, `code_search`); no unrestricted shell.

**MILESTONE 9 — IMPLEMENTED** — hostile injection / path / command / memory-isolation tests.

**MILESTONE 10 — IMPLEMENTED** — docs under `docs/AI_AGENT.md`, `PROJECT_CHAT.md`, `STUDENT_MODE.md`, `MODEL_PROVIDERS.md`, `AGENT_TOOLS.md`, `AGENT_APPROVALS.md`, `SECURITY_AGENT.md`, this architecture file.

**Package version: 2.1.0.** See [RELEASE_2_1_0.md](./RELEASE_2_1_0.md).
