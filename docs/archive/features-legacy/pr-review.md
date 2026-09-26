# PR review (local dry-run)

```bash
agentdoctor pr-review [path] [--base <ref>] [--json]
```

## Guarantees

- Runs entirely locally (scan + context-health + git changes).
- Always sets `posted: false`.
- Never requires a GitHub token.
- Comment markdown redacts common secret patterns.
- Does **not** claim a PR is “safe” when findings are empty.

## Future (not implemented)

Optional GitHub API posting would require an **explicit** separate command, documented token scopes, and dry-run default. That path is intentionally not wired.
