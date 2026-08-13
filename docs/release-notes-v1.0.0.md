# AgentDoctor v1.0.0

First production release. Scan → Fix → Verify → CI is the supported workflow.

## Highlights

- Claude Code and Codex safe-context Fix writers (alongside Cursor `.cursorignore`)
- CI policy gates on CLI and GitHub Action (`minimum-score`, `fail-on-severity`, `fail-on-rule`, `fail-on-new`, `verify-baseline`)
- `scan --ci` fails on critical findings; omit `--ci` for report-only
- Honest limited-analysis / no-agent scoring (`n/a`, `--min-score` fails)
- Windows CI + Windows-safe Fix overwrite
- Action `verify-baseline` containment after realpath

## Install

```bash
npx @praneeth_54/agentdoctor@1.0.0
```

```yaml
- uses: pranee54/AgentDoctor@v1.0.0
  with:
    path: .
    version: "1.0.0"
    minimum-score: "70"
    fail-on-severity: critical
```

The Action default `version` input is `1.0.0`.

## Docs

- [CHANGELOG.md](../CHANGELOG.md)
- [docs/compatibility.md](compatibility.md)
- [docs/exit-codes.md](exit-codes.md)
- [docs/scoring.md](scoring.md)
