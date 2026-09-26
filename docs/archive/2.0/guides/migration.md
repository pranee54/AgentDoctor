# AgentDoctor 2.0 — Migration Guide

## Version policy

Package version: **2.1.0**. Contracts version string `2.0.0-contracts` identifies shared types.

## Backward compatibility

| Surface                                    | Compatibility                        |
| ------------------------------------------ | ------------------------------------ |
| Safety CLI + exit codes                    | Preserved                            |
| Package exports for scan/verify/fix        | Preserved; additive exports appended |
| Project Brain store format                 | Preserved                            |
| Brain MCP tool names                       | Preserved                            |
| Platform `executionResult: "not-executed"` | Preserved                            |
| Dashboard loopback defaults                | Preserved                            |

## Additive artifacts

| Path                             | Meaning                             |
| -------------------------------- | ----------------------------------- |
| `.agentdoctor/repository-brain/` | Init proposals + reviews            |
| `.agentdoctor/knowledge/`        | Governed knowledge records          |
| `.agentdoctor/team/`             | Local-dev users/sessions            |
| `.agentdoctor/platform/`         | Existing platform snapshots/reports |

## Safe upgrade steps

1. Run `npm run verify` on current tree.
2. Pull additive code; keep existing `.agentdoctor` dirs.
3. Run `agentdoctor scan` and `agentdoctor brain status`.
4. Optionally `agentdoctor init` for proposals (non-destructive to claims).
5. Do **not** treat new proposals as approved without review.

## Breaking changes

None intended for 1.1.x consumers upgrading to 2.0.0. See root [CHANGELOG.md](../../../CHANGELOG.md).
