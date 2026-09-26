# Agent Security (2.1)

**Status:** IMPLEMENTED (hardening + RC remediation tests) · **Release:** NOT PERFORMED

## Controls (IMPLEMENTED)

| Control          | Behavior                                                                                                                                                                                                                                  |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mode allowWrites | LEARN hard-blocks write/execute; other modes still need human approval                                                                                                                                                                    |
| Approvals        | Model cannot self-approve; writes need `approvedByHuman`                                                                                                                                                                                  |
| Path / symlink   | `resolveSafeRepoPath` rejects traversal and symlink-dir escape on create/edit/delete                                                                                                                                                      |
| Workspace        | Agent file tools call `assertWorkspacePathAccess` when a WorkspaceModel is provided; without workspace, repo-root isolation via `resolveSafeRepoPath` (incl. symlink-dir escape). Project A cannot reach Project B via traversal/symlink. |
| Tool output      | Labeled untrusted DATA in coding loop; mock refuses jailbreak tool payloads                                                                                                                                                               |
| Commands         | Controlled runner (`shell=false`); dangerous patterns blocked even after approval                                                                                                                                                         |
| Secrets          | Reuses `redactSecrets` / model redaction — no second implementation                                                                                                                                                                       |
| Provider none    | Dashboard `/api/chat` and MCP `project_ask` fail closed (no silent Mock)                                                                                                                                                                  |

## Labels

- **IMPLEMENTED:** Mode gates, approvals, path/symlink, runner block, fail-closed ask surfaces, redaction on tool results
- **EXTERNAL LIMITATION:** Not a full OS sandbox or EDR
- **NOT CLAIMED:** Completely safe, production guaranteed, understands everything

Repository data and TOOL_OUTPUT are UNTRUSTED. Dangerous commands (`rm -rf`, deploy, disk format) are blocked by the controlled runner even if the model requests them.
