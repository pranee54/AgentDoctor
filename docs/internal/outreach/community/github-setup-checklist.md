# GitHub setup checklist (post-1.1.0)

Owner-operated. Do **not** invent metrics. `gh` metadata APIs may be unavailable in some environments — verify in the GitHub UI.

## Current state (inspect manually)

| Item                 | How to check              | Notes                                                  |
| -------------------- | ------------------------- | ------------------------------------------------------ |
| Default branch       | GitHub → Code             | Expect `main`                                          |
| Latest commit        | Code tab                  | Docs/adoption commits after Brain release              |
| Releases             | Releases                  | `v1.1.0` should exist from publish train               |
| CI                   | Actions                   | CI + CodeQL on `main`                                  |
| Discussions          | Settings → General        | Enable if seeding show-and-tell                        |
| Issue templates      | `.github/ISSUE_TEMPLATE/` | bug, FP/FN, feature, rule, adapter, **brain-quality**  |
| Topics / description | About sidebar             | May still reflect Safety-era copy — update recommended |

## Recommended repository description

```text
Evidence-backed Project Brain for AI coding agents — structured repository understanding exposed through MCP.
```

(Also acceptable longer variant mentioning Safety Scan → Fix → Verify.)

## Suggested website

```text
https://www.npmjs.com/package/@praneeth_54/agentdoctor
```

## Suggested topics (accurate only)

```text
ai
ai-agents
coding-agents
developer-tools
mcp
model-context-protocol
code-analysis
repository-analysis
cursor
claude-code
codex
typescript
nodejs
cli
static-analysis
```

## Suggested labels

| Label              | Use                                 |
| ------------------ | ----------------------------------- |
| `good first issue` | Starter docs/fixtures/tests         |
| `brain`            | Project Brain understanding quality |
| `mcp`              | MCP / STDIO / tool contract         |
| `docs`             | Documentation                       |
| `safety`           | Scan/Fix/Verify/rules               |
| `windows`          | Portability                         |
| `help wanted`      | Mentored contributions              |

## Suggested milestones

| Milestone                 | Scope                                       |
| ------------------------- | ------------------------------------------- |
| `v1.1.x`                  | Brain/MCP stability + docs/adoption         |
| `Agent Context (planned)` | Task-relevant context — **not implemented** |
| `Safety precision`        | Corpus-backed rule precision                |

## Seed content

- Discussion from [show-and-tell.md](show-and-tell.md)
- Issues from [good-first-issues.md](good-first-issues.md)
- Social drafts in [launch-post.md](launch-post.md) — post manually

## Do not

- Claim stars, download ranks, or “production at N companies” without evidence
- Auto-change GitHub settings from unattended agents without owner review
- Commit `.cursor/` or `.agentdoctor/` as product files
