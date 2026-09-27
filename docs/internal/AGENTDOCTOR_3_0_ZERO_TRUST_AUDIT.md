# AgentDoctor 3.0.0 — Zero-Trust Full Repository Audit

**Date:** 2026-09-27
**Repo:** `/Applications/XAMPP/xamppfiles/htdocs/AgentDoctor`
**Version:** 3.0.0
**Method:** source inspection + walker inventory + hostile fixtures + dashboard API contracts + agent tool gates. Prior audits treated as hypotheses only.

---

## 1. Repository state

- Detached HEAD at release commit `c21faf1` with local uncommitted remediation (ownership, dashboard, graph, secrets, agent gates).
- `package.json` / `PACKAGE_VERSION`: **3.0.0**
- No publish/push/tag/version bump performed.

## 2. Source inventory (summary)

Production: `src/**` (CLI, dashboard, MCP, product, agent, discovery, ownership, assurance, platform).
Tests: `tests/**`. Fixtures/validation/`.private`/`AgentDoctorOS` exist and must remain non-owned.

## 3. Filesystem walker inventory

| Walker                           | File                           | Consumer                                                    | Ownership-safe                      | Nested repo safe              | Symlink safe               | Workspace safe | Proven                    |
| -------------------------------- | ------------------------------ | ----------------------------------------------------------- | ----------------------------------- | ----------------------------- | -------------------------- | -------------- | ------------------------- |
| discoverFiles                    | discovery/files.ts             | DNA, search, evidence-scan, listTsFiles, enrich, agent list | Yes                                 | Yes                           | Yes (realpath inside root) | Yes            | Yes                       |
| platform graph walk              | platform/graph/build.ts        | regex graph, MCP                                            | Yes (decideDirectoryTraversal)      | Yes                           | Skips symlinks             | N/A            | Yes                       |
| secrets walkFiles                | core/secrets/scan.ts           | security doctor, CLI                                        | Yes                                 | Yes                           | Skips symlinks             | N/A            | Yes                       |
| map topLevelEntries              | product/map/software-map.ts    | /api/map                                                    | Yes (isProjectOwnedRelativePath)    | N/A top-level                 | N/A                        | N/A            | Yes                       |
| monorepo resolveGlobDirs         | core/monorepo/detect.ts        | DNA/deps monorepo                                           | Yes (filter post-glob)              | Yes (isUnderNestedRepository) | Partial                    | N/A            | Yes                       |
| product discovery roots          | product/discovery/roots.ts     | project root selection                                      | Purpose-different (candidate roots) | Shallow                       | Skips `.` dirs             | Home-guarded   | Partial                   |
| FS storage list                  | storage/provider.ts            | workspace JSON under storage root                           | Control-plane only                  | N/A                           | No                         | Storage root   | Partial                   |
| workspace listWorkspaces         | workspace/index.ts             | `.agentdoctor` workspaces                                   | Control-plane                       | N/A                           | N/A                        | Yes            | Partial                   |
| knowledge docs readdir           | platform/knowledge/analyze.ts  | docs/*.md shallow                                           | docs owned tree                     | No nested scan                | No                         | N/A            | Partial                   |
| brain proposals readdir          | core/brain-product/init.ts     | `.agentdoctor` proposals                                    | Control-plane                       | N/A                           | N/A                        | Yes            | Partial                   |
| context-health instructions      | core/context-health/analyze.ts | known candidates + `.github/instructions`                   | Explicit candidates                 | N/A                           | N/A                        | N/A            | Partial                   |
| proof/baseline/evidence readdir  | assurance/*, baseline          | `.agentdoctor` artifacts                                    | Control-plane                       | N/A                           | N/A                        | Yes            | Partial                   |
| plugins sdk readdir              | plugins/sdk.ts                 | plugin dir                                                  | Plugin root                         | N/A                           | N/A                        | Plugin         | Partial                   |
| utils/fs readdir                 | utils/fs.ts                    | helpers                                                     | Caller-dependent                    | Caller                        | Caller                     | Caller         | UNKNOWN                   |
| Agent resolveSafeRepoPath        | security/paths.ts              | path containment                                            | **Containment only**                | No                            | Yes                        | Yes            | Yes                       |
| Agent assertProjectOwnedRepoPath | project/ownership.ts           | agent read/write                                            | Yes                                 | Yes                           | Via paths.ts               | Yes            | Yes (**FIXED** this pass) |

## 4. Ownership analysis

Canonical contract: containment ≠ ownership.
Non-owned tops: `.private`, `AgentDoctorOS`, `fixtures`, validation checkout prefixes, nested `.git`.
Agent tools now require ownership in addition to containment.

## 5–8. Graph / Security / Secrets / Prompt injection

- Graph: re-verified clean under hostile markers.
- Secrets/security: foreign secrets not reported as project findings.
- Prompt injection: owned `AGENTS.md` bait present in fixture; deterministic chat did not echo foreign markers. Provider authority override **NOT_VERIFIED**.

## 9. Agent runtime

Write/read of `.private`, nested foreign repo, `AgentDoctorOS` → `ownership_denied` even with `approvedByHuman` + `allowWrite`.
Bare `approved=true` still insufficient without grant token on MCP write path (prior design).

## 10. MCP

MCP file_* delegates to `executeAgentTool` → inherits ownership gate. Full live forge matrix **NOT_VERIFIED**.

## 11–12. Dashboard / What-if

Canonical what-if: `/api/what-if?target=…`
Alias: `/api/whatif?target=…` (same handler)
UI uses `/api/what-if`. Graph renderer uses `sampleNodes`.

## 13–16. Brain / Twin / Search / Decisions

Twin cache includes `ownership-boundary:3`. Decisions exclude foreign ADRs. Search may hit owned historical docs.

## 17–21. Map/DNA/Deps / Evidence / CLI / API / Tests

Hostile fixture covers DNA/graph/map/decisions/secrets/security/search/monorepo/dashboard APIs/agent tools.
CLI full leaf matrix not fully re-smoked → PARTIAL.

## 22. Documentation

FINAL_* documents are historical hypotheses. Authoritative: this file + CURRENT_TRUTH + TRUTH_MATRIX.

## 23–24. Performance / Threat model

| Threat                      | Result                                   |
| --------------------------- | ---------------------------------------- |
| Nested git contamination    | PASS (hostile)                           |
| .private contamination      | PASS                                     |
| AgentDoctorOS contamination | PASS                                     |
| Path traversal              | PASS (paths.ts)                          |
| Symlink escape              | PASS (paths.ts tests exist historically) |
| Agent write to non-owned    | PASS (hostile)                           |
| Bare approved=true MCP      | PASS (design + prior tests)              |
| Provider prompt injection   | NOT_VERIFIED                             |
| Stale twin/brain            | PARTIAL                                  |
| Home-directory scan         | NOT_VERIFIED                             |

## 25–26. Fixes this pass

- `assertProjectOwnedRepoPath` / `ProjectOwnershipError` / `isUnderNestedRepository`
- Agent execute path ownership for read/create/edit/delete
- Monorepo package ownership filter
- Dashboard `/api/whatif` alias
- `OWNERSHIP_BOUNDARY_VERSION = 3`
- `tests/unit/project/hostile-contamination.test.ts`

## 27. Remaining open

- Provider-backed chat/MCP adversarial E2E
- Brain rebuild hygiene UX
- Search ranking for historical audit docs
- Performance at home-directory scale

## 28. Final confidence

Ownership of intelligence + agent file tools: **HIGH** for tested paths.
Overall product completeness: **PARTIAL**.
Do not treat green `npm run verify` alone as release certification.

## VERIFY RESULT

`npm run verify` exit 0 — Test Files 130 passed / Tests 638 passed (post zero-trust pass).
