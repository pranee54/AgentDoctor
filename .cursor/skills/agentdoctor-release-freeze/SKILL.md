---
name: agentdoctor-release-freeze
description: Pre-freeze / post-release integrity audit for AgentDoctor 3.0.0. Use when verifying freeze readiness, auditing implementation integrity, or checking whether remediation may be committed—never for inventing features or performing release actions.
---

# AgentDoctor release freeze

## Purpose
Prove the **current 3.0.0** tree is correct, secure, and honestly documented before leaving it untouched. Version is already released.

## When to use
- Final freeze / integrity audits
- After security remediation on a dirty tree
- Before human commit of remediation (do not auto-commit)

## Non-negotiable rules
- DO NOT bump version, publish, tag, push, or create GitHub releases
- DO NOT invent features or redesign architecture
- DO NOT weaken security or delete tests to go green
- PASS requires evidence; NOT_VERIFIED must not become PASS
- Ownership ≠ containment (`OWNERSHIP_BOUNDARY_VERSION`)

## Workflow
1. Read `docs/internal/AGENTDOCTOR_3_0_CURRENT_TRUTH.md` (authoritative pointer)
2. Inventory CLI / dashboard / MCP from **source**, not memory
3. Re-run hostile suites under `tests/unit/project/` + MCP transport + provider E2E
4. Fix only proven defects; add regressions
5. `npm run verify` then `npm pack` + clean-install smoke
6. Update freeze audit docs; leave commit to human

## Verification checklist
- [ ] `npm pkg get version` = 3.0.0 and `PACKAGE_VERSION` matches
- [ ] CLI `--version` = 3.0.0; dashboard HTML / `ops.version` = 3.0.0
- [ ] OPEN_P0=0 OPEN_P1=0 for security/correctness
- [ ] RELEASE_ACTIONS_PERFORMED=NONE
- [ ] Dirty tree reported if remediation present

## Failure conditions
- Any foreign/`.private`/symlink path becomes VERIFIED project intelligence
- Stale Brain/Twin/Graph treated as current truth
- Model/dashboard/MCP grant write without real approval
- Hang on `$HOME` / broad roots

## What NOT to do
Roadmaps, provider additions, version bumps, silent doc rewrites that erase historical audits.
