# Contributing

Thanks for helping improve AgentDoctor.

## Quick start for new contributors

1. Fork and clone the repository.
2. Install with Node.js 20+:

   ```bash
   npm install
   ```

3. Verify:

   ```bash
   npm run verify
   ```

4. Try a local scan:

   ```bash
   npm run build
   node dist/cli/index.js ./fixtures/clean-configured-project
   ```

5. Prefer issues labeled `good first issue` or `help wanted`. Starter ideas: [docs/good-first-issues.md](docs/good-first-issues.md).

6. Open a focused pull request (one concern per PR).

## Ground rules

- Be respectful — see [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
- Prefer small, focused pull requests
- Do not commit real secrets or credentials (fixtures may use `FAKE_TEST_CREDENTIAL` only)
- Keep documentation accurate to implemented behavior
- New or changed rules must update [docs/rules.md](docs/rules.md)

## Development setup

See [docs/development.md](docs/development.md).

```bash
npm install
npm run verify
```

## Pull requests

1. Fork and create a branch
2. Add or update tests for behavior changes
3. Update docs when user-facing behavior changes
4. Ensure CI checks pass
5. Fill out the PR template

## Reporting bugs and finding quality issues

- **CLI crashes / incorrect behavior:** [bug report](.github/ISSUE_TEMPLATE/bug_report.md)
- **Wrong finding:** [false positive](.github/ISSUE_TEMPLATE/false_positive.md)
- **Missed problem:** [false negative](.github/ISSUE_TEMPLATE/false_negative.md)

Include AgentDoctor version, rule ID when relevant, and anonymized evidence. **Never paste real secrets.**

## Security issues

Do not file public issues for vulnerabilities. Follow [SECURITY.md](SECURITY.md).

## Feature requests

Open an issue describing the problem first. New rules and adapters should include:

- Official documentation references when agent-specific
- Stable rule/adapter IDs
- Tests and false-positive considerations

Templates: [feature request](.github/ISSUE_TEMPLATE/feature_request.md), [rule proposal](.github/ISSUE_TEMPLATE/rule_proposal.md), [adapter request](.github/ISSUE_TEMPLATE/adapter_request.md).
