# AgentDoctor 3.0.0 — Truth Matrix (Zero-Trust Pass)

Status vocabulary: PASS | FAIL | PARTIAL | UNKNOWN | EXTERNAL | NOT_VERIFIED | FIXED

| Capability                 | Unit    | Integration | E2E     | Live        | Adversarial | Status       | Evidence                                        |
| -------------------------- | ------- | ----------- | ------- | ----------- | ----------- | ------------ | ----------------------------------------------- |
| Ownership layer            | Yes     | Yes         | Partial | Yes         | Yes         | PASS         | ownership.ts + hostile fixture                  |
| discoverFiles              | Yes     | Yes         | Yes     | Yes         | Yes         | PASS         | discovery/files.ts                              |
| Graph builders             | Yes     | Yes         | Partial | Yes         | Yes         | PASS         | listTsFiles/platform/enrich                     |
| Secrets scan               | Yes     | Yes         | Partial | Partial     | Yes         | PASS         | scan.ts + hostile                               |
| Security doctor            | Yes     | Yes         | Partial | Partial     | Yes         | PASS         | loadProjectSourceFiles                          |
| Monorepo detect            | Yes     | Yes         | No      | No          | Yes         | PASS         | detectMonorepo filter                           |
| Agent path ownership       | Yes     | Yes         | Partial | No          | Yes         | PASS         | execute.ts assertProjectOwnedRepoPath           |
| Path containment           | Yes     | Yes         | Yes     | No          | Yes         | PASS         | security/paths.ts                               |
| Approval grants            | Yes     | Yes         | Yes     | No          | Partial     | PASS         | session.ts + e2e                                |
| Dashboard what-if contract | Yes     | Yes         | No      | Partial     | Yes         | PASS         | /api/what-if + /api/whatif                      |
| Graph UI sampleNodes       | Yes     | Partial     | No      | Yes (prior) | No          | PASS         | client.ts renderGraph                           |
| DNA/Map/Deps/Decisions     | Yes     | Yes         | Partial | Yes         | Yes         | PASS         | hostile + APIs                                  |
| Project Chat deterministic | Partial | Partial     | No      | Partial     | Partial     | PARTIAL      | no foreign markers; weak UNKNOWN                |
| Project Chat provider      | No      | No          | No      | No          | No          | NOT_VERIFIED | —                                               |
| Prompt injection authority | Partial | No          | No      | No          | Partial     | NOT_VERIFIED | AGENTS.md bait owned as DATA only in fixture    |
| MCP live forge matrix      | Partial | Partial     | Partial | No          | No          | NOT_VERIFIED | —                                               |
| Brain stale snapshots      | Partial | No          | No      | No          | No          | PARTIAL      | filters; rebuild advised                        |
| Twin invalidation          | Yes     | Partial     | No      | Partial     | Partial     | PASS         | OWNERSHIP_BOUNDARY_VERSION=3                    |
| Search meta-docs           | Yes     | Partial     | No      | Partial     | Partial     | PARTIAL      | may hit owned docs quoting .private             |
| Documentation honesty      | —       | —           | —       | —           | —           | PARTIAL      | CURRENT_TRUTH authoritative; FINAL_* historical |
| Performance home-dir       | No      | No          | No      | No          | No          | NOT_VERIFIED | —                                               |
