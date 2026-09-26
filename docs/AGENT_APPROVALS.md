# Agent Approvals (2.1)

**Status:** IMPLEMENTED · **Release:** NOT PERFORMED

| Risk     | Examples                              | Gate           |
| -------- | ------------------------------------- | -------------- |
| LOW      | read, search, explain                 | Auto-allow     |
| MEDIUM   | source edits, create, tests           | Human approval |
| HIGH     | delete, installs, migrations, network | Human approval |
| CRITICAL | credentials, deploy, destructive      | Human approval |

The model cannot approve its own actions. CLI/UI must pass explicit `--approve` / `approvedByHuman`.

## Product approval records

`src/product/approval/model.ts` defines `ApprovalRecord` (action, reason, resources, risk, requirement, state, actor). `evaluateApprovalRecord` **never** treats caller `approved=true` alone as sufficient — `approvedByHuman` must be set by the trusted CLI/MCP session layer. Dashboard chat does not grant approvals.

**Maturity:** SUPPORTED (unit tests) · persistence is via change ledger, not a separate approval store.
