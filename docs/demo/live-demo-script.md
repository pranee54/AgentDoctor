# Live demo script (3–5 minutes)

Verify commands against `package.json` / CLI before presenting. Do not invent live output — use fixture-backed samples from [brain-mcp-demo.md](brain-mcp-demo.md) if the room network is slow.

## 00:00 — Problem

Agents read files. They still guess architecture, invent owners, and skip blast radius.

## 00:30 — Repository

Show `fixtures/understanding-dependencies-project` **or** a prepared sample repo with absolute path.

## 01:00 — AgentDoctor

```bash
npx @praneeth_54/agentdoctor@1.1.0 --help
```

Optional: one Safety scan line — clarify it is a **separate** product path.

## 01:30 — Project Brain

Explain: discovery → claims/evidence/confidence → local store `.agentdoctor/project-brain/` (not committed).

## 02:00 — MCP

```bash
npm run build   # if using repo dist/cli
node dist/cli/index.js brain-mcp --root /ABSOLUTE/PATH/TO/PROJECT
```

Note: stderr logs, stdout protocol; `--root` required.

## 02:30 — Agent connection

Show Cursor MCP config from `examples/mcp/cursor.mcp.json` (placeholders). Confirm **10 tools** listed.

## 03:30 — Evidence / provenance

Call `brain_overview`, then `brain_explain` (or show documented envelope fields: `evidenceIds`, `confidence`, `snapshot`).

## 04:00 — Risk / ownership / trace

- `brain_risk` → change-danger example (`critical-entrypoint`)
- `brain_ownership` → **UNKNOWN** without CODEOWNERS
- `brain_trace` → capped blast radius

## 04:30 — Limitations

Not RAG. Not vuln scanner. Not zero-hallucination. LLM Q&A grading may be blocked without auth; MCP contracts still matter.

## 05:00 — Call for developers

“Run this on a repository you know. File a Brain-quality issue when it’s wrong.”
Links: quickstart, contributing, good-first-issues.
