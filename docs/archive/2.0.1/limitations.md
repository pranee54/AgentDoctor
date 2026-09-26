# Limitations — AgentDoctor 2.0.1

Honest gaps for this cut. Prefer UNKNOWN / abstention / heuristic labels over inflated claims.

**RELEASE STATUS:** NOT READY for a “complete every capability” / zero-gap claim. READY for RC hardening with external limitations documented. See [FINAL_COMPLETION_AUDIT.md](FINAL_COMPLETION_AUDIT.md) · [COMPLETE_IMPLEMENTATION_AUDIT.md](COMPLETE_IMPLEMENTATION_AUDIT.md).

## What improved in the deepening cut (real, tested)

- **Coverage-backed test impact (optional):** `--coverage` with explicit `testAttribution` (`coverage-map` / `hybrid-heuristic` / `none`).
- **Architecture contract:** `architecture init|analyze|check|explain` against `.agentdoctor/architecture.json|.yml` (repo-local — not org-wide governance).
- **Change proof:** integrity + optional engineering checks; `correctnessStatus` always `ENGINEERING_CORRECTNESS_NOT_CLAIMED`.
- **Controlled run:** `run` / `run explain` / `policy check|explain|enforce`; execute only when explicitly allowed.
- **Policy composition:** builtin pack + `.agentdoctor/policy.json`; force-push requires approval (not hard-block alone).
- **Import resolution confidence:** `EXACT` \| `RESOLVED` \| `INFERRED` \| `UNRESOLVED`.
- **Incremental graph:** `graph build|update|rebuild|status`.
- **Combined MCP maturity:** `change_analyze`, `architecture_check`, `proof_*`, `evidence_*`, `graph_query`.
- **Workspace isolation:** `workspace create|add|list|status|remove` (local multi-root model).
- **SQLite / Postgres storage providers:** SQLite via `node:sqlite`; Postgres via `tryCreatePostgresStorage` when a live URL works (`AGENTDOCTOR_POSTGRES_URL` for contract tests — no default CI service).
- **Auth:** local-dev scrypt + OIDC JWT/JWKS validation library path; **browser OAuth redirect incomplete (EXPERIMENTAL)**.
- **Languages:** TS/JS AST; Python (`python3`) and PHP (`php` + `token_get_all`) when toolchains exist. Go adapter is present but parse remains unsupported until a bundled extractor ships.
- **Secrets:** severity and confidence are separate fields; pattern scan does not prove absence.
- **Central path safety:** shared helpers under `src/security/paths.ts`.

## Change assurance

- Assembles existing signals; does not invent missing coverage or ownership.
- Test impact is **heuristic by default**; coverage-backed when a coverage file intersects changed files. Hybrid attribution when coverage lacks a test→source map.
- Architecture impact in assessments is still **inferred** from C4 unless a local contract check is run.
- `verified` (evidence) and `HASH_INTEGRITY_VERIFIED` (proof) are integrity-only — not correctness or compliance.

## Safety & policy

- Default policy path is **evaluate-only** (`executionResult: not-executed`).
- Controlled enforcement exists only where AgentDoctor owns the runner boundary; **no IDE / agent process interception** (**EXTERNAL LIMITATION** — requires host platform APIs).
- Secret scan is pattern-based and redacted; does not prove absence of secrets.

## Knowledge & auth

- Governed knowledge abstains when nothing authoritative matches.
- Team auth is local-dev scrypt; OIDC JWT validation is a library path — **not** full browser SSO. Browser OAuth redirect/callback is **EXPERIMENTAL**.
- Dashboard `?user=` is a `localDevIdentityHint` only (not authentication).

## Intelligence & languages

- AST depth: TypeScript/JavaScript + optional Python/PHP toolchains. **Java / Kotlin / Rust / Dart** remain honest `unsupported` stubs (**EXTERNAL**). **Go** toolchain may be detected but AST extract is not bundled (**EXTERNAL**).
- Call/import resolution is best-effort with explicit confidence; dynamic requires / reflection under-detected.
- Incremental graph update is local-repo only — not a full multi-repo / SaaS indexer.
- Vector search backend is not a production path in this package (**EXTERNAL** / out of boundary).

## Platform & packaging

- Postgres is implemented but gated on a working connection string; default verify does not start a Postgres service (**EXTERNAL** env gate).
- Hosted **multi-tenant SaaS** and **HSM-backed** evidence are not in this package (**EXTERNAL**).
- npm tarball remains Option B (`dist` + README + LICENSE + CHANGELOG); full `docs/2.0.1/` lives on GitHub.
- Action / CI pins for published `2.0.1` require a human `npm publish` before remote jobs using `version: 2.0.1` succeed. Use `version: workspace` against a built checkout.

See also: [docs/2.0/overview/known-limitations.md](../2.0/overview/known-limitations.md).
