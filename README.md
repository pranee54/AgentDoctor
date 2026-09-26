# AgentDoctor

### The intelligence and assurance layer for software projects.

**Understand your codebase. Build safely. Verify the result.**

Ask questions about a real repository. Plan a change. Require approval. Edit under path-safe controls. Map tests and risk. Attach evidence. Prove integrity — without pretending the change is “correct.”

[![npm](https://img.shields.io/npm/v/@praneeth_54/agentdoctor?label=npm)](https://www.npmjs.com/package/@praneeth_54/agentdoctor)
[![CI](https://img.shields.io/github/actions/workflow/status/pranee54/AgentDoctor/ci.yml?branch=main&label=CI)](https://github.com/pranee54/AgentDoctor/actions/workflows/ci.yml)
[![Node](https://img.shields.io/node/v/@praneeth_54/agentdoctor)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Published package:** [`@praneeth_54/agentdoctor`](https://www.npmjs.com/package/@praneeth_54/agentdoctor)
**Current product:** **3.0** — project intelligence & assurance core (see [Verification](#verification))

[Install](#install) · [5-minute quickstart](#five-minute-quickstart) · [What it can do](#what-can-it-do) · [Students](#for-students) · [MCP](#mcp) · [Security](#security-model) · [Limitations](#limitations) · [Docs](#documentation)

---

## What is AgentDoctor?

AgentDoctor is a **project-aware intelligence and assurance platform**. It helps people understand, learn, plan, safely change, test, secure, verify, and remember software projects — whether the code was written by hand, with AI, or by a coding agent.

Most tools answer one slice of the problem:

| Tool type         | Typical job           |
| ----------------- | --------------------- |
| Linters           | Style / static issues |
| Test runners      | Execute tests         |
| Code search       | Find text / symbols   |
| Security scanners | Find vulnerabilities  |
| AI coding agents  | Propose / apply edits |

AgentDoctor connects those concerns around **the project itself**. It builds local understanding of structure, relationships, dependencies, Git, tests, security signals, requirements, and evidence — then uses that understanding across:

```text
UNDERSTAND → ASK → PLAN → APPROVE → CHANGE → TEST → SECURE → VERIFY → PROVE
```

It is **not** “another chatbot,” a Cursor clone, a generic coding agent, or a claim of full autonomy.

**Invariant**

```text
THE MODEL REASONS.
AGENTDOCTOR PROVIDES PROJECT CONTEXT.
AGENTDOCTOR CONTROLS TOOLS.
AGENTDOCTOR VERIFIES RESULTS.
```

The model is **not** the source of truth. Repository evidence is.

---

## Why it exists

AI tools can write code quickly. Engineering still needs answers to:

- What is this project?
- What depends on this module?
- What breaks if I change it?
- Which tests matter?
- Is this change within policy / workspace bounds?
- Did the requested change actually happen?
- What evidence supports the result?
- What remains UNKNOWN?

AgentDoctor exists for that loop — locally, inspectably, with explicit truth labels.

---

## How it works

```text
                 User / Student / Developer / AI agent
                                    │
                                    ▼
                              AgentDoctor
                     (CLI · MCP · Dashboard)
                                    │
                                    ▼
                        Project Understanding
              ┌─────────────┬─────────────┬──────────────┐
              │ Project Brain │ Code Graph │ Project DNA  │
              │ Architecture  │ Deps/Git   │ Tests/Sec    │
              │ Requirements  │ Search     │ Evidence     │
              └─────────────┴─────────────┴──────────────┘
                                    │
                                    ▼
                     Reasoning (optional LLM / deterministic)
                                    │
                                    ▼
                         Controlled tools (path-safe)
                                    │
                                    ▼
                    Verification · Evidence · Proof
```

---

## Who is it for?

### Students

College / B.Tech / final-year projects, inherited repos, viva prep, documentation.

```bash
agentdoctor start
agentdoctor learn .
agentdoctor learn . --viva
agentdoctor learn . --docs
agentdoctor ask "Explain authentication like a beginner." .
```

Use **Build With Me** only with explicit approval (`--approve`) before writes.

### Developers

Inherited codebases, impact analysis, deps, architecture, change assurance.

```bash
agentdoctor dna .
agentdoctor graph .
agentdoctor map .
agentdoctor deps .
agentdoctor search "login" .
agentdoctor what-if src/auth.js .
agentdoctor change analyze .
```

### AI-assisted developers

Works alongside Cursor, Claude Code, Codex, Copilot, Windsurf, Gemini CLI, Aider, and similar workflows as an **assurance / intelligence layer** (scan adapters + MCP) — not as a replacement IDE.

```bash
agentdoctor mcp --root /absolute/path/to/project
agentdoctor plan "Add password reset" .
agentdoctor agent --goal "…" --approve --apply --apply-ops '[...]' .
```

### Security / reviewers

Secrets (redacted), technical security heuristics, forensic read-only mode, path/approval controls, evidence.

```bash
agentdoctor secrets .
agentdoctor security-doctor .
AGENTDOCTOR_FORENSIC_MODE=1 agentdoctor forensic .
agentdoctor evidence verify <changeId> .
```

### Teams / owners

Local project DNA, twin snapshots, decisions/ADRs, org catalog (local JSON — not enterprise SSO).

```bash
agentdoctor twin .
agentdoctor decisions .
agentdoctor org .
agentdoctor dashboard .
```

---

## What can it do?

Status below = **complete at defined local scope** (see [docs/LIMITATIONS.md](docs/LIMITATIONS.md)). **EXTERNAL** means outside systems are required for that upgrade path.

### Understand

| Capability                       | CLI / surface        | Notes                          |
| -------------------------------- | -------------------- | ------------------------------ |
| Safe project discovery           | `start`              | Refuses home/Desktop dumps     |
| Project DNA                      | `dna`, `start`       | Manifest / marker evidence     |
| Code graph + AST                 | `graph`              | Strong TS/JS; host/line others |
| Architecture / C4                | `architecture`, `c4` | Advisory unless you gate it    |
| Dependencies + lockfiles         | `deps`               | VERIFIED when lock parsed      |
| Software map / code health       | `map`, `health-code` | Layout + indicators            |
| Project Brain                    | `brain`, MCP         | Local, deterministic           |
| Requirements / API / DB / events | `requirements`, …    | File evidence; live = EXTERNAL |

### Ask

| Capability   | CLI / surface | Notes                                    |
| ------------ | ------------- | ---------------------------------------- |
| Project Chat | `ask`, `chat` | Deterministic without LLM; LLM optional  |
| Truth labels | responses     | VERIFIED / INFERRED / UNKNOWN / EXTERNAL |
| Search       | `search`, MCP | Lexical / TF-IDF; embeddings = EXTERNAL  |

### Build

| Capability        | CLI / surface         | Notes                                        |
| ----------------- | --------------------- | -------------------------------------------- |
| Plan              | `plan`                | No writes                                    |
| Coding agent      | `agent`, `role-agent` | Writes need `--approve`                      |
| MCP agent tools   | `mcp`                 | Token + planHash; bare `approved:true` fails |
| Controlled runner | `run`, `policy`       | Shell off by default                         |

### Test

| Capability     | CLI / surface | Notes                                   |
| -------------- | ------------- | --------------------------------------- |
| Test Brain     | `test-brain`  | Mapping / impact — not mutation testing |
| Impact         | `impact`      | Heuristic; coverage optional            |
| Evaluation lab | `eval-lab`    | Fixture checks                          |

### Secure

| Capability         | CLI / surface      | Notes                                    |
| ------------------ | ------------------ | ---------------------------------------- |
| Secrets (redacted) | `secrets`          | Values never printed                     |
| Security Doctor    | `security-doctor`  | Technical heuristics ≠ commercial SAST   |
| Forensic mode      | `forensic` + env   | Read-only; blocks writes/exec            |
| Path / workspace   | all write surfaces | Traversal / symlink escape blocked       |
| Privacy Doctor     | `privacy-doctor`   | Technical PII-ish — not legal compliance |

### Verify

| Capability          | CLI / surface                        | Notes                               |
| ------------------- | ------------------------------------ | ----------------------------------- |
| Change analyze      | `change analyze`                     |                                     |
| Evidence / proof    | `change verify`, `evidence`, `proof` | Integrity ≠ engineering correctness |
| Scan → Fix → Verify | `scan`, `fix`, `verify`              | Agent-config safety                 |
| Self-check          | `self-check`                         | Installation diagnosis              |

### Learn

| Capability          | CLI                                                |
| ------------------- | -------------------------------------------------- |
| Learn / viva / docs | `learn`, `--viva`, `--docs`                        |
| Build With Me       | `learn --mode BUILD_WITH_ME --build "…" --approve` |

### Remember / operate (local)

| Capability            | CLI / surface            | Boundary                                         |
| --------------------- | ------------------------ | ------------------------------------------------ |
| Decisions / evolution | `decisions`, `evolution` | Local ledgers / git                              |
| Digital Twin          | `twin`                   | Local snapshot — not live runtime twin           |
| What-if               | `what-if`                | Graph impact — not certainty                     |
| Infra markers         | `infra`                  | Compose/K8s/TF **files** — live cluster EXTERNAL |
| Incident hypotheses   | `incident`               | Not auto-verified root cause; APM EXTERNAL       |
| Org catalog           | `org`                    | Local JSON — IdP EXTERNAL                        |

---

## Not just a coding agent

A coding agent can modify files. AgentDoctor is built for the full loop:

```text
UNDERSTAND → PLAN → APPROVE → CHANGE → TEST → SECURE → VERIFY → PROVE
```

**Don't just generate a change. Understand the project and verify the change.**

Proof means **hash integrity over evidence**, with:

`ENGINEERING_CORRECTNESS_NOT_CLAIMED`

---

## Workflow: “Add password reset”

1. `agentdoctor start` — discover project, DNA, Brain
2. `agentdoctor ask "How does authentication work?"` — evidence-backed / deterministic paths
3. `agentdoctor search login` / `what-if src/auth.js` — related files & tests
4. `agentdoctor plan "Add password reset"` — plan only; **no writes**
5. Review risk; approve explicitly
6. `agentdoctor agent --goal "Add password reset" --approve --apply --apply-ops '[…]'` — path-safe tools
7. `agentdoctor change analyze` / `change verify` — assessment + evidence
8. `agentdoctor proof` — integrity check
9. Read **Verified / Not verified / UNKNOWN** — never treat integrity as product correctness

Student path: `learn` → ask → viva → docs → Build With Me (with `--approve`).

---

## Install

Requires **Node.js 20+**.

```bash
npm install -g @praneeth_54/agentdoctor@3.0.0
agentdoctor --version   # 3.0.0
agentdoctor --help
```

Or without global install:

```bash
npx @praneeth_54/agentdoctor@3.0.0 --help
```

---

## Five-minute quickstart

```bash
# 1. Install
npm install -g @praneeth_54/agentdoctor@3.0.0

# 2. Enter YOUR project (not your home folder)
cd /path/to/my-project

# 3. Discover
agentdoctor start

# 4. Understand
agentdoctor dna .
agentdoctor graph .
agentdoctor map .

# 5. Ask (works without an LLM — deterministic analyzers)
agentdoctor ask "Explain my project." .
agentdoctor ask "How does authentication work?" .

# 6. Inspect
agentdoctor search "TODO" .
agentdoctor deps .
agentdoctor security-doctor .

# 7. Plan a change (no writes)
agentdoctor plan "Add a health check endpoint" .

# 8. Apply only with explicit approval (example ops JSON; --goal required)
agentdoctor agent --goal "Add a health check note" --approve --apply \
  --apply-ops '[{"name":"create_file","arguments":{"path":"HEALTH.md","content":"# Health\n"}}]' .

# 9. Verify change signals
agentdoctor change analyze .
agentdoctor changes .
```

Optional UI (loopback):

```bash
agentdoctor dashboard .
# → http://127.0.0.1:<port>/
```

---

## Command reference

All commands below exist in the current CLI (`agentdoctor --help`). Prefer `--json` for scripts.

<details>
<summary><strong>Project & intelligence</strong></summary>

| Command                                                     | Purpose                         |
| ----------------------------------------------------------- | ------------------------------- |
| `start [path]`                                              | Safe discovery, DNA, Brain init |
| `dna [path]`                                                | Project DNA fingerprint         |
| `graph [path]`                                              | Intelligence graph              |
| `map [path]`                                                | Software map                    |
| `deps` / `dependency`                                       | Dependencies + lockfiles        |
| `search <query>`                                            | Symbol / concept search         |
| `health` / `health-code`                                    | Git / code health               |
| `requirements` / `api` / `database` / `events` / `features` | Lifecycle intelligence          |
| `twin` / `what-if` / `forensic` / `evolution` / `memory`    | Twin, impact, forensic, memory  |
| `infra` / `incident` / `org`                                | Local ops / org catalog         |

</details>

<details>
<summary><strong>Chat, agent, learning</strong></summary>

| Command                 | Purpose                                     | Safety                         |
| ----------------------- | ------------------------------------------- | ------------------------------ |
| `ask <question> [path]` | One-shot Project Chat                       | Deterministic if no provider   |
| `chat [path]`           | Interactive chat                            | Needs provider for LLM mode    |
| `plan <goal>`           | Plan only                                   | No file edits                  |
| `agent`                 | Tools / apply                               | `--apply` requires `--approve` |
| `role-agent`            | Role allowlists                             | Same approval gates            |
| `learn`                 | Student explain / viva / docs / build modes | Writes need approval           |

</details>

<details>
<summary><strong>Security, change, evidence</strong></summary>

| Command                                          | Purpose                          |
| ------------------------------------------------ | -------------------------------- |
| `scan` / `fix` / `verify`                        | Agent-config Scan → Fix → Verify |
| `secrets` / `security-doctor` / `privacy-doctor` | Secrets & technical doctors      |
| `change analyze` / `change verify`               | Change assessment & evidence     |
| `evidence` / `proof`                             | Inspect / integrity              |
| `policy` / `run` / `enforce`                     | Controlled execution             |
| `self-check` / `eval-lab` / `doctor`             | Self / eval / install health     |

</details>

<details>
<summary><strong>Brain, MCP, dashboard, workspace</strong></summary>

| Command                   | Purpose                                                     |
| ------------------------- | ----------------------------------------------------------- |
| `brain`                   | Project Brain CLI                                           |
| `mcp --root <abs-or-rel>` | Combined Brain + intelligence + agent MCP (STDIO)           |
| `brain-mcp`               | Brain-only MCP                                              |
| `dashboard [path]`        | Local read-only SPA (loopback)                              |
| `workspace`               | Multi-repo local isolation under `.agentdoctor/workspaces/` |

</details>

---

## AI providers

**AI is optional.** Core discovery, DNA, graph, scan/fix/verify, deps, search, security heuristics, evidence, and deterministic `ask` work **without** an API key.

Implemented providers ([docs/MODEL_PROVIDERS.md](docs/MODEL_PROVIDERS.md)):

| Provider                          | Role                             |
| --------------------------------- | -------------------------------- |
| `none`                            | Default fail-closed for LLM chat |
| `deterministic` / local analyzers | Project Chat without LLM         |
| `mock`                            | Tests / demos                    |
| `openai-compatible`               | OpenAI-compatible HTTP API       |
| `ollama`                          | Local Ollama-compatible HTTP     |

Configure with `AGENTDOCTOR_AI_PROVIDER`, `AGENTDOCTOR_AI_API_KEY`, `AGENTDOCTOR_AI_BASE_URL`, `AGENTDOCTOR_AI_MODEL`.

**Not implemented:** native Anthropic / Gemini clients (do not claim).

---

## MCP

Connect AgentDoctor to AI coding workflows over STDIO:

```bash
agentdoctor mcp --root /absolute/path/to/project
```

Audited combined server exposes **38 tools** (Brain + intelligence + agent), including project DNA/context/ask, search, file read, planning, change analysis, and controlled writes.

**Safety (verified):**

- Path / workspace bounds; traversal rejected
- Writes need trusted `approvalToken` + `planHash` + resource binding
- Bare `approved: true` is **rejected**
- `approval_issue` requires `AGENTDOCTOR_MCP_TRUSTED_APPROVE=1`
- Secret redaction; no unrestricted shell tool
- Forensic mode blocks write/execute

Details: [docs/MCP.md](docs/MCP.md) · [docs/AGENT_APPROVALS.md](docs/AGENT_APPROVALS.md)

---

## Security model

Repository content is **untrusted data** — never system policy.

Controls include:

- Central path safety (traversal, symlinks, workspace escape)
- Approval-bound mutations (CLI `--approve` / MCP grants)
- Controlled runner (`shell=false` by default)
- Secret scanning with **redaction**
- Forensic read-only mode (`AGENTDOCTOR_FORENSIC_MODE=1`)
- Prompt-injection treated as data (eval fixture + chat framing)
- Evidence / audit trails

AgentDoctor does **not** claim to be “completely safe,” a legal compliance product, or a commercial SAST replacement.

Policy: [SECURITY.md](SECURITY.md) · Model: [docs/SECURITY_MODEL.md](docs/SECURITY_MODEL.md)

---

## Truth model

| Label        | Meaning                                   |
| ------------ | ----------------------------------------- |
| **VERIFIED** | Directly supported by repository evidence |
| **INFERRED** | Derived from available signals            |
| **UNKNOWN**  | Insufficient evidence                     |
| **EXTERNAL** | Needs systems outside the local repo      |

Honesty is a feature: the system should not invent files, line numbers, or root causes.

---

## Evidence and proof

AgentDoctor answers: what changed, what was affected, what evidence exists, what was integrity-checked, and what remains uncertain.

```bash
agentdoctor change analyze .
agentdoctor change verify .
agentdoctor evidence inspect <changeId> .
agentdoctor proof verify <changeId> .
```

**Proof = hash integrity over an evidence bundle.** It is **not** a formal proof of correctness.

---

## Architecture (modules)

```text
CLI / MCP / Dashboard
        │
        ▼
Agent runtime · Project Chat · Student / roles
        │
        ▼
Context retrieval · Truth labels
        │
        ▼
Project Brain · Graph/AST · DNA · Git · Deps · Tests · Security · Twin
        │
        ▼
Path-safe tools · Approvals · Controlled runner
        │
        ▼
Change assessment · Evidence · Proof
```

Primary code: `src/cli`, `src/agent`, `src/product`, `src/intelligence`, `src/mcp`, `src/dashboard`, `src/core`, `src/assurance`, `src/security`.

---

## Technology stack

Derived from `package.json` and source:

| Area        | Technology                                        |
| ----------- | ------------------------------------------------- |
| Language    | TypeScript (ESM)                                  |
| Runtime     | Node.js ≥ 20                                      |
| CLI         | Commander                                         |
| Tests       | Vitest                                            |
| Build       | `tsc`                                             |
| MCP         | `@modelcontextprotocol/sdk`                       |
| Dashboard   | Local Node HTTP + embedded SPA                    |
| AST (TS/JS) | TypeScript compiler API                           |
| Packaging   | npm (`files`: `dist`, README, LICENSE, CHANGELOG) |
| License     | MIT                                               |

---

## Verification

**AgentDoctor 3.0** — local acceptance evidence:

| Gate                                    | Result                                                   |
| --------------------------------------- | -------------------------------------------------------- |
| Formal / release / product acceptance   | **PASS** (maintainers: [docs/internal/](docs/internal/)) |
| `npm run verify`                        | **627/627** tests, typecheck, lint, format, build        |
| Clean `npm pack` install                | PASS                                                     |
| MCP                                     | **38** tools; approval + path checks                     |
| Dashboard / API                         | Real project JSON (not fake cards)                       |
| Security / forensic / eval / self-check | PASS                                                     |
| P0 / P1 blockers                        | **0**                                                    |

Reproduce:

```bash
npm run verify
```

---

## Limitations

Honesty is part of the product. Read **[docs/LIMITATIONS.md](docs/LIMITATIONS.md)**.

Notable boundaries:

- Live Kubernetes / APM / enterprise IdP → **EXTERNAL**
- Neural embeddings / commercial SAST → **EXTERNAL**
- Full compiler-grade semantics for all languages → **EXTERNAL** where adapters are line scanners
- Optional LLM providers → configure explicitly; core stays useful without them
- Proof ≠ engineering correctness

Post-acceptance ideas for later releases: maintainers see [docs/internal/POST_3_0_BACKLOG.md](docs/internal/POST_3_0_BACKLOG.md).

---

## Roadmap

| Track                | Meaning                                                                           |
| -------------------- | --------------------------------------------------------------------------------- |
| **3.0.0 (released)** | Project intelligence, doctors, twin, what-if, forensic, eval, student/agent loops |
| **Coming soon**      | Maturity, language depth, runtime adapters, DX — not promised ship dates          |

---

## Documentation

Full index: **[docs/README.md](docs/README.md)**

| Topic            | Link                                                                  |
| ---------------- | --------------------------------------------------------------------- |
| Product          | [docs/PRODUCT.md](docs/PRODUCT.md)                                    |
| Project Chat     | [docs/PROJECT_CHAT.md](docs/PROJECT_CHAT.md)                          |
| AI Agent         | [docs/AI_AGENT.md](docs/AI_AGENT.md)                                  |
| Student mode     | [docs/STUDENT_MODE.md](docs/STUDENT_MODE.md)                          |
| MCP              | [docs/MCP.md](docs/MCP.md)                                            |
| Approvals        | [docs/AGENT_APPROVALS.md](docs/AGENT_APPROVALS.md)                    |
| Security model   | [docs/SECURITY_MODEL.md](docs/SECURITY_MODEL.md)                      |
| Evidence / Proof | [docs/EVIDENCE.md](docs/EVIDENCE.md) · [docs/PROOF.md](docs/PROOF.md) |
| Project Brain    | [docs/PROJECT_BRAIN.md](docs/PROJECT_BRAIN.md)                        |
| Limitations      | [docs/LIMITATIONS.md](docs/LIMITATIONS.md)                            |
| Feature guides   | [docs/guides/features/](docs/guides/features/)                        |
| Contributing     | [CONTRIBUTING.md](CONTRIBUTING.md)                                    |
| Security policy  | [SECURITY.md](SECURITY.md)                                            |
| Code of conduct  | [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)                              |
| Changelog        | [CHANGELOG.md](CHANGELOG.md)                                          |

---

## Contributing

```bash
git clone https://github.com/pranee54/AgentDoctor.git
cd AgentDoctor
npm install
npm run verify
```

See [CONTRIBUTING.md](CONTRIBUTING.md). Issues and PRs welcome via GitHub templates.

---

## License

[MIT](LICENSE) © AgentDoctor Contributors

---

## GitHub discoverability (maintainers)

Suggested repository description:

> Project intelligence and assurance for software — understand, ask, plan, approve, change, test, secure, verify, and prove. Local-first. MCP-ready.

Suggested topics: `software-engineering`, `developer-tools`, `code-intelligence`, `ai-agents`, `mcp`, `static-analysis`, `developer-experience`, `security`, `testing`, `typescript`

---

**Try it on a real project in five minutes.** If something is UNKNOWN, that is intentional — AgentDoctor should show the boundary, not invent certainty.
