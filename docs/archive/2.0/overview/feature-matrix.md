# AgentDoctor 2.0 — Feature Matrix

**Prefer the canonical map:** [capabilities.md](capabilities.md) (SUPPORTED / PARTIAL / EXPERIMENTAL / NOT YET SUPPORTED).

This file keeps a compact index for older links.

| Capability                            | Status            | Notes                                                   |
| ------------------------------------- | ----------------- | ------------------------------------------------------- |
| Safety scan/fix/verify                | SUPPORTED         | Preserved from 1.x                                      |
| Agent adapters (7)                    | SUPPORTED         | Cursor, Claude, Codex, Copilot, Windsurf, Gemini, Aider |
| Project Brain store + MCP tools       | SUPPORTED         | Tool names unchanged                                    |
| Shared contracts + adapters           | PARTIAL           | `src/contracts`                                         |
| `agentdoctor init` + proposal review  | PARTIAL           | Proposals never auto-approved                           |
| Brain snapshot/update/review CLI      | PARTIAL           | Extends existing brain CLI                              |
| TS AST intelligence graph             | PARTIAL           | Compiler API; regex fallback                            |
| Git hotspots / bus factor / co-change | PARTIAL           | Method disclosed per metric                             |
| Dead-code categories                  | PARTIAL           | Heuristic categories only                               |
| C4 views                              | EXPERIMENTAL      | Inferred from graph evidence                            |
| Combined MCP (`agentdoctor mcp`)      | PARTIAL           | Brain + intelligence tools                              |
| Sessions / provenance                 | PARTIAL           | Platform store                                          |
| Policy packs + evaluate-only firewall | PARTIAL           | Packs in `src/policy/packs`                             |
| Controlled command runner             | PARTIAL           | Blocks only under AD control                            |
| Governed knowledge store              | PARTIAL           | Abstains without approval                               |
| Test / refactor impact                | PARTIAL           | No coverage ingestion yet                               |
| Storage provider (FS/memory)          | PARTIAL           | SQLite/Postgres adapters stubbed                        |
| Multi-repo workspaces                 | PARTIAL           | API notice; not full product                            |
| Local-dev team auth + RBAC            | PARTIAL           | Explicitly not enterprise SSO                           |
| Dashboard + `/api/v2/*`               | PARTIAL           | Loopback default                                        |
| Vector search / cloud deploy / IdP    | NOT YET SUPPORTED | Interfaces or docs only                                 |
| Full multi-language AST               | NOT YET SUPPORTED | TS/JS only                                              |
| Direct IDE interception               | NOT YET SUPPORTED | Not claimed                                             |
| Change Proof runtime                  | PLANNED           | Design direction only                                   |

Classification key matches [readiness-matrix.md](readiness-matrix.md).
