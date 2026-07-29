# GitHub launch checklist

Use this checklist when configuring the public GitHub repository for AgentDoctor.
Do not invent metrics. Do not invent a marketing website.

## About (repository sidebar)

### Description (≤160 characters)

```text
Local CLI that audits coding-agent configuration for security, instructions, context, and MCP — no API key or code upload by default.
```

Character count: 139.

### Website

Prefer the npm package page (install destination visitors need):

```text
https://www.npmjs.com/package/@praneeth_54/agentdoctor
```

Alternative: leave Website empty and keep Homepage as the README if you prefer GitHub-first discovery.

### Topics (recommended)

```text
ai-coding-agents
coding-agents
developer-tools
cli
security
static-analysis
mcp
model-context-protocol
cursor
claude-code
codex
typescript
nodejs
repository-audit
open-source
agent-configuration
linter
devtools
```

Add at most ~15–20. Prefer precise terms over filler.

## Social preview

Create a 1280×640 image per [images/social-preview-spec.md](images/social-preview-spec.md).

Upload under: **Settings → General → Social preview**.

## README demo assets

Capture real terminal output (never fabricate screenshots):

1. Hero PNG — [images/README.md](images/README.md)
2. Optional short GIF — same doc

Add files under `docs/images/` only after capturing real output. Update README image links when assets exist.

## Community

- [ ] Enable Discussions (if not already) and seed with [discussions-welcome.md](discussions-welcome.md)
- [ ] Label starter issues from [good-first-issues.md](good-first-issues.md)
- [ ] Confirm issue templates for bug / false positive / false negative / feature / rule / adapter
- [ ] Confirm SECURITY.md advisory path works

## Release hygiene

- [ ] Latest published npm version matches intended public beta
- [ ] GitHub Release for the current beta is published (not draft-only)
- [ ] CHANGELOG and release notes match published behavior

## Do not

- Claim scoring or auto-fix are available
- Claim AgentDoctor is a complete secret scanner
- Post launch content until demo assets and About metadata are ready (or clearly pending)
