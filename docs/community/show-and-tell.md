# Show and tell: what does AgentDoctor understand about your repository?

Suggested GitHub Discussion title:

**Show us what AgentDoctor understands about your repository**

## Why post here

AgentDoctor 1.1.0 ships a Project Brain + MCP tools. We learn more from **one careful run on a repo you know** than from stars.

## How to participate

1. Install `@praneeth_54/agentdoctor@1.1.0` ([quickstart](../quickstart.md))
2. Run `agentdoctor brain-mcp --root /ABSOLUTE/PATH/TO/YOUR/PROJECT` (after `npm run build` if using a clone’s `dist/cli`)
3. Connect Cursor / Claude Code / Codex using [examples/mcp/](../../examples/mcp/)
4. Call `brain_overview`, then one of `brain_risk`, `brain_ownership`, `brain_query`
5. Share **surprising** findings — correct or wrong
6. File [Brain quality](../../.github/ISSUE_TEMPLATE/brain-quality.md) issues for actionable misses

## Feedback template (copy into Discussion)

```text
Repo type (language/framework, anonymized):
AgentDoctor version:
Host (Cursor / Claude / Codex / CLI only):

brain_overview snapshot id (optional):
What looked right:
What looked wrong or UNKNOWN unexpectedly:
Would you use this again? Why / why not?
```

## Rules

- No secrets, credentials, or private source dumps
- Prefer redacted paths
- Do not claim the Brain is always correct
- Tool-call evidence beats vibes — if the agent didn’t call MCP, say so

Thank you for helping harden repository understanding for coding agents.
