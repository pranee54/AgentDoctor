# LinkedIn launch draft (AgentDoctor)

Status: **draft only — do not post until demo assets and GitHub About metadata are ready.**

---

I built AgentDoctor after watching AI coding-agent configuration pile up in real repositories — Cursor rules, Claude Code settings, Codex `AGENTS.md`, MCP configs, ignore files — often without a consistent review path.

AgentDoctor is a local CLI that audits that configuration:

- security (env exposure, credential-like filenames, broad MCP filesystem scopes)
- instructions (empty, duplicate, missing path references)
- context (oversized instructions, logs, generated directories)
- MCP project config (malformed / risky path args)

No API key. No code upload by default. Deterministic findings with stable rule IDs.

Try it:

```bash
npx @praneeth_54/agentdoctor
```

GitHub: https://github.com/pranee54/AgentDoctor  
npm: https://www.npmjs.com/package/@praneeth_54/agentdoctor

v1 ships readiness scores, Scan → Fix → Verify, and CI policy gates. Fix applies safe Cursor / Claude Code / Codex context exclusions only; security findings stay review/manual. Feedback welcome — especially false positives and misses from real agent setups.
