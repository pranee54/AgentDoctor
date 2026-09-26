# AgentDoctor 2.0 — API Documentation

Local read-only HTTP API served by `agentdoctor dashboard` (default `127.0.0.1:8787`).

## Legacy endpoints (preserved)

| Method | Path            | Description                                                 |
| ------ | --------------- | ----------------------------------------------------------- |
| GET    | `/api/status`   | Root, adapters, ops health, policy packs                    |
| GET    | `/api/scan`     | Safety scan summary + sample findings                       |
| GET    | `/api/brain`    | Project Brain status                                        |
| GET    | `/api/platform` | Platform snapshot; optional `?user=` **not authentication** |
| GET    | `/api/meta`     | Fix audits, baselines, session ids                          |

## Versioned endpoints

| Method | Path                 | Description                               |
| ------ | -------------------- | ----------------------------------------- |
| GET    | `/api/v2/graph`      | Intelligence graph summary (AST or regex) |
| GET    | `/api/v2/health`     | Git engineering intelligence              |
| GET    | `/api/v2/c4`         | C4-style views (inferred/proposed)        |
| GET    | `/api/v2/knowledge`  | Governed knowledge index                  |
| GET    | `/api/v2/projects`   | Local single-repo project stub            |
| GET    | `/api/v2/workspaces` | Workspace stub / limitations notice       |

## Guarantees

- GET only; no Safe Fix mutation routes
- Loopback binding by default
- Secrets sanitized in exported findings

## Not provided in this release

- Authenticated multi-tenant cloud API
- Full CRUD for users/orgs over HTTP (use CLI local-dev auth)
- WebSocket streaming
