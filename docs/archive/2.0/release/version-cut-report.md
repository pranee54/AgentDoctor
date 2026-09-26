# AgentDoctor 2.0 — Version cut report

**Date:** 2026-09-21
**Cut type:** Formal version cut only (authorized)
**Package:** `@praneeth_54/agentdoctor@2.0.0`

## Strict actions taken

| Action                                                   | Status                                                   |
| -------------------------------------------------------- | -------------------------------------------------------- |
| `package.json` version `1.1.1` → `2.0.0`                 | Done                                                     |
| `package.json` description updated                       | Done                                                     |
| `PACKAGE_VERSION` synced to `2.0.0` (`src/constants.ts`) | Done (required for CLI / scan JSON / MCP version fields) |
| `package-lock.json` version synced                       | Done                                                     |
| CHANGELOG promoted to `[2.0.0] — 2026-09-21`             | Done                                                     |
| README preserved                                         | Yes                                                      |
| `docs/2.0/` structure preserved                          | Yes                                                      |
| Commit                                                   | **Not done** (forbidden)                                 |
| Tag                                                      | **Not done** (forbidden)                                 |
| Push                                                     | **Not done** (forbidden)                                 |
| npm publish                                              | **Not done** (forbidden)                                 |
| Implementation / feature changes                         | **Not done** (forbidden)                                 |

## Files changed (this cut)

| File                                     | Change                                                                                                                             |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `package.json`                           | version `2.0.0`; new description                                                                                                   |
| `package-lock.json`                      | version `2.0.0`                                                                                                                    |
| `src/constants.ts`                       | `PACKAGE_VERSION = "2.0.0"`                                                                                                        |
| `CHANGELOG.md`                           | `[Unreleased]` cleared to post-cut notes; `[2.0.0] — 2026-09-21` promoted from proposal (+ compatibility/security/migration notes) |
| `docs/2.0/release/changelog-proposal.md` | Marked **Promoted** (audit trail)                                                                                                  |
| `docs/2.0/release/version-cut-report.md` | This report                                                                                                                        |
| `praneeth_54-agentdoctor-2.0.0.tgz`      | Local tarball from `npm pack` (untracked artifact)                                                                                 |

## Files intentionally left unchanged

- `README.md` and all of `docs/2.0/` structure (except changelog-proposal marker + this report)
- `action.yml` default `version: 1.1.1` (Action pin update is a separate publish-time decision)
- `.github/workflows/ci.yml` Action matrix pins to published `1.1.1`
- Implementation / feature source beyond `PACKAGE_VERSION`
- No git commit / tag / push / publish

## Verification results

### `npm run verify`

- **Exit:** 0
- **Test files:** 53 passed
- **Tests:** 394 passed
- **Build:** `@praneeth_54/agentdoctor@2.0.0` `tsc` + CLI bin OK

### `npm pack --dry-run` / `npm pack`

| Field         | Value                                      |
| ------------- | ------------------------------------------ |
| name          | `@praneeth_54/agentdoctor`                 |
| version       | `2.0.0`                                    |
| filename      | `praneeth_54-agentdoctor-2.0.0.tgz`        |
| package size  | **268.2 kB** (~262K on disk)               |
| unpacked size | **1.1 MB**                                 |
| total files   | **496**                                    |
| shasum        | `e026c662a30140d667b2fd765c9db24a71b86a99` |

### Package contents (top-level)

```
package/
  package.json
  README.md
  CHANGELOG.md
  LICENSE
  dist/          (492 entries — CLI, Safety, Brain MCP, intelligence, platform)
```

- `docs/2.0/` is **not** inside the tarball (Option B — intentional).
- Packed `README.md` includes capability labels, limitations, and “No blanket 5/5 claims.”
- Packed `package.json` description matches the authorized string.

### Runtime checks

| Check                                           | Result                                                  |
| ----------------------------------------------- | ------------------------------------------------------- |
| `package.json` version                          | `2.0.0`                                                 |
| `PACKAGE_VERSION` / CLI `--version`             | `2.0.0`                                                 |
| Clean install from tarball `--version`          | `2.0.0`                                                 |
| `agentdoctor scan <fixture> --json` → `version` | `2.0.0`                                                 |
| Clean-install scan → `version`                  | `2.0.0`                                                 |
| `brain-mcp --help`                              | OK                                                      |
| `mcp --help` (combined)                         | OK                                                      |
| Brain/MCP modules load                          | OK                                                      |
| Unsupported blanket claims in packed README     | None found; limitations / partial / unsupported labeled |

## Remaining release blockers (post-cut, pre-publish)

Version cut is complete. These still block calling a **published** npm `2.0.0` “done”:

1. **No git commit** of the cut (human must review + commit).
2. **No git tag** `v2.0.0`.
3. **No push** to GitHub.
4. **No `npm publish`**.
5. **Action default** still `1.1.1` in `action.yml` / CI matrix until a deliberate Action pin update after publish.
6. **Marketing honesty:** many surfaces remain _partially validated_ / _experimental_ — keep README + readiness matrix language at publish time.
7. **Commander program description** may still use older Safety-oriented wording (optional polish; not part of this cut).
8. Working tree still contains large uncommitted 2.0 implementation history beyond this cut — release commit scope needs human review.

## Recommended next action

1. Human review of `CHANGELOG.md` `[2.0.0]` + packed README.
2. Commit the version-cut files (and agreed 2.0 tree) when ready.
3. Tag `v2.0.0` only after commit.
4. Publish to npm only after tag + final smoke.
5. Then update Action default / CI pins to `2.0.0`.

**Stop.** No commit, tag, push, or publish performed by this cut.
