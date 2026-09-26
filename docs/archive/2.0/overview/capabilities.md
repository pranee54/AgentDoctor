# AgentDoctor 2.0 — Capabilities

Canonical capability map for the published **`2.0.0`** product. Status labels:

| Label                 | Meaning                                                    |
| --------------------- | ---------------------------------------------------------- |
| **SUPPORTED**         | Implemented, tested, and documented for intended use       |
| **PARTIAL**           | Implemented with disclosed limits or incomplete validation |
| **EXPERIMENTAL**      | Available but inferred / unstable / not a hard contract    |
| **NOT YET SUPPORTED** | Explicitly out of scope or stubbed                         |

Related: [feature-matrix.md](feature-matrix.md) (legacy wording) · [readiness-matrix.md](readiness-matrix.md) · [known-limitations.md](known-limitations.md)

---

## Repository intelligence

| Capability                           | Status       | Notes                                                  |
| ------------------------------------ | ------------ | ------------------------------------------------------ |
| TypeScript / JavaScript AST graph    | PARTIAL      | Compiler API + regex fallback; not full multi-language |
| Import / inferred call relationships | PARTIAL      | Best-effort call edges                                 |
| Dependency analysis                  | PARTIAL      | Graph / manifests                                      |
| Git history intelligence / hotspots  | PARTIAL      | Method disclosed per metric                            |
| Dead-code categories                 | PARTIAL      | Heuristic categories only                              |
| Architecture views (C4-style)        | EXPERIMENTAL | Inferred from graph; labeled                           |
| Change impact                        | PARTIAL      | Heuristic                                              |
| Test impact                          | PARTIAL      | No coverage-file ground truth                          |
| Refactor / rename impact             | PARTIAL      | Blast-radius estimate                                  |

## Engineering knowledge

| Capability                                      | Status    | Notes                               |
| ----------------------------------------------- | --------- | ----------------------------------- |
| Project Brain store (claims, evidence, UNKNOWN) | SUPPORTED | Local `.agentdoctor/project-brain/` |
| Brain MCP tools (`brain_*`)                     | SUPPORTED | STDIO; provenance envelopes         |
| Repository Brain init / proposals               | PARTIAL   | Never auto-approved                 |
| Governed knowledge (draft → approve)            | PARTIAL   | Abstention without approval         |
| Provenance on Brain tool results                | SUPPORTED |                                     |

## AI agent infrastructure

| Capability                                    | Status    | Notes                                                            |
| --------------------------------------------- | --------- | ---------------------------------------------------------------- |
| Combined MCP (`agentdoctor mcp`)              | PARTIAL   | Brain + intelligence tools                                       |
| Agent adapters (7 surfaces)                   | SUPPORTED | Cursor, Claude Code, Codex, Copilot, Windsurf, Gemini CLI, Aider |
| Shared contracts                              | PARTIAL   | `src/contracts`                                                  |
| Local dashboard + `/api/v2/*`                 | PARTIAL   | Loopback default                                                 |
| Programmatic API (`scan`, Fix, Brain helpers) | SUPPORTED | Package export                                                   |
| GitHub Action (Safety scan / verify)          | SUPPORTED | Default npm pin `2.0.0`                                          |

## Safety & governance

| Capability                                               | Status    | Notes                                         |
| -------------------------------------------------------- | --------- | --------------------------------------------- |
| Scan → Safe Fix → Verify                                 | SUPPORTED | Deterministic Safety layer                    |
| Policy gates (`--min-score`, severity, rule, verify-new) | SUPPORTED |                                               |
| Evaluate-only policy / firewall                          | PARTIAL   | `executionResult: "not-executed"` by default  |
| Controlled enforcement runner                            | PARTIAL   | Blocks under AD control; not IDE interception |
| Secret scan (redacted findings)                          | PARTIAL   | Opt-in                                        |
| Path-safety (MCP / dashboard)                            | PARTIAL   | Traversal / symlink controls                  |
| Local-dev team auth                                      | PARTIAL   | scrypt — **not SSO**                          |

## Verification

| Capability                                              | Status            | Notes                           |
| ------------------------------------------------------- | ----------------- | ------------------------------- |
| `npm run verify` (typecheck, lint, format, unit, build) | SUPPORTED         |                                 |
| Packed CLI clean-install smoke                          | SUPPORTED         |                                 |
| AST performance harness                                 | PARTIAL           | Synthetic sample                |
| Change Proof evidence records                           | NOT YET SUPPORTED | Roadmap / design direction only |

## Explicitly not yet supported

| Capability                                     | Status                      |
| ---------------------------------------------- | --------------------------- |
| Enterprise SSO / IdP                           | NOT YET SUPPORTED           |
| Full multi-language AST                        | NOT YET SUPPORTED           |
| Coverage-backed test selection as ground truth | NOT YET SUPPORTED           |
| IDE / agent process interception               | NOT YET SUPPORTED           |
| Production multi-tenant cloud in this package  | NOT YET SUPPORTED           |
| SQLite / Postgres storage backends             | NOT YET SUPPORTED (stubbed) |
| Vector search                                  | NOT YET SUPPORTED           |
| Guaranteed autonomous policy execution         | NOT YET SUPPORTED           |
