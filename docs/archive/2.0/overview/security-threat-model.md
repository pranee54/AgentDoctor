# AgentDoctor 2.0 — Security Threat Model

## Assets

- Repository source and agent config files
- Project Brain claims / evidence
- Knowledge records and approvals
- Local team credentials (dev mode)
- Policy decisions and audit chains
- Dashboard/API responses (must not leak secrets)

## Adversaries

| Actor                          | Capability                              |
| ------------------------------ | --------------------------------------- |
| Malicious instruction files    | Prompt injection / context poisoning    |
| Compromised MCP client         | Tool abuse, path traversal attempts     |
| Local multi-user host          | Spoof `?user=` dashboard roles          |
| Supply-chain / CI runner abuse | Destructive shell if enforcement absent |

## Controls

| Threat                          | Control                                                      | Residual risk                                    |
| ------------------------------- | ------------------------------------------------------------ | ------------------------------------------------ |
| Secret disclosure via MCP/Brain | Redaction pipelines; evidence never returns secret plaintext | Heuristic redaction misses novel formats         |
| Path escape                     | Root resolution + boundary checks in MCP handlers            | Symlink races on hostile FS                      |
| Fake “blocked” claims           | `executionResult: "not-executed"` unless AD runner blocks    | Callers may misread evaluate-only as enforcement |
| Role spoofing on dashboard      | Documented: `?user=` is not auth; loopback default           | Shared host can spoof roles                      |
| Credential theft (local-dev)    | scrypt hashes; redacted returns                              | Dev-only auth ≠ enterprise                       |
| Destructive commands            | Policy packs + controlled runner                             | Only effective when AD owns execution boundary   |
| Tamper of audit logs            | Append-only hash chain in enforcement audits                 | Best-effort; not HSM-backed                      |

## Explicit non-claims

- Evaluate-only firewall does **not** intercept Cursor/Claude/Codex processes.
- Local-dev team auth is **not** SSO.
- Dashboard is **not** an enterprise authorization boundary.
