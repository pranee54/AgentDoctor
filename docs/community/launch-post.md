# Launch / social drafts (AgentDoctor 1.1.0)

Do **not** invent users, stars, or benchmarks. Prefer invitation over hype.

## A) LinkedIn

I didn't want to build another AI coding assistant.

Coding agents already read files. The harder problem is **repository-level understanding**: architecture, blast radius, ownership, and evidence you can audit.

**AgentDoctor 1.1.0** builds a local Project Brain — components, entrypoints, dependencies, relationships, ownership, change-danger risks, claims, confidence, snapshots/deltas — and exposes it through **STDIO MCP** (ten `brain_*` tools) to Cursor, Claude Code, and Codex.

What we actually validated on the way to 1.1.0:

- Deterministic Brain + MCP contracts (including STDIO protocol tests)
- Cursor MCP tool discovery for all 10 tools
- Provenance envelopes and UNKNOWN ownership (no invented owners)
- Windows CI / CLI portability hardening
- CodeQL findings addressed on the release train

Honest limits: Brain risk is change-danger, not a CVE scanner. Authenticated LLM Q&A grading can be environment-blocked even when MCP contracts pass. We do not claim perfect understanding.

**Ask:** Run it on a repository you know well. If the Brain gets something wrong, I want to know.
Repo: https://github.com/pranee54/AgentDoctor
Quickstart: docs/quickstart.md

## B) X / Twitter

AgentDoctor 1.1.0: evidence-backed Project Brain for coding agents — claims + confidence + UNKNOWN ownership, exposed via MCP (10 tools, STDIO).

Not a chatbot. Not RAG memory. Not a vuln scanner.

Run it on a repo you know. Tell us where the Brain is wrong.
https://github.com/pranee54/AgentDoctor

## C) Reddit / technical community

**Title:** AgentDoctor 1.1.0 — local Project Brain + MCP for coding agents (evidence/provenance, not chat memory)

**Body:**

I shipped a local CLI that compiles structured repository understanding (Project Brain) and serves it to Cursor/Claude/Codex over STDIO MCP.

Tools include overview, typed queries, explain, trace, claims, evidence, ownership, change-danger risk, delta, snapshot. Ownership without CODEOWNERS stays UNKNOWN.

Safety Scan→Fix→Verify remains a separate path. Looking for maintainers willing to run it on a known repo and file Brain-quality issues. Docs: quickstart + demo under `/docs`.

## D) Hacker News-style

**Title:** AgentDoctor – evidence-backed Project Brain for AI coding agents (MCP)

**Text:** Local deterministic understanding layer (claims, evidence, confidence, snapshots) exposed via STDIO MCP. Built for agent context, not chat. Seeking feedback on incorrect/missing understanding from people who know their repos.

---

Primary CTA everywhere: **run on a known repository and report Brain errors** — not “please star.”
