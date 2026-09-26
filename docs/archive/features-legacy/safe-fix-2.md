# Safe Fix 2.0 — Backup, Undo, Audit

## Apply

`agentdoctor fix -y` still runs the allowlisted writers. Before any write (non-dry-run), AgentDoctor creates:

```text
.agentdoctor/fix-audit/<auditId>/audit.json
.agentdoctor/fix-audit/<auditId>/backups/<relative-path>
```

`FixApplyResult.auditId` is set when a backup was created.

## Undo / history

```bash
agentdoctor fix-history [path] [--json]
agentdoctor fix-undo <auditId> [path]
```

Undo restores previous file contents for paths that existed, or deletes files that were created by the apply. A new undo audit record is written.

## Safety preserved

- Symlink / directory / allowlist preflight still runs before backup+write.
- Multi-writer apply remains **non-transactional** after the first successful write (`partial: true`).
- Dry-run never creates audits or writes.

## Limitations

- No concurrent mtime/hash conflict detection yet.
- Per-finding interactive approval is not implemented (use `--dry-run` then `--yes`).
