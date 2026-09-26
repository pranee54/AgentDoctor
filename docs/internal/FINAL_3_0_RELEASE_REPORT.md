# AgentDoctor 3.0.0 Release Report

**Release date:** 2026-09-26  
**Final status:** **RELEASE BLOCKED / POST-RELEASE ISSUE** (npm publish authentication)

---

## Package

- **Name:** `@praneeth_54/agentdoctor`
- **Version (repo / git):** `3.0.0`
- **Version (npm registry):** still **`2.1.0`** — publish did **not** succeed

## Git

| Item | Value |
| ---- | ----- |
| Branch | `main` |
| Release commit | `c21faf1fbc4d56869b965783cebc5cf0f50ac834` (`release: AgentDoctor 3.0.0`) |
| Annotated tag | `v3.0.0` (points to release commit) |
| Remote push commit | **PASS** (`origin/main`) |
| Remote push tag | **PASS** (`origin/v3.0.0`) |

## GitHub release

| Item | Value |
| ---- | ----- |
| Title | AgentDoctor 3.0.0 |
| Tag | v3.0.0 |
| Draft | false |
| URL | https://github.com/pranee54/AgentDoctor/releases/tag/v3.0.0 |
| Status | **CREATED** |

## npm

| Step | Result |
| ---- | ------ |
| `npm whoami` | **FAIL** — `E401 Unauthorized` |
| `npm publish --access public` | **FAIL** — `E404` PUT `@praneeth_54/agentdoctor` (typical when auth/scope publish rights are missing; npm often returns 404 instead of 401) |
| `npm view … version` after attempt | **2.1.0** (unchanged) |
| Public clean install of 3.0.0 | **NOT PERFORMED** (package not on registry) |

**Required human action:** authenticate as the package owner (`npm login` / valid automation token with publish rights for scope `@praneeth_54`), then run:

```bash
cd /path/to/AgentDoctor   # at commit c21faf1fbc4d56869b965783cebc5cf0f50ac834 / tag v3.0.0
npm whoami                # must succeed
npm publish --access public
npm view @praneeth_54/agentdoctor version   # expect 3.0.0
```

Do **not** bump to another version solely to retry. Publish **3.0.0** only.

## Tests / build

| Gate | Result |
| ---- | ------ |
| typecheck | PASS |
| lint | PASS |
| format | PASS |
| build | PASS |
| tests | **627/627** |
| `npm run verify` | PASS (re-run before publish attempt) |

## Package verification (local tarball)

| Gate | Result |
| ---- | ------ |
| `npm pack` | PASS — `praneeth_54-agentdoctor-3.0.0.tgz` (~453 kB, 712 files) |
| Contents | README, LICENSE, CHANGELOG, dist, package.json |
| Secrets / private trees in tarball | NONE detected |
| Clean install from tarball | PASS — `agentdoctor --version` → **3.0.0** |

## CLI / product smoke (tarball)

| Gate | Result |
| ---- | ------ |
| start | PASS |
| ask | PASS |
| learn --viva | PASS |
| plan | PASS (awaiting-approval) |
| agent --goal … --approve --apply | PASS + evidence/proof |
| MCP tool count (dist registries) | **38** |
| dashboard HTML + /api/status | PASS (HTTP 200) |

## Security

- No real secrets staged/committed for release.
- `*.tgz` gitignored; not committed.

## Release notes

- CHANGELOG `## [3.0.0] — 2026-09-26` added.
- README install pins → `@3.0.0`.
- `PACKAGE_VERSION` / Action default → `3.0.0`.
- SECURITY.md supports `3.0.x`.

## Known P2/P3 backlog

See `docs/internal/POST_3_0_BACKLOG.md` (non-blocking).

## Limitations

See `docs/LIMITATIONS.md`.

## Post-release smoke (public npm)

**BLOCKED** — waiting on successful `npm publish` of `3.0.0`.

---

## Gate summary

| Surface | Status |
| ------- | ------ |
| Git commit + tag + push | PASS |
| GitHub Release | PASS |
| npm 3.0.0 published | **BLOCKED** (auth) |
| Public npm clean install | **BLOCKED** |
| Overall | **RELEASE BLOCKED / POST-RELEASE ISSUE** |
