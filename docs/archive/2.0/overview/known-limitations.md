# AgentDoctor 2.0 — Known Limitations

1. Deep audits and readiness reports live under `docs/2.0/` on GitHub (not shipped inside the npm tarball).
2. **AST analysis** is TypeScript/JavaScript oriented; other languages unsupported.
3. **Call/import resolution** is best-effort; dynamic requires / reflection under-detected.
4. **Test impact** lacks coverage-file ingestion; results are graph/heuristic.
5. **C4 views** are inferred/proposed, not validated architecture truth.
6. **Policy firewall** is evaluate-only unless controlled runner/CI wrapper is used.
7. **Dashboard `?user=`** is not authentication.
8. **Team auth** is local-dev scrypt — not enterprise SSO/IdP.
9. **SQLite/Postgres/vector** storage not production-complete (`sqliteStorage` / `vectorSearch` flags false).
10. **Multi-repo workspaces** partially stubbed at API level.
11. **No IDE interception** of third-party coding agents.
12. **Incremental indexing / graph invalidation** incomplete vs cold rebuild (perf harness repeat is full rebuild).
13. **Benchmark numbers** only where measured — see `benchmarks/ast-graph-perf-latest.json` (synthetic 120-file sample; not a scalability claim).
14. **Cloud deployment / managed multi-tenant** unsupported in this package.
15. **Tamper-evident audits** are best-effort hash chains, not HSM-backed.
16. **Secret redaction** is heuristic pattern-based — novel formats may miss.
17. **Controlled runner** does not execute allowed commands yet (`executeIfAllowed` still `not-executed`).
18. **Path safety** hardened for MCP/dashboard in deep validation; continued adversarial fuzzing still recommended.
