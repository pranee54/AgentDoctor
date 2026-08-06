# AgentDoctor v0.1.4-beta

Backward-compatible distribution release that packages AgentDoctor as a first-class GitHub Action. CLI and scanner behavior are unchanged from v0.1.3-beta.

## What was added

- Composite GitHub Action (`action.yml`) that installs the published `@praneeth_54/agentdoctor` npm package and runs `agentdoctor --ci --json`
- Workspace-bounded scan path and report path validation, including rejection of traversal, escaping parent symlinks, final-path symlinks, and directory output targets
- Report writing through an exclusive same-directory temporary file followed by atomic rename
- CI smoke matrix covering accepted and rejected Action output-path cases
- README documentation for Action usage alongside the existing CLI JSON recipe

## What did not change

- Rule IDs, severities, and finding semantics
- JSON top-level scan contract (aside from `version` reflecting this release)
- Exit-code behavior: successful scans still exit `0` when findings exist
- Readiness scoring remains unavailable (`scores` is `null`, `scoringAvailable: false`)
- `--min-score` remains accepted but ignored until scoring ships
- Auto-fix remains deferred

## Compatibility

- No migration required for CLI or programmatic `scan()` consumers
- No public API breaking changes
- Action consumers should use `pranee54/AgentDoctor@v0.1.4-beta` (earlier tags do not include `action.yml`)
- The Action default `version` input installs `@praneeth_54/agentdoctor@0.1.4-beta`

## Testing

122 automated tests passing, plus Action smoke coverage in CI for output-path containment cases.

## Installation

```bash
npx @praneeth_54/agentdoctor@0.1.4-beta
```

Global:

```bash
npm install -g @praneeth_54/agentdoctor@0.1.4-beta
agentdoctor
```

GitHub Action:

```yaml
- uses: pranee54/AgentDoctor@v0.1.4-beta
  with:
    path: .
    output-file: agentdoctor-report.json
```

CLI binary remains `agentdoctor`.
