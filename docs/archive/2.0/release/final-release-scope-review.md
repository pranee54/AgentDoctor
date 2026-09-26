# AgentDoctor 2.0 — Final release scope review

**Date:** 2026-09-21
**Package in tree:** `@praneeth_54/agentdoctor@2.0.0`
**Review mode:** Inspect only — **no** stage / commit / tag / push / publish / code changes
**Working tree:** ~156 `git status` entries; tracked diff `82 files, +2353 / −2882`; ~196 untracked files under new trees

---

## Verdict

| Question                                             | Answer                                                                           |
| ---------------------------------------------------- | -------------------------------------------------------------------------------- |
| Scope ready for **human approval** to commit?        | **YES — with exclusions below**                                                  |
| Ready to tag / publish without further human review? | **NO**                                                                           |
| Secrets / credentials in proposed scope?             | **No real secrets found** (test fixtures / redaction samples only)               |
| Safety + Brain MCP preserved?                        | **YES** (additive surfaces; `brain_*` names intact; redaction hardening on load) |
| Unsupported feature claims in packed README?         | **No** (labels + limitations present)                                            |

---

## 1. Inspection summary

### `git status` (high level)

- **Modified tracked:** package metadata, README/CHANGELOG/CONTRIBUTING/ROADMAP, Safety/Fix/rules/scoring/MCP session, CLI `program.ts`, agent registry, related tests, `release.yml`, community/demo link fixes.
- **Deleted tracked (docs moves):** flat `docs/*.md` and `docs/release-notes-v*.md` — content relocated under `docs/{guides,reference,features,development,release-notes,archive,launch}/`.
- **Untracked:** full 2.0 implementation trees (`src/**`), fixtures for new agents, `docs/2.0/**`, reorganized docs, `schemas/v2/**`, tests, `AGENTDOCTOR_2.0.md`, local tarball, benchmark JSON.

### `git diff --stat` (tracked only)

```
82 files changed, 2353 insertions(+), 2882 deletions(-)
```

Largest tracked churn: `README.md` rewrite, `src/cli/program.ts` (+~900 lines additive commands), docs deletions (moves), Safe Fix apply/plan, `CHANGELOG.md` 2.0.0 cut.

### Compatibility-sensitive diffs reviewed

