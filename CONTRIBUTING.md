# Contributing

Thanks for helping improve **AgentDoctor** — engineering intelligence and safety for AI coding agents.

## Project overview

| Layer                   | What it is                                                         |
| ----------------------- | ------------------------------------------------------------------ |
| Repository intelligence | AST graph, Git hotspots, change / test / refactor impact           |
| Engineering knowledge   | Project Brain, governed knowledge, provenance                      |
| Safety                  | Deterministic agent-config Scan → Safe Fix → Verify → policy gates |
| Agent interfaces        | Brain MCP, combined MCP, adapters, CLI, local dashboard            |
| Verification            | `npm run verify`, packed smoke, CI Action                          |

Canonical product docs: [docs/README.md](docs/README.md) · [README.md](README.md)

## Development setup

Node.js **20+**.

```bash
git clone https://github.com/pranee54/AgentDoctor.git
cd AgentDoctor
npm install
npm run build
npm run verify
```

## Common commands

```bash
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
npm run verify                 # typecheck + lint + format + unit + build

npm run test:understanding
npm run verify:understanding
npm run test:mcp
npm run verify:mcp
npm run validate:project-brain
npm run benchmark:project-brain
npm run verify:project-brain
npm run validate:mcp-agent
```

Local Safety smoke:

```bash
node dist/cli/index.js ./fixtures/clean-configured-project
```

Local Brain MCP / combined MCP (after build):

```bash
node dist/cli/index.js brain-mcp --root /ABSOLUTE/PATH/TO/PROJECT
node dist/cli/index.js mcp --root /ABSOLUTE/PATH/TO/PROJECT
```

## Documentation changes

- Keep claims aligned with implemented behavior and [docs/2.0/overview/capabilities.md](docs/2.0/overview/capabilities.md)
- Prefer **SUPPORTED / PARTIAL / EXPERIMENTAL / NOT YET SUPPORTED** — never invent star ratings or “enterprise-ready”
- Prefer links to [docs/2.0/](docs/2.0/), [docs/guides/quickstart.md](docs/guides/quickstart.md), [docs/mcp/brain-mcp.md](docs/mcp/brain-mcp.md)
- Update [docs/reference/rules.md](docs/reference/rules.md) when Safety rules change
- Put historical material under [docs/archive/](docs/archive/)

## Proposing architecture changes

1. Open an issue first (problem statement + alternatives)
2. Check [ROADMAP.md](ROADMAP.md) — mark future ideas as planned / exploratory
3. Do not silently expand Brain into RAG, chat memory, or vulnerability scanning
4. Preserve UNKNOWN semantics and provenance envelopes
5. Do not implement Change Proof / multi-agent orchestration without an explicit design decision

## Reporting bugs

- CLI / crashes: [bug report](.github/ISSUE_TEMPLATE/bug_report.md)
- Wrong Safety finding: [false positive](.github/ISSUE_TEMPLATE/false_positive.md) / [false negative](.github/ISSUE_TEMPLATE/false_negative.md)
- Brain understanding quality: [brain-quality](.github/ISSUE_TEMPLATE/brain-quality.md)
- Security: [SECURITY.md](SECURITY.md) — never public issues with exploit details or secrets

## Proposing new Brain capabilities

- Prefer evidence-backed claims and abstention over invention
- Keep MCP tool names stable unless a major version explicitly breaks them
- Document limitations next to any new surface

## Code style

- TypeScript, ESM, existing ESLint / Prettier configs
- Prefer small, reviewable PRs with tests for behavior changes
- Match surrounding code; avoid drive-by refactors

## License

By contributing, you agree that your contributions are licensed under the MIT License (see [LICENSE](LICENSE)).
