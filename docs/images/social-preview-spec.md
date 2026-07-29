# Social preview specification

GitHub repository social preview (Open Graph) image for AgentDoctor.

## Canvas

| Property    | Value             |
| ----------- | ----------------- |
| Width       | 1280 px           |
| Height      | 640 px            |
| Format      | PNG               |
| Safe margin | ≥64 px from edges |

## Content (keep minimal)

Primary wordmark (largest):

```text
AgentDoctor
```

Tagline:

```text
Lighthouse for AI coding agents.
```

Supporting line (smaller):

```text
Audit security · instructions · context · MCP
```

Install hint (monospace):

```text
npx @praneeth_54/agentdoctor
```

Optional small motif: simple checkmark / diagnostic pulse — not a fake dashboard.

## Visual direction

- Developer-tool aesthetic
- Dark terminal-inspired background (deep charcoal / near-black)
- High-contrast light text for the wordmark
- One restrained accent (for example muted cyan or amber — not purple-gradient marketing cliché)
- Strong readable type at thumbnail size
- No fake stars, downloads, or “trusted by” logos
- No dense tables or terminal dumps (those belong in README screenshots)

## Typography guidance

- Display: geometric sans or monospace-adjacent for product name
- Body: clean sans
- Avoid thin weights that disappear in the GitHub card crop

## Export checklist

- [ ] Readable at ~600×300 (GitHub card scale)
- [ ] Wordmark still dominant when cropped slightly
- [ ] No real secrets / real repo paths from private work
- [ ] Filename suggestion: `docs/images/social-preview.png`
- [ ] Upload via GitHub **Settings → General → Social preview**

## Out of scope for this file

Do not generate or commit a fabricated preview image as “official art” without a deliberate design pass. This document is the brief only.
