# Limitations

Honest capability boundaries for AgentDoctor **3.0**.

Limitations below are **defined scope**, not unfinished stubs.
Core local paths are implemented and tested; items marked EXTERNAL require outside systems.

## Capability-level boundaries (COMPLETE at defined scope)

1. **Project DNA** — COMPLETE via manifests + path/detector evidence. Cloud/DB runtime identity beyond files remains EXTERNAL.
2. **AST** — TS/JS: compiler API COMPLETE. Python/PHP: host-tool AST COMPLETE when binaries present. Go/Java/Kotlin/Rust/Dart: line-scanner COMPLETE for package/import/symbol extraction; **calls/types = capability-level partial** disclosed in adapters; full compilers EXTERNAL.
3. **Call graph** — COMPLETE as identifier-/import-based static graph with confidence labels — not full type-checker binding for all languages.
4. **Dependencies** — COMPLETE with lockfile parsers (npm/yarn/pnpm) when lockfiles exist; ecosystems without locks report UNKNOWN/INFERRED.
5. **Search** — COMPLETE local hybrid TF-IDF keyword index. Neural embeddings EXTERNAL.
6. **Requirements** — COMPLETE for local markdown/docs adapters. Live Jira/Linear EXTERNAL.
7. **API Doctor** — COMPLETE for REST route + OpenAPI JSON/minimal YAML + static GraphQL SDL/`gql` markers. Live gateway introspection EXTERNAL.
8. **Database / Event doctors** — COMPLETE for schema/migration/ORM/queue **file** evidence. Live DB/broker EXTERNAL.
9. **Digital Twin** — COMPLETE refreshable local snapshot + incremental invalidation store. Continuous live runtime sync EXTERNAL.
10. **What-if** — COMPLETE graph-derived impact with uncertainty — never presented as certainty.
11. **Institutional memory** — COMPLETE lexical/hybrid project-scoped retrieval. Neural memory EXTERNAL.
12. **Evaluation Lab** — COMPLETE with multiple fixtures including prompt-injection (detect-only). Always expandable.
13. **Org model** — COMPLETE local catalog JSON. Enterprise IdP/directory EXTERNAL.
14. **Dashboard** — COMPLETE embedded hash-route SPA consuming real APIs (not a separate SPA framework).

## Security / compliance

15. Security Doctor = technical static analysis COMPLETE locally — not a replacement for commercial SAST/SCA (EXTERNAL).
16. Privacy Doctor findings may be INFERRED — **never** legal compliance.
17. OIDC library path exists; browser OAuth / production IdP flows EXTERNAL.
18. MCP writes require trusted `approvalToken` + planHash + resource binding. Bare `approved:true` is rejected. `approval_issue` requires `AGENTDOCTOR_MCP_TRUSTED_APPROVE=1`.
19. Forensic mode (`AGENTDOCTOR_FORENSIC_MODE=1`) refuses write/execute tools.

## Agent

20. `AgentRuntime.runTurn` **does execute tools** when `executeTools` is enabled (default) and write/execute tools require `approvedByHuman` (same gates as coding loop / `executeAgentTool`).
21. CLI `--approve` is a **local trusted human session** for coding-loop mutations. MCP cannot use that path without grant tokens.
22. Role agents share one loop with enforced tool allowlists — not separate OS processes.
23. AI answers need a configured provider; deterministic Project Chat works with provider `none`.

## Process

24. Optional LLM providers and live cloud/runtime systems remain EXTERNAL unless connected.
25. Post-3.0 ideas are backlog only — see `docs/internal/POST_3_0_BACKLOG.md` (maintainers).
