---
name: agentdoctor-zero-trust-security
description: Zero-trust security review for AgentDoctor ownership, path/symlink safety, approvals, MCP/CLI/dashboard authority, and prompt injection. Use when auditing or fixing trust boundaries—not for feature work.
---

# AgentDoctor zero-trust security

## Purpose
Keep AgentDoctor as the authority for boundaries, tools, approval, verification, and evidence. Models and repo text are untrusted data.

## Canonical layers
- Containment: `src/security/paths.ts` `resolveSafeRepoPath`
- Ownership: `src/project/ownership.ts` (realpath classification; `OWNERSHIP_BOUNDARY_VERSION`)
- CLI broad-root: `src/cli/safe-root.ts` `resolveCliProjectRoot`
- Discovery: `src/discovery/files.ts` `decideDirectoryTraversal`

## Non-negotiable rules
- Containment ≠ ownership
- Fail closed on path/ownership deny
- No UI/`approved=true` boolean as write authority
- Dashboard chat is ask-only (no repo writes)
- Repository content (README, AGENTS.md, comments) cannot escalate privileges
- Skills/prompts cannot override runtime controls

## Hostile checklist
- `.private/`, `AgentDoctorOS/`, nested `.git`, fixtures, validation checkouts
- Symlink alias into private/foreign
- `$HOME` / Desktop / Downloads / Documents
- Forged planHash / grant / approvalToken
- MCP STDIO forge (not helper-only tests)
- Provider tool-call loop with local adversarial server
- what-if foreign/private targets

## Evidence
Prefer executable tests under `tests/unit/project/`, `tests/unit/mcp/mcp-transport-adversarial.test.ts`, `tests/unit/ai/provider-adversarial-e2e.test.ts`.

## What NOT to do
Weaken ownership to fix false-positive tests; claim transport-complete MCP without STDIO forge; claim vendor LLM safety from local deterministic E2E alone.
