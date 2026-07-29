# Hacker News launch draft (AgentDoctor)

Status: **draft only — do not post until ready.**

---

**Title:**

Show HN: AgentDoctor – a local linter for AI coding-agent configuration

**Text:**

AgentDoctor audits project-level AI coding agent configuration (Cursor, Claude Code, Codex) for security, instructions, context, and MCP issues.

It is a local Node CLI: no API key, no default code upload, deterministic rule IDs, terminal + JSON output.

Today it detects things like env-file exposure (agent vs repository-risk semantics), credential-like filenames, broad MCP filesystem args, empty/duplicate instructions, missing path references, and large context sources.

Not a secret-content scanner, not an LLM product, and not auto-fix yet. Scoring is intentionally deferred.

```bash
npx @praneeth_54/agentdoctor
```

GitHub: https://github.com/pranee54/AgentDoctor  
npm: https://www.npmjs.com/package/@praneeth_54/agentdoctor
