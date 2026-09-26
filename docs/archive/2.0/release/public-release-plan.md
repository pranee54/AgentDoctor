# AgentDoctor 2.0 — Public Release Plan

**Status:** Preparation only
**Current npm version:** `1.1.1`
**Target:** Formal process toward npm `2.0.0` (not cut in this change)
**Constraints:** No version bump, commit, tag, push, or publish in this phase

## Goals

1. Make public messaging match the product: _codebase intelligence for developers, agents, and engineering teams._
2. Preserve Safety + Brain MCP backward compatibility.
3. Disclose limitations honestly (no blanket 5/5, no IDE-blocker claims).
4. Decide how npm consumers learn limitations/features.
5. Prepare a changelog proposal for a future `[2.0.0]` cut.

## Completed in this preparation phase

| Item                       | Outcome                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------- |
| README rewrite             | Done — honest capability labels + limitations                                         |
| Docs organization          | Root `AGENTDOCTOR_2.0_*.md` → [`docs/2.0/`](../README.md)                             |
| Packaging recommendation   | See [npm-packaging-decision.md](npm-packaging-decision.md) — **Option B recommended** |
| Changelog proposal         | See [changelog-proposal.md](changelog-proposal.md) — **not applied** to CHANGELOG yet |
| Doc consistency review     | See [documentation-review.md](documentation-review.md)                                |
| `package.json` description | **Proposed only** — file intentionally unchanged                                      |

## Remaining blockers before npm `2.0.0` publish

From [../audits/release-blockers.md](../audits/release-blockers.md), still open:

1. Explicit authorization to bump version to `2.0.0`
2. Apply proposed `package.json` description (and optional keywords)
3. Apply Option B README limitations (done) **or** Option A curated pack if chosen later
4. Promote CHANGELOG `[Unreleased]` → `[2.0.0]` using the proposal file
5. Update CLI Commander description string (recommended; optional for cut)
6. Final `npm run verify` + pack smoke on the release commit

## Suggested release sequence (when authorized)

1. Apply `package.json` description + keywords (authorized edit).
2. Paste `[2.0.0]` section from changelog proposal into `CHANGELOG.md`; clear Unreleased.
3. Optionally update CLI program description to match README.
4. Run `npm run verify` and clean-install pack smoke.
5. Bump version to `2.0.0`, tag, publish — **only with explicit human approval**.

## Compatibility promises for the cut

- Keep Safety scan/fix/verify exit-code behavior.
- Keep Brain MCP tool names (`brain_*`).
- Keep `executionResult: "not-executed"` for evaluate-only paths.
- Keep loopback dashboard defaults.
- Label experimental/partial surfaces in release notes.

## Non-goals for 2.0.0 GA marketing

Do not advertise: SSO, production DB/vector backends, multi-language AST parity, IDE interception, coverage-oracle test impact, or blanket 5/5 readiness.
