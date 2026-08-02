# X / Twitter launch draft (AgentDoctor)

Status: **draft only — do not post until ready.**

---

## Primary post

```text
AgentDoctor — lighthouse for AI coding agents.

Local CLI that audits Cursor / Claude Code / Codex config:
security · instructions · context · MCP

No API key. No upload by default.

npx @praneeth_54/agentdoctor

github.com/pranee54/AgentDoctor
```

## Optional short thread

**1/4**  
AI coding agents leave config all over a repo — rules, AGENTS.md, MCP, ignore files. Easy to accumulate, hard to review consistently.

**2/4**  
AgentDoctor is a local deterministic audit for that surface. Stable rule IDs + JSON for CI. Not an LLM product.

**3/4**  
Beta limits are honest: scores ship in JSON (terminal N/100 and Action gates still deferred), no auto-fix, conservative filename heuristics (not a full secret scanner).

**4/4**  
Try: `npx @praneeth_54/agentdoctor`  
Feedback welcome — especially false positives. Don’t paste secrets.
