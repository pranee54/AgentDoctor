# AgentDoctor 2.0 — Readiness Matrix

Honest readiness for published **`@praneeth_54/agentdoctor@2.0.0`**.

Do **not** use star ratings (`5/5`), “best”, or “guaranteed”. Prefer: **SUPPORTED** · **PARTIAL** · **EXPERIMENTAL** · **PLANNED** · **NOT YET SUPPORTED**.

**Evidence baseline:** `npm run verify` — 53 files / 394 tests PASS; packed clean-install smoke PASS; npm `latest` = `2.0.0` (see [final-release-report.md](../release/final-release-report.md)).

| Capability                                           | Classification    | Evidence / notes                                  |
| ---------------------------------------------------- | ----------------- | ------------------------------------------------- |
| Safety layer (scan / fix / verify / policy / Action) | SUPPORTED         | Preserved 1.x contract; CI + Action pins `2.0.0`  |
| Brain MCP (`brain_*`, STDIO)                         | SUPPORTED         | Tool names stable; provenance envelopes           |
| Shared contracts                                     | PARTIAL           | Implemented; partially validated                  |
| Repository Brain init / review                       | PARTIAL           | Proposals never auto-approved                     |
| TS/JS AST graph                                      | PARTIAL           | Synthetic perf sample; path/symlink hardened      |
| Git intelligence                                     | PARTIAL           | Method disclosed; perf unmeasured at scale        |
| C4 views                                             | EXPERIMENTAL      | Inferred; labeled                                 |
| Combined MCP intelligence                            | PARTIAL           | STDIO tests; path escape + evaluate-only          |
| Knowledge governance                                 | PARTIAL           | Abstention without approval                       |
| Enforcement runner                                   | PARTIAL           | Honesty tests; not IDE interception               |
| Local-dev team auth                                  | PARTIAL           | scrypt; **not SSO**                               |
| Dashboard `/api/v2`                                  | PARTIAL           | Loopback + hostile-path checks                    |
| npm pack / clean install                             | SUPPORTED         | Published `2.0.0` smoke PASS                      |
| Public docs for 2.0                                  | PARTIAL           | Option B: deep docs on GitHub, not in npm tarball |
| SQLite / Postgres                                    | NOT YET SUPPORTED | Stubbed                                           |
| Vector search                                        | NOT YET SUPPORTED | Flag off                                          |
| Enterprise SSO                                       | NOT YET SUPPORTED | External dependency / product scope               |
| Multi-language AST                                   | NOT YET SUPPORTED | TS/JS depth only                                  |
| IDE interception                                     | NOT YET SUPPORTED | Not claimed                                       |
| Change Proof runtime                                 | PLANNED           | Design direction only                             |

## Product readiness statement

AgentDoctor **2.0.0** is a published open-source release combining Safety, Brain MCP, repository intelligence, and agent interfaces. Maturity varies by layer — use this matrix and [capabilities.md](capabilities.md) rather than blanket “production-ready” claims.