| Area                       | Finding                                                                                                                                            |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/index.ts`             | **Additive** exports only (contracts, graph, knowledge, team, ops, …). Existing `scan` / `verify` / Fix / policy exports retained.                 |
| `src/agents/registry.ts`   | **Additive** adapters (Copilot, Windsurf, Gemini, Aider). Cursor/Claude/Codex unchanged.                                                           |
| `src/mcp/brain/session.ts` | Loads/rebuilds now pass through `redactBrainForStorage` — security hardening; tool registry names unchanged (`brain_overview` … `brain_snapshot`). |
| `src/core/fix/apply.ts`    | Public options remain `{ dryRun }`; writers expanded; preflight + backup. Not a silent API break for documented consumers.                         |
| `package.json`             | Version `2.0.0`; new description; `typescript` moved to **runtime** `dependencies` (AST graph). Keywords for new agents.                           |
| `src/constants.ts`         | `PACKAGE_VERSION = "2.0.0"`; display names for new agents.                                                                                         |

---

## 2. Categories

### A. Required implementation files — **INCLUDE**

**Modified**

- `src/agents/registry.ts`, `src/agents/types.ts`
- `src/cli/program.ts`, `src/cli/commands/fix.ts`, `src/cli/commands/explain.ts`
- `src/constants.ts`
- `src/core/fix/{apply,plan,render,run,types}.ts`
- `src/core/fix/writers/{claude-settings,codex-config,cursorignore}.ts`
- `src/core/rules/**` (context/security/ignore/empty-instructions/build-context)
- `src/core/scanner/scan.ts`
- `src/core/scoring/{compute-scores,placeholder}.ts`
- `src/index.ts`
- `src/mcp/brain/session.ts`
- `src/reporters/terminal/report.ts`
- `src/types/index.ts`

**Untracked (new)**

- `src/agents/{aider,copilot,gemini,windsurf}/**`
- `src/architecture/c4.ts`
- `src/cli/commands/{brain,complete,mcp,platform,v2}.ts`
- `src/contracts/**`
- `src/core/{baseline,brain-cli,brain-product,changes,context-health,monorepo,schemas,secrets}/**`
- `src/core/fix/{backup,safe-target}.ts`, `src/core/fix/writers/simple-ignore.ts`
- `src/dashboard/server.ts`
- `src/enforcement/runner.ts`
- `src/integrations/{github,local-ai}/**`
- `src/intelligence/{graph,git}/**`
- `src/knowledge/store.ts`
- `src/mcp/agentdoctor/**`, `src/mcp/intelligence/**`
- `src/ops/health.ts`
- `src/platform/**`
- `src/plugins/**`
- `src/policy/packs.ts`
- `src/storage/provider.ts`
- `src/team/auth.ts`

### B. Required documentation files — **INCLUDE**

**Root / meta**

- `README.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, `ROADMAP.md`
- `AGENTDOCTOR_2.0.md` (pointer)
- `docs/README.md`
- `.github/workflows/release.yml` (release-notes path → `docs/release-notes/v${VER}.md`)

**Reorganization (delete old path + add new path as one logical move)**

- Deletes under flat `docs/*.md` / `docs/release-notes-v*.md` **together with** adds under:
  - `docs/guides/**`, `docs/reference/**`, `docs/features/**`, `docs/development/**`
  - `docs/release-notes/**`, `docs/archive/**`
  - `docs/launch/{discussions-welcome,github-launch-checklist}.md`
- Link updates: `docs/community/**`, `docs/demo/**`, `docs/mcp/brain-mcp.md`, `docs/launch/README.md`

**AgentDoctor 2.0 tree (canonical claims / audits / release prep)**

- Entire `docs/2.0/**` (overview, guides, reports, audits, release — including version-cut + this review)

### C. Required tests — **INCLUDE**

**Modified**

- `tests/unit/agents/{detection,registry}.test.ts`
- `tests/unit/fix/fix-plan.test.ts`
- `tests/unit/hardening/release-hardening.test.ts`
- `tests/unit/mcp/brain-mcp.test.ts`
- `tests/unit/policy/{evaluate,performance}.test.ts`
- `tests/unit/reporters/terminal-next-steps.test.ts`
- `tests/unit/rules/security-semantics-013.test.ts`
- `tests/unit/scoring.test.ts`
- `tests/unit/verify/verify-next-steps.test.ts`

**Untracked**

- `tests/unit/agents/{adapter-edge,copilot-scan}.test.ts`
- `tests/unit/complete/**`
- `tests/unit/enforcement/**`
- `tests/unit/fix/{preflight-apply,safe-target}.test.ts`
- `tests/unit/knowledge/**`
- `tests/unit/mcp/{brain-redaction,combined-mcp-stdio,intelligence-mcp}.test.ts`
- `tests/unit/platform/**`
- `tests/unit/security/**`
- `tests/unit/v2/**`

**Fixtures (required for adapter / edge coverage)**

- `fixtures/{aider-*,copilot-*,gemini-*,windsurf-*}/**`

### D. Required package / version files — **INCLUDE**

- `package.json` (`2.0.0` + authorized description + keywords + runtime `typescript`)
- `package-lock.json` (version sync)

### E. Optional (include recommended, not runtime-critical)

| Path                                    | Recommendation | Reason                                                                             |
| --------------------------------------- | -------------- | ---------------------------------------------------------------------------------- |
| `schemas/v2/*.json`                     | **INCLUDE**    | Repo contract evidence; unit tests load from `schemas/v2` (not in npm `files`, OK) |
| `scripts/perf/ast-graph.mjs`            | **INCLUDE**    | Reproducible AST perf harness used in audits                                       |
| `docs/archive/**`                       | **INCLUDE**    | Historical plans; prevents “lost” Dependabot / V2 mega-spec context after moves    |
| Large `docs/2.0/audits/*` / `reports/*` | **INCLUDE**    | Honesty / readiness evidence for GitHub consumers (Option B)                       |

### F. Generated / unrelated — **EXCLUDE**

| Path                                                             | Reason                                                                                                                         |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `praneeth_54-agentdoctor-2.0.0.tgz`                              | Local `npm pack` artifact; regenerate anytime; must not be committed                                                           |
| `benchmarks/ast-graph-perf-latest.json`                          | Generated perf snapshot; regenerate via `scripts/perf/ast-graph.mjs`; optional evidence only if human wants a pinned sample    |
| `dist/**`, `node_modules/**`, `.agentdoctor/**`                  | Build / install / local state (gitignored)                                                                                     |
| `.private/**` (present on disk, not in `git status`)             | Local OSS validation / venv / `.env` under `.private` — **must stay out of release**                                           |
| `action.yml` / `.github/workflows/ci.yml` Action pins at `1.1.1` | **Unchanged** — update is a **post-publish** decision, not part of this version-cut tree unless human explicitly expands scope |

### G. Not in this working-tree delta

- `AgentDoctorOS/**` — separate tree; not part of this status set.
- No accidental staging performed by this review.

---

## 3. Proposed release file list (for human commit)

Commit **everything in categories A–E** when approved:

1. All **required implementation** (A)
2. All **required documentation** including docs moves + `docs/2.0/**` (B)
3. All **required tests + new fixtures** (C)
4. `package.json` + `package-lock.json` (D)
5. `schemas/v2/**` + `scripts/perf/ast-graph.mjs` + `docs/archive/**` (E, recommended)

**Do not** add category F.

Suggested commit message theme (human-authored later):
`release: AgentDoctor 2.0.0 codebase intelligence cut`

---

## 4. Files excluded and reasons

| Excluded                                | Reason                                                                     |
| --------------------------------------- | -------------------------------------------------------------------------- |
| `praneeth_54-agentdoctor-2.0.0.tgz`     | Generated packaging artifact                                               |
| `benchmarks/ast-graph-perf-latest.json` | Generated; optional; regenerate from script                                |
| Anything under `.private/`              | Local validation / secrets-adjacent; not in status but must remain ignored |
| Action/CI pin bumps to `2.0.0`          | Out of cut scope until after npm publish + human authorization             |
| Unrelated dirty paths outside status    | None identified in current `git status`                                    |

---

## 5. Security findings

| Finding                                                     | Severity         | Notes                                                                                |
| ----------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------ |
| Real API keys / cloud credentials in proposed files         | **None found**   | Scanned for private-key headers, `AKIA…`, `ghp_`, common secret assignments          |
| Private-key / AWS / GitHub token **strings in tests**       | Expected         | Redaction / secret-scan unit fixtures (`AKIAIOSFODNN7EXAMPLE`, fake PEM, `ghp_abc…`) |
| `password123` in `complete-2.0.test.ts`                     | Expected         | Local-dev team auth unit test                                                        |
| `secret = "local-dev-audit-key"` in `enforcement/runner.ts` | Low / documented | Default HMAC key for local audit chain — not a production credential                 |
| Fixture `.env` / `.pem` under `fixtures/**`                 | Expected         | Already gitignored-exception for test fixtures; not new secrets                      |
| `.private/.../.env` and venv PEMs on disk                   | **Out of scope** | Not listed in `git status`; ensure they stay untracked                               |
| Packed README unsupported claims                            | **None**         | Explicit limitations; “No blanket 5/5 claims”; no autonomous IDE blocker claim       |

---

## 6. Test results

```
npm run verify → exit 0
Test Files  53 passed (53)
Tests       394 passed (394)
Build       @praneeth_54/agentdoctor@2.0.0 OK
```

No regressions observed on this tree after the version cut.

---

## 7. Packaging results

```
npm pack --dry-run
name:     @praneeth_54/agentdoctor
version:  2.0.0
filename: praneeth_54-agentdoctor-2.0.0.tgz
size:     268.2 kB (package) / 1.1 MB unpacked
files:    496
contents: dist/ + README.md + CHANGELOG.md + LICENSE + package.json
```

- `docs/2.0/` **not** in tarball (Option B — intentional).
- Packed README carries capability labels + limitations.
- Local tarball on disk should **not** be committed.

---

## 8. Remaining risks

1. **Large single commit** — implementation + docs reorganization + version cut; human should skim `git diff` for surprise files before approving.
2. **External doc URL breakage** — old paths like `docs/quickstart.md` move to `docs/guides/quickstart.md` (mitigated by hub + release.yml update; outbound GitHub bookmarks may 404).
3. **Action still pins `1.1.1`** — after publish, separately bump `action.yml` / CI matrix.
4. **Runtime `typescript` dependency** — increases install size; required for AST; disclose in release notes (already in CHANGELOG context).
5. **Partially validated / experimental surfaces** — shipping 2.0.0 is honest only if marketing keeps readiness-matrix language (README already does).
6. **Safe Fix multi-writer** — still not fully atomic after preflight (documented limitation).
7. **Brain MCP in-memory redaction** — behavior change vs 1.1.1 for consumers reading session brain contents; tool names unchanged; security-positive.
8. **Working tree includes generated tarball** — easy to accidentally `git add .` — exclude explicitly.

---

## 9. Safety & Brain MCP preservation checklist

| Check                                            | Status |
| ------------------------------------------------ | ------ |
| `scan` / `fix` / `verify` commands still present | Yes    |
| Brain MCP command `brain-mcp` still present      | Yes    |
| `brain_*` tool names unchanged in registry       | Yes    |
| Combined `mcp` is additive                       | Yes    |
| Public Fix option shape `{ dryRun }` retained    | Yes    |
| Verify suite green (394)                         | Yes    |

---

## 10. Human approval gate

**Recommendation:** Approve scope for commit **after** confirming:

1. Exclude `*.tgz` and (unless desired) `benchmarks/ast-graph-perf-latest.json`.
2. Include A–E as listed.
3. Do **not** publish or tag in the same step as the first commit unless a separate authorization is given.
4. Plan a follow-up for Action/CI `2.0.0` pins after npm publish.

| Gate                                      | Result  |
| ----------------------------------------- | ------- |
| Scope ready for human approval?           | **YES** |
| This review staged or committed anything? | **NO**  |

---

## Strict compliance

- No commit
- No tag
- No push
- No publish
- No `git add` / staging
- No implementation code modifications

**Stop.** Await human approval before any git write operations.
