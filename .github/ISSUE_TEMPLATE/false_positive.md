---
name: False positive
about: A finding that should not have been reported
title: "[false-positive] "
labels: ["false-positive", "needs-triage"]
assignees: ""
---

## Rule ID

Example: `security/env-file-exposure`

## AgentDoctor version

`agentdoctor --version`:

## Expected behavior

Why this should **not** be a finding (or should be a different severity).

## Actual behavior

What AgentDoctor reported (title / severity / affected agents).

## Anonymized evidence

Path shape and config shape only. **Do not paste real secrets or credential values.**

```text
# example: backend/.env excluded by .cursorignore
```

Optional: attach redacted `--json` output.

## Minimal reproduction

Fixture layout or steps if possible.

## Environment

- Node.js version:
- OS:
