# AGENTDOCTOR 3.0 — DASHBOARD ROUTE INVENTORY

Generated: 2026-09-27T06:15:56.246Z
Source: `src/dashboard/server.ts` pathname equality matches (authoritative).
Route count: **34** (plus POST-only /api/chat; non-GET → 405 read-only).

| Method | Route                | Reads FS/intel | Writes FS | Project-scoped | Ownership                          | Stale-state         | Hostile tested                 |
| ------ | -------------------- | -------------- | --------- | -------------- | ---------------------------------- | ------------------- | ------------------------------ |
| GET    | `/`                  | -              | -         | Y              | dashboard root + product ownership | n/a                 | page shell                     |
| POST   | `/api/chat`          | Y              | -         | Y              | dashboard root + product ownership | n/a                 | dashboard-certification-matrix |
| GET    | `/api/status`        | Y              | -         | Y              | dashboard root + product ownership | n/a                 | dashboard-certification-matrix |
| GET    | `/api/scan`          | Y              | -         | Y              | dashboard root + product ownership | n/a                 | dashboard-certification-matrix |
| GET    | `/api/brain`         | Y              | -         | Y              | dashboard root + product ownership | rejects stale stamp | dashboard-certification-matrix |
| GET    | `/api/meta`          | Y              | -         | Y              | dashboard root + product ownership | n/a                 | dashboard-certification-matrix |
| GET    | `/api/platform`      | Y              | -         | Y              | dashboard root + product ownership | rejects stale stamp | dashboard-certification-matrix |
| GET    | `/api/v2/graph`      | Y              | -         | Y              | dashboard root + product ownership | rejects stale stamp | dashboard-certification-matrix |
| GET    | `/api/v2/health`     | Y              | -         | Y              | dashboard root + product ownership | n/a                 | dashboard-certification-matrix |
| GET    | `/api/v2/c4`         | Y              | -         | Y              | dashboard root + product ownership | n/a                 | dashboard-certification-matrix |
| GET    | `/api/v2/knowledge`  | Y              | -         | Y              | dashboard root + product ownership | n/a                 | dashboard-certification-matrix |
| GET    | `/api/dna`           | Y              | -         | Y              | dashboard root + product ownership | n/a                 | dashboard-certification-matrix |
| GET    | `/api/map`           | Y              | -         | Y              | dashboard root + product ownership | n/a                 | dashboard-certification-matrix |
| GET    | `/api/twin`          | Y              | -         | Y              | dashboard root + product ownership | rejects stale stamp | dashboard-certification-matrix |
| GET    | `/api/health-code`   | Y              | -         | Y              | dashboard root + product ownership | n/a                 | dashboard-certification-matrix |
| GET    | `/api/requirements`  | Y              | -         | Y              | dashboard root + product ownership | n/a                 | dashboard-certification-matrix |
| GET    | `/api/api-doctor`    | Y              | -         | Y              | dashboard root + product ownership | n/a                 | dashboard-certification-matrix |
| GET    | `/api/database`      | Y              | -         | Y              | dashboard root + product ownership | n/a                 | dashboard-certification-matrix |
| GET    | `/api/events`        | Y              | -         | Y              | dashboard root + product ownership | n/a                 | dashboard-certification-matrix |
| GET    | `/api/deps`          | Y              | -         | Y              | dashboard root + product ownership | n/a                 | dashboard-certification-matrix |
| GET    | `/api/security`      | Y              | -         | Y              | dashboard root + product ownership | n/a                 | dashboard-certification-matrix |
| GET    | `/api/search`        | Y              | -         | Y              | dashboard root + product ownership | n/a                 | dashboard-certification-matrix |
| GET    | `/api/what-if`       | Y              | -         | Y              | dashboard root + product ownership | n/a                 | dashboard-certification-matrix |
| GET    | `/api/whatif`        | Y              | -         | Y              | dashboard root + product ownership | n/a                 | dashboard-certification-matrix |
| GET    | `/api/forensic`      | Y              | -         | Y              | dashboard root + product ownership | n/a                 | dashboard-certification-matrix |
| GET    | `/api/incident`      | Y              | -         | Y              | dashboard root + product ownership | n/a                 | dashboard-certification-matrix |
| GET    | `/api/infra`         | Y              | -         | Y              | dashboard root + product ownership | n/a                 | dashboard-certification-matrix |
| GET    | `/api/features`      | Y              | -         | Y              | dashboard root + product ownership | n/a                 | dashboard-certification-matrix |
| GET    | `/api/evolution`     | Y              | -         | Y              | dashboard root + product ownership | n/a                 | dashboard-certification-matrix |
| GET    | `/api/memory`        | Y              | -         | Y              | dashboard root + product ownership | n/a                 | dashboard-certification-matrix |
| GET    | `/api/decisions`     | Y              | -         | Y              | dashboard root + product ownership | n/a                 | dashboard-certification-matrix |
| GET    | `/api/health`        | Y              | -         | Y              | dashboard root + product ownership | n/a                 | dashboard-certification-matrix |
| GET    | `/api/v2/projects`   | Y              | -         | Y              | dashboard root + product ownership | n/a                 | dashboard-certification-matrix |
| GET    | `/api/v2/workspaces` | Y              | -         | Y              | dashboard root + product ownership | n/a                 | dashboard-certification-matrix |

## Out of scope / intentional

- No PUT/PATCH/DELETE mutation routes exist.
- POST `/api/chat` is ask-only (no repo writes); body fields `approved`/`planHash`/`tools` are ignored for authority.
- Hash identifiers are not URL params today; stale Brain/Twin/Graph stamps are enforced in loaders then reflected in `/api/brain`, `/api/twin`, `/api/v2/graph`.
