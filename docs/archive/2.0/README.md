# AgentDoctor 2.0 documentation

Canonical home for AgentDoctor **2.0** architecture, guides, audits, and release evidence.

**Package (current):** [`@praneeth_54/agentdoctor@2.1.0`](https://www.npmjs.com/package/@praneeth_54/agentdoctor). Historical 2.0.0 release report: [release/final-release-report.md](release/final-release-report.md). For 2.0.1 cut docs see [../2.0.1/](../2.0.1/).

**Positioning:** Engineering intelligence & safety for AI coding agents.

Product landing: [../../README.md](../../README.md)

---

## Quick navigation

### Overview

| Doc                                                                    | Purpose                                  |
| ---------------------------------------------------------------------- | ---------------------------------------- |
| [overview/architecture.md](overview/architecture.md)                   | Layered architecture                     |
| [overview/capabilities.md](overview/capabilities.md)                   | Capability map (SUPPORTED / PARTIAL / …) |
| [overview/feature-matrix.md](overview/feature-matrix.md)               | Legacy matrix (prefer capabilities)      |
| [overview/readiness-matrix.md](overview/readiness-matrix.md)           | Honest readiness                         |
| [overview/known-limitations.md](overview/known-limitations.md)         | What we do **not** claim                 |
| [overview/trust-boundaries.md](overview/trust-boundaries.md)           | Analysis vs evaluate vs enforce          |
| [overview/security-threat-model.md](overview/security-threat-model.md) | Threat model                             |

### Guides

| Doc                                                              | Purpose                      |
| ---------------------------------------------------------------- | ---------------------------- |
| [guides/cli.md](guides/cli.md)                                   | CLI surfaces                 |
| [guides/mcp.md](guides/mcp.md)                                   | Brain + combined MCP         |
| [guides/github-action.md](guides/github-action.md)               | CI Action inputs / examples  |
| [guides/api.md](guides/api.md)                                   | Dashboard HTTP API           |
| [guides/repository-brain.md](guides/repository-brain.md)         | Init / proposals / review    |
| [guides/knowledge-governance.md](guides/knowledge-governance.md) | Draft → approve / abstention |
| [guides/migration.md](guides/migration.md)                       | 1.x → 2.0 compatibility      |
| [guides/deployment.md](guides/deployment.md)                     | Local / self-hosted notes    |

### Reports

| Doc                                                                    | Purpose                            |
| ---------------------------------------------------------------------- | ---------------------------------- |
| [reports/implementation-report.md](reports/implementation-report.md)   | What shipped in-tree               |
| [reports/test-report.md](reports/test-report.md)                       | Test evidence                      |
| [reports/accuracy-benchmarks.md](reports/accuracy-benchmarks.md)       | Accuracy (no invented scores)      |
| [reports/performance-benchmarks.md](reports/performance-benchmarks.md) | Perf notes                         |
| [reports/release-notes.md](reports/release-notes.md)                   | Pre-cut notes (historical context) |

### Audits

| Doc                                                                    | Purpose                                 |
| ---------------------------------------------------------------------- | --------------------------------------- |
| [audits/deep-validation.md](audits/deep-validation.md)                 | Deep validation                         |
| [audits/security-test.md](audits/security-test.md)                     | Security test evidence                  |
| [audits/release-candidate-audit.md](audits/release-candidate-audit.md) | RC audit (pre-publish)                  |
| [audits/release-blockers.md](audits/release-blockers.md)               | Historical blockers (cleared for 2.0.0) |

### Release

| Doc                                                                            | Purpose                             |
| ------------------------------------------------------------------------------ | ----------------------------------- |
| [release/final-release-report.md](release/final-release-report.md)             | **Verified** 2.0.0 release evidence |
| [release/public-release-plan.md](release/public-release-plan.md)               | Prep plan (historical)              |
| [release/npm-packaging-decision.md](release/npm-packaging-decision.md)         | Option B packaging                  |
| [release/version-cut-report.md](release/version-cut-report.md)                 | Version cut record                  |
| [release/final-release-scope-review.md](release/final-release-scope-review.md) | Scope review                        |

---

## Related docs elsewhere

| Path                                       | Role                                      |
| ------------------------------------------ | ----------------------------------------- |
| [../guides/](../guides/)                   | Developer how-tos (quickstart, migration) |
| [../reference/](../reference/)             | Rules, scoring, exit codes                |
| [../features/](../features/)               | Feature deep-dives                        |
| [../mcp/brain-mcp.md](../mcp/brain-mcp.md) | Brain MCP protocol detail                 |
| [../archive/](../archive/)                 | Historical plans (not current claims)     |

Prefer **this tree** + [../2.0.1/](../2.0.1/) + the repository README for public claims about the assurance substrate; current package cut is **2.1.0**.
