# Contributing

Thanks for helping improve AgentDoctor — evidence-backed Project Brain for AI coding agents, plus Safety Scan → Fix → Verify.

## Project overview

| Track         | What it is                                                                 |
| ------------- | -------------------------------------------------------------------------- |
| Safety        | Deterministic agent-config audit (Cursor / Claude Code / Codex)            |
| Project Brain | Structured understanding: claims, evidence, confidence, UNKNOWN, snapshots |
| MCP           | STDIO bridge: `agentdoctor brain-mcp --root <abs>` — ten `brain_*` tools   |

Read [docs/why-agentdoctor.md](docs/why-agentdoctor.md) and [ROADMAP.md](ROADMAP.md) before proposing large architecture changes.

## Development setup

Node.js **20+**.

```bash
git clone https://github.com/pranee54/AgentDoctor.git
cd AgentDoctor
npm install
npm run build
```

## Common commands (from `package.json`)

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
npm run verify:project-brain   # understanding + validate + benchmark
npm run validate:mcp-agent
```

Local Safety smoke:

```bash
node dist/cli/index.js ./fixtures/clean-configured-project
```

Local Brain MCP (after build):

```bash
node dist/cli/index.js brain-mcp --root /ABSOLUTE/PATH/TO/PROJECT
```

## Documentation changes

- Keep claims aligned with implemented behavior
- Prefer links to [docs/quickstart.md](docs/quickstart.md), [docs/mcp/brain-mcp.md](docs/mcp/brain-mcp.md), [docs/project-brain.md](docs/project-brain.md)
- Update [docs/rules.md](docs/rules.md) when Safety rules change
- Do not invent benchmarks, user counts, or “zero hallucination” claims

## Proposing architecture changes

1. Open an issue first (problem statement + alternatives)
2. Check [ROADMAP.md](ROADMAP.md) — mark future ideas as planned/exploratory
3. Do not silently expand Brain into RAG, chat memory, or vulnerability scanning
4. Preserve UNKNOWN semantics and provenance envelopes

## Reporting bugs

- CLI / crashes: [bug report](.github/ISSUE_TEMPLATE/bug_report.md)
- Wrong Safety finding: [false positive](.github/ISSUE_TEMPLATE/false_positive.md) / [false negative](.github/ISSUE_TEMPLATE/false_negative.md)
- Brain understanding quality: [brain-quality](.github/ISSUE_TEMPLATE/brain-quality.md)
- Security: [SECURITY.md](SECURITY.md) — never public issues with exploit details or secrets

## Proposing new Brain capabilities

Use [feature request](.github/ISSUE_TEMPLATE/feature_request.md) and say whether the idea is:

- fixture / test coverage
- documentation
- deterministic discovery improvement
- or a **roadmap proposal** (not implemented)

## Do NOT commit

- `.agentdoctor/` (local Brain store)
- `.cursor/mcp.json` or machine-specific agent configs
- `validation/mcp-agent/results.json` / generated validation reports
- `fixtures/excepta/mobile/**` generated Dart/Android artifacts
- credentials, `.env` with secrets, private keys
- `PROJECT_AUDIT.txt`, `RELEASE_CHECKLIST.txt` (local owner notes)

## Pull requests

1. One concern per PR
2. Tests for behavior changes
3. Docs when user-facing behavior changes
4. `npm run verify` (and Brain/MCP gates when those areas change)
5. Fill the PR template

Starter ideas: [docs/community/good-first-issues.md](docs/community/good-first-issues.md) · [docs/good-first-issues.md](docs/good-first-issues.md)

Be respectful: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
