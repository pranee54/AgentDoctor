# Contributing

Thanks for helping improve AgentDoctor.

## Ground rules

- Be respectful — see [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
- Prefer small, focused pull requests
- Do not commit secrets or real credentials
- Keep documentation accurate to implemented behavior

## Development setup

See [docs/development.md](docs/development.md).

```bash
npm install
npm run typecheck
npm run lint
npm test
npm run build
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
