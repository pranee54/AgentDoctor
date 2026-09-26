# AgentDoctor v0.1.1-beta

Patch release fixing false positives in `instructions/missing-path-reference`.

## What was fixed

Nested instruction files (for example `.cursor/rules/*.mdc`) previously resolved every local path reference relative to the instruction file directory. A repository-root path such as `proxyshield/backend/admin/includes/layout.php` was incorrectly checked as `.cursor/rules/proxyshield/...`, producing false missing-path warnings for files that exist at the repository root.

Repository-root-style references now resolve from the repository root. Explicit `./` and `../` references still resolve from the instruction file location and remain strictly repository-bounded.

CSS-like backtick tokens such as `.content` are no longer treated as filesystem paths.

## Why it matters

Repositories that use nested instruction files should no longer receive incorrect missing-path warnings for valid repository-root paths.

## Compatibility

- No migration required.
- No public API change.
- No scoring changes.
- No automatic-fix changes.
- Existing repository-boundary protections remain intact.

## Installation

```bash
npx @praneeth_54/agentdoctor@0.1.1-beta
```

Global:

```bash
npm install -g @praneeth_54/agentdoctor@0.1.1-beta
agentdoctor
```

CLI binary remains `agentdoctor`.
