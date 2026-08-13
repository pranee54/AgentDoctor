# First 10 users plan

Non-spam outreach after AgentDoctor **1.1.0**. Goal is feedback quality, not vanity metrics.

## Funnel

| Stage           | Target                                               |
| --------------- | ---------------------------------------------------- |
| Outreach        | ~20 developers                                       |
| Serious testers | ≥5 who run Brain MCP on a known repo                 |
| Early users     | first ~10 who return at least one Brain-quality note |

## Rules

- Personal context first
- 60-second problem → demo → ask
- Primary CTA: run on a repo they know; report wrong/missing Brain context
- Do **not** lead with “please star”
- Never ask them to paste secrets

## Flow per contact

1. Why you’re asking them specifically
2. Problem (agents lack repository-level evidence)
3. 60s: Brain → MCP → `brain_overview`
4. Ask them to run on **one** known repository
5. Ask for **one** concrete miss (ownership, entrypoint, risk, UNKNOWN)

## Template 1 — AI coding agent developer

> You’ve been deep in Cursor/Claude agent workflows. I shipped AgentDoctor 1.1.0 — local Project Brain + MCP tools so agents get claims/evidence/confidence instead of only file search.
> Could you point MCP at one repo you know and tell me where `brain_overview` / `brain_ownership` / `brain_risk` is wrong or unexpectedly UNKNOWN?
> Quickstart: https://github.com/pranee54/AgentDoctor/blob/main/docs/quickstart.md

## Template 2 — Open-source maintainer

> Maintainers get agents that invent structure. AgentDoctor exposes a deterministic Project Brain over MCP (ownership stays UNKNOWN without CODEOWNERS).
> If you have 20 minutes: run it on your primary repo and reply with one incorrect claim or missing entrypoint. I’ll treat it as a Brain-quality bug.
> Repo: https://github.com/pranee54/AgentDoctor

## Template 3 — Senior engineer / lead

> We’re exploring evidence-backed context for coding agents (not another chat wrapper). 1.1.0 is local STDIO MCP with provenance envelopes.
> Would you evaluate whether this belongs in your team’s agent setup by trying one service repo and noting change-danger / ownership gaps?
> Demo: docs/demo/first-5-minutes.md

## Tracking (private)

Keep a personal checklist: contacted → ran MCP → feedback received → issue filed. Do not publish personal contact lists in the repository.
