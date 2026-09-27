---
name: agentdoctor-dashboard-product-design
description: >-
  Designs, audits, and improves the AgentDoctor dashboard as a serious developer
  product intelligence UI—not a raw JSON/API debug console. Use when working on
  the AgentDoctor dashboard, dashboard UI/UX, navigation, project overview, Project
  Brain/Intelligence UI, security/architecture/AI-agent/student/evidence/proof UI,
  developer workflow surfaces, or dashboard information architecture.
---

# AgentDoctor Dashboard Product Design

AgentDoctor is a software project intelligence and assurance platform.

The dashboard must help a user understand their project, find problems, learn how it works, inspect evidence, safely make changes, and verify those changes.

The dashboard must NOT look like:

- a raw JSON API viewer
- an admin CRUD panel
- a developer debug console
- a generic SaaS template
- a monitoring dashboard full of meaningless charts

It should feel like a serious engineering product.

**Full design bible:** [reference.md](reference.md) — follow it for Home, navigation, components, truth model, security UX, student UX, visual language, audit matrix, and verification.

## Absolute rules

1. **Do not invent backend capabilities.**
2. Before changing UI, inspect existing API routes, contracts, dashboard handlers, types, and frontend implementation.
3. **Backend truth is authoritative.**
4. Do not fabricate scores, metrics, evidence, or pages.
5. Preserve safety: approvals, path safety, workspace isolation, truth labels, evidence. No unrestricted shell.
6. Keep API contracts backward compatible.

## Canonical code locations

Inspect first (paths may grow; start here):

| Area | Location |
| ---- | -------- |
| Embedded dashboard | `src/dashboard/server.ts` |
| Package version | `src/constants.ts` → `PACKAGE_VERSION` |
| Status / ops health | `src/ops/health.ts`, `/api/status` |
| Product APIs | `src/product/**`, dashboard `/api/*` handlers in `server.ts` |
| Chat | `/api/chat` + `src/agent/chat/**` |
| Tests | `tests/unit/product/dashboard-*.test.ts`, e2e if present |

## Mandatory workflow

Copy and track:

```
Dashboard task:
- [ ] 1. Read this skill + reference.md sections relevant to the change
- [ ] 2. Inventory routes/endpoints/types from code (not memory)
- [ ] 3. Sample real API responses (nullable/optional fields)
- [ ] 4. Audit current page(s) against the design hierarchy
- [ ] 5. Implement UI consuming real contracts only
- [ ] 6. Loading / empty / error / technical-details states
- [ ] 7. Version labels from PACKAGE_VERSION / status API only
- [ ] 8. Verify (suite + browser + no overflow / broken routes)
- [ ] 9. Final output block (see below)
```

### Design hierarchy (always)

```
PROJECT → UNDERSTAND → CHECK → ACT → VERIFY
```

User must answer in ≤30 seconds:

1. What project am I looking at?
2. What is the current state?
3. Is anything important wrong?
4. What should I do next?
5. Where can I investigate deeper?

Progressive disclosure: simple first → technical second → raw JSON only in expandable Technical Details.

### Version consistency (concrete defect)

Never hardcode `AgentDoctor 2.0` when package is `3.0.0`.

One authoritative source: `PACKAGE_VERSION` / status API `ops.version` (or equivalent). Audit title, header, footer, about, metadata.

### Raw JSON

Never primary Home. Use structured overview cards with semantic states (`Healthy` / `Attention` / `Warning` / `Blocked` / `Unknown` / `Not analyzed`) — **not invented percentages**.

### Navigation

Group conceptually (OVERVIEW / UNDERSTAND / CHECK / INTELLIGENCE / OPERATIONS / LEARNING / SYSTEM). **Only expose routes that exist.** Label experimental honestly. No fake pages.

### Truth labels

Preserve `VERIFIED` | `INFERRED` | `UNKNOWN` | `EXTERNAL`. Never imply certainty the backend does not have.

## Implementation preferences

- Prefer improving the existing embedded dashboard (`src/dashboard/server.ts` HTML/CSS/JS) unless the repo already has a separate SPA framework.
- Do not introduce a large new UI framework without a clear technical reason.
- Reuse patterns: Layout, Sidebar, StatusBadge, cards, EmptyState, TechnicalDetails, EvidencePanel.
- Dark professional engineering UI: strong hierarchy, restrained accents, no template aesthetics.

## Verification

After changes:

1. `npm run verify` (or at least typecheck + relevant dashboard tests)
2. Browser: Home + every nav item
3. Empty / no-git / no-tests / no-AI / with-AI / security findings when practical
4. Technical details expand + copy
5. Responsive: no horizontal overflow, no clipping
6. All version labels consistent
7. No console errors; no broken routes

Do not claim "production ready" unless verification supports it.

## Final output (required)

```markdown
1. Dashboard audit summary
2. Files changed
3. Routes audited
4. UX problems fixed
5. Backend contracts preserved
6. Tests run
7. Remaining limitations
8. Screenshots/browser verification performed
```

## Goal

Turn AgentDoctor's existing engineering capabilities into a clear, trustworthy, professional project intelligence interface — not merely prettier chrome.
