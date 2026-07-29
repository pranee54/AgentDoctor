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

5. Prefer issues labeled `good first issue` or `help wanted`.

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

## Reporting bugs

Use the bug report issue template. Include:

- AgentDoctor version (`agentdoctor --version`)
- Node.js version
- Minimal reproduction (fixture or anonymized tree)
- Whether `--json` reproduces the issue

## Security issues

Do not file public issues for vulnerabilities. Follow [SECURITY.md](SECURITY.md).

## Feature requests

Open an issue describing the problem first. New rules and adapters should include:

- Official documentation references when agent-specific
- Stable rule/adapter IDs
- Tests and false-positive considerations
