# Project Brain

Parallel intelligence layer for AgentDoctor. Local, deterministic, no LLM, no cloud DB.

AgentDoctor V1 safety product (Scan / Fix / Verify / Policy / CI) is unchanged. Project Brain lives under `src/core/understanding/brain/`.

**Agent consumption:** use the MCP bridge documented in [mcp/brain-mcp.md](mcp/brain-mcp.md) (`agentdoctor brain-mcp --root <project>`). MCP depends on Brain; Brain does not depend on MCP.

## Architecture

```
discover passes → ProjectModel → buildProjectBrain → LocalBrainStore
                                      ↓
                         BrainQueryEngine / explainClaim / traceBrain / BrainDelta
```

Canonical artifact: `ProjectBrain` — metadata, snapshot, model, ownership, risks, components, claims, evidence, contradictions, unknowns, limitations, confidence contract, schema version.

## Data model

| Surface              | Role                                      |
| -------------------- | ----------------------------------------- |
| `ProjectBrain`       | Durable persisted mind for one snapshot   |
| `BrainClaim`         | First-class claim with lifecycle status   |
| `BrainEvidence`      | Typed evidence (never secret plaintext)   |
| `BrainComponent`     | Module/entrypoint/package/domain-surface  |
| `BrainContradiction` | Generic conflicting claim pairs           |
| `BrainDelta`         | Serializable before→after change artifact |
| `SnapshotMeta`       | Ordered local snapshot registry entry     |

## Evidence

Typed objects with `id`, `kind`, `locator`, `source`, `snapshotId`, `epistemics` (`observed` \| `inferred`), optional `symbol`/`range`, and `redaction`. Every ACTIVE claim must reference evidence. Serialization runs through redaction first.

## Claims

Statuses: `ACTIVE`, `INVALIDATED`, `SUPERSEDED`, `CONTRADICTED`.

Rebuild with `previousClaims` runs `applyClaimLifecycle`: missing claims become `INVALIDATED` (kept with `invalidatedAt`); same subject+predicate with a new object marks the prior `SUPERSEDED`. Contradictions do not silently pick a winner.

## Persistence & snapshots

Store root: `<repo>/.agentdoctor/project-brain/` (or any path via `new LocalBrainStore(dir)`).

- `store.json` — format/schema versions, ordered snapshot list, latest id
- `snapshots/<id>/brain.json` — redacted Brain + checksum in registry
- `deltas/delta_<before>__<after>.json` — optional persisted deltas

Atomic writes. Identical re-save is idempotent; divergent overwrite is refused. Checksum mismatch on load fails closed. Path traversal in snapshot ids is rejected.

Restart proof: build → `saveSnapshot` → new process/`LocalBrainStore` → `loadLatest` → same query results.

## Invalidation

Invalidation is claim **state**, not a side list of missing ids. Query `ListInvalidations` returns claims with `status === "INVALIDATED"`.

## Queries

`createBrainQueryEngine(brain)` — unified surface over the persisted Brain (not a split of Model + Mind helpers).

Includes: project summary, domains, components, entrypoints, dependencies, relationships, architecture, ownership, risks, claims, evidence, contradictions, unknowns, changes, invalidations, impact, blast radius.

Each response includes `result`, `evidenceIds`, `confidence`, `snapshotId`, query metadata.

`ListClaims` defaults to **ACTIVE + CONTRADICTED** only (current truth surface). Pass `status` to inspect historical `INVALIDATED` / `SUPERSEDED` claims. Use `ListInvalidations` for invalidations.

## Machine contract

`PROJECT_BRAIN_CONTRACT` + `assertBrainContract()` define the load-time schema. Persist/load rejects incompatible versions and malformed claims/evidence (fail closed).

## Explain

`explainClaim(brain, claimId)` returns claim, status, confidence, supporting evidence, contradictions, invalidation state, unknowns. No prose generation / no LLM.

## Trace

`traceBrain(brain, target, mode)` modes: `dependencies`, `dependents`, `entrypoint-downstream`, `blast-radius`, `domain-modules`. Deterministic node/edge ordering; cycle recording.

## Confidence

Single contract: range `[0,1]`, rule-derived (uncalibrated), preserve UNKNOWN — see `CONFIDENCE_CONTRACT`.

## Security

Before serialize/export: redact secret-like claim values, sensitive path basenames, never embed credential/env contents. Storage paths constrained under store root (including symlink realpath checks). Durable serialization zeroes non-deterministic `timingMs` fields.

Ownership discovery runs only when `cwd` (or an ownership fixture) is supplied — never an implicit `process.cwd()` scan.

## Storage compatibility

Versions: ProjectBrain, Claim, Evidence, Delta, Snapshot meta, storage format — currently `1.0.0`. Incompatible data is rejected; `migrateBrain` supports registered migration paths (identity for `1.0.0`).

## API entry

```ts
import {
  buildProjectBrain,
  LocalBrainStore,
  createBrainQueryEngine,
  explainClaim,
  traceBrain,
  buildBrainDelta,
} from "./src/core/understanding/brain/index.js";
```

## Limits (honest)

Out of V1 Brain scope: incremental rebuild, API understanding, business-rule / design-decision inference, test-surface discovery, git-blame ownership, SAST-style risk, vector/graph DB, RAG/LLM. Agent consumption is via MCP (`agentdoctor brain-mcp`); there is no separate non-MCP Brain query CLI.
