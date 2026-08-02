# AgentDoctor v0.2.0-beta

Minor beta that ships deterministic readiness scoring (v1) and CLI `--min-score` enforcement.

## What was added

- Deterministic readiness scoring derived from the post-dedupe findings set
- `scoringAvailable: true` with a populated `scores` object (`overall`, `categories`, `agents`)
- CLI `--min-score N` enforcement: exit code `1` when `scores.overall < N`
- `--ci` without `--min-score` remains report-only (exit `0` on successful scan; no implicit threshold)
- Scoring specification, compatibility, and exit-code documentation updated for shipped behavior

Algorithm, weights, security caps, and deferred items: [scoring.md](scoring.md).

## What did not change

- No new JSON top-level fields (`scoringModel`, `scoreExplanation`, and similar remain deferred)
- Rule IDs, severities, finding semantics, and agent / project detection
- GitHub Action behavior: still runs `--ci --json` as a report generator (no score-gate inputs)
- Terminal report still does not render a readiness “N/100” line (JSON only in v1)
- Auto-fix remains deferred

## Compatibility

- Intentional beta behavior change: scores are populated and `--min-score` is enforced
- No migration required for finding consumers; treat `scores` as additive readiness grade
- Action consumers should use `pranee54/AgentDoctor@v0.2.0-beta`
- The Action default `version` input installs `@praneeth_54/agentdoctor@0.2.0-beta`

## Testing

Automated unit and integration coverage for scoring and CLI threshold behavior, plus Action smoke coverage in CI.

## Installation

```bash
npx @praneeth_54/agentdoctor@0.2.0-beta
```

Global:

```bash
npm install -g @praneeth_54/agentdoctor@0.2.0-beta
agentdoctor
```

CI threshold example:

```bash
npx @praneeth_54/agentdoctor@0.2.0-beta --ci --json --min-score 70
```

GitHub Action (report-only; supply `--min-score` via a separate CLI step if you need a gate):

```yaml
- uses: pranee54/AgentDoctor@v0.2.0-beta
  with:
    path: .
    output-file: agentdoctor-report.json
```

CLI binary remains `agentdoctor`.
