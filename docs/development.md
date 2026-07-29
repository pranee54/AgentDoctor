# Development

## Prerequisites

- Node.js 20+
- npm 10+

## Setup

```bash
npm install
```

## Common commands

| Command                 | Purpose                            |
| ----------------------- | ---------------------------------- |
| `npm run typecheck`     | TypeScript (app + tests)           |
| `npm run lint`          | ESLint                             |
| `npm run format`        | Prettier write                     |
| `npm run format:check`  | Prettier check                     |
| `npm test`              | Vitest                             |
| `npm run build`         | Emit `dist/`                       |
| `npm run dev -- ./path` | Run CLI via `tsx` without building |

## Project conventions

- ESM (`"type": "module"`) with NodeNext resolution
- Prefer Node built-ins before adding dependencies
- Rules live under `src/core/rules/` and must be registered in `registry.ts`
- Agent adapters live under `src/agents/<name>/` and must be registered in `registry.ts`
- Findings must use stable rule IDs (`category/name`)
- Never print secret values — paths and risk only
- Fixtures under `fixtures/` must use fake credentials only (`FAKE_TEST_CREDENTIAL`)

## Adding a rule

1. Implement `RuleDefinition` under the appropriate category folder
2. Register it in `src/core/rules/registry.ts`
3. Document it in `docs/rules.md`
4. Add positive and negative tests
5. Run `npm test`

## Adding an agent adapter

1. Implement `AgentAdapter` under `src/agents/<id>/`
2. Register in `src/agents/registry.ts`
3. Add fixtures + detection tests
4. Update README supported-agents table

## Testing tips

```bash
npm test
node dist/cli/index.js ./fixtures/clean-configured-project
node dist/cli/index.js ./fixtures/insecure-agent-project --json
```

Hostile-input coverage lives in `tests/unit/rules/hostile.test.ts`.

## Release checklist (maintainers)

1. Update `CHANGELOG.md`
2. Bump `package.json` / `src/constants.ts` version together
3. Ensure CI is green on `main`
4. Tag and publish manually (see release workflow — no auto-publish)

## Editor

Recommended VS Code extensions are listed in `.vscode/extensions.json`.

## Related docs

- [Documentation index](README.md)
- [Architecture](architecture.md)
- [Rules catalog](rules.md)
- [Contributing](../CONTRIBUTING.md)
