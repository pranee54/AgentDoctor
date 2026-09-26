# AgentDoctor 2.0.1 release notes

**Package:** `@praneeth_54/agentdoctor@2.0.1`  
**Date:** 2026-09-23  
**Positioning:** Engineering assurance for AI coding agents.

## Highlights

1. **Change assurance** — `agentdoctor change analyze` / `change verify` produce structured assessments from git, graph, C4, knowledge, evaluate-only policy, secrets, and heuristic test impact.
2. **Evidence bundles** — durable artifacts under `.agentdoctor/evidence/<id>/` with SHA-256 manifests; `evidence verify` sets `verified` only on full hash match.
3. **Hardening** — CodeQL high-alert fixes (crypto, ReDoS, temp files, TOCTOU) and CI fixture / Windows AST path fixes.
4. **Presentation** — README and docs aligned to honest capability labels; no coverage-backed or SSO claims.

## Upgrade from 2.0.0

```bash
npm install -g @praneeth_54/agentdoctor@2.0.1
agentdoctor --version
agentdoctor change analyze
```

Action default input moves to `2.0.1`. Safety `scan` / `fix` / `verify` and Brain MCP tool names are preserved.

## Not in this release

- Enterprise SSO / OIDC
- Coverage-backed test impact as ground truth in change assessments
- Full Change Proof product vision beyond assessment + evidence
- Fake runtime enforcement or IDE interception

Full changelog: [CHANGELOG.md](../../CHANGELOG.md). Limitations: [limitations.md](limitations.md).
