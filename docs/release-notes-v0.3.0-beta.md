# AgentDoctor v0.3.0-beta

Minor beta that completes the Scan → Fix → Verify CLI loop and corrects release-facing honesty.

## What was added

- `agentdoctor verify` — re-scan and compare against a prior `scan --json` baseline (`fixed` / `remaining` / `new` / `unchanged`)
- Verify flags: `--json`, `--ci` (fails on **new** findings), `--baseline`, `--min-score`
- Terminal summary prints overall readiness (`N/100`); category and agent scores remain in JSON

## What was fixed

- `agentdoctor scan --json` (and related flags on the `scan` subcommand) honor options correctly via Commander `optsWithGlobals()`
- `agentdoctor fix` reports skip reasons for review/manual findings instead of a silent empty plan
- False-positive reductions for missing-path references, sample/test paths, env templates, and source-named `build`/`target` directories

## What did not change

- Fix writers remain **Cursor `.cursorignore` safe-context only** (security findings stay review/manual)
- GitHub Action remains `--ci --json` report-only (no score-gate inputs)
- Rule ID catalog shape unchanged (additive precision only)

## Compatibility

- Action consumers should use `pranee54/AgentDoctor@v0.3.0-beta`
- The Action default `version` input installs `@praneeth_54/agentdoctor@0.3.0-beta`
- Finding `id` values are the compare key for Verify; stable when evidence paths are unchanged

## Workflow

```bash
npx @praneeth_54/agentdoctor@0.3.0-beta scan . --json > agentdoctor-report.json
npx @praneeth_54/agentdoctor@0.3.0-beta fix . --dry-run
npx @praneeth_54/agentdoctor@0.3.0-beta fix . -y
npx @praneeth_54/agentdoctor@0.3.0-beta verify . --baseline agentdoctor-report.json
```

## Installation

```bash
npx @praneeth_54/agentdoctor@0.3.0-beta
```

```bash
npm install -g @praneeth_54/agentdoctor@0.3.0-beta
agentdoctor
```

```yaml
- uses: pranee54/AgentDoctor@v0.3.0-beta
  with:
    path: .
    output-file: agentdoctor-report.json
```

CLI binary remains `agentdoctor`.
