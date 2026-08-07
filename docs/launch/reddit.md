# Reddit launch draft (AgentDoctor)

Status: **draft only — do not post until ready.**

Suggested communities: r/programming, r/node, r/typescript, r/ClaudeAI, r/cursor (follow each subreddit’s self-promo rules).

---

**Title:** AgentDoctor — local linter for AI coding-agent configuration (Cursor / Claude Code / Codex)

**Body:**

I kept running into the same problem: repositories accumulate agent instruction files, ignore rules, MCP configs, and permission settings, and there was no simple local way to audit them the way we audit deps or lint code.

AgentDoctor is a Node CLI that scans project-level config for Cursor, Claude Code, and Codex. It reports deterministic findings for:

- env / credential-like filename exposure (conservative; does not print secrets)
- MCP filesystem scopes that look too broad
- empty / duplicate / broken instruction path references
- large always-on context and unignored generated directories

Design choices:

- local static analysis only for the core product
- no API key / no default upload
- stable rule IDs + JSON for CI
- intentionally conservative security findings

Published `0.3.0-beta` includes Cursor `.cursorignore` safe-context Fix and CLI `--min-score`. `--ci` alone stays report-only; GitHub Action `@v0.3.0-beta` is report-only (no score-gate inputs yet). Readiness scores ship in JSON and the terminal.

```bash
npx @praneeth_54/agentdoctor
```

Repo: https://github.com/pranee54/AgentDoctor

Looking for criticism — especially false positives / false negatives from real setups. Please do not paste secrets; anonymize evidence.
