# AgentDoctor 2.0 — Deployment Guide

## Local (default)

```bash
npm install
npm run build
npx agentdoctor doctor --json
npx agentdoctor scan
npx agentdoctor dashboard
```

- Storage: filesystem under `.agentdoctor/`
- Dashboard: loopback only
- No cloud account required

## Self-hosted / containerized

Provide a Node 20+ image that installs the package and runs CLI/MCP/dashboard. Example shape (illustrative):

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm ci && npm run build
ENTRYPOINT ["node", "dist/cli/index.js"]
```

Secure secrets via environment / mounted files — never bake credentials into images.

## Databases

| Backend             | Status                                                                                  |
| ------------------- | --------------------------------------------------------------------------------------- |
| Filesystem          | Default, supported                                                                      |
| In-memory           | Tests / ephemeral                                                                       |
| SQLite / PostgreSQL | Abstraction present; feature flag `sqliteStorage=false` — not production-ready adapters |
| Vector index        | Flag off; unsupported by default                                                        |

## Ops checks

- `agentdoctor doctor --json` → `collectOpsHealth`
- Structured logging: use process stderr for MCP diagnostics; protocol on stdout only
- Rate limiting / tracing: not bundled as full APM — document in known limitations

## Upgrades

Current release: **[`@praneeth_54/agentdoctor@2.1.0`](https://www.npmjs.com/package/@praneeth_54/agentdoctor)**. Follow [migration.md](migration.md) for store/API additive changes.
