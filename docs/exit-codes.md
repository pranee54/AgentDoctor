# Exit codes

AgentDoctor uses stable exit codes for CI:

| Code | Meaning                                                                              |
| ---- | ------------------------------------------------------------------------------------ |
| `0`  | Success — scan/verify completed (including when findings exist, unless a gate fails) |
| `1`  | Threshold / CI gate failure — see command-specific rules below                       |
| `2`  | Usage error — invalid arguments, path, or missing verify baseline                    |
| `3`  | Internal error — unexpected failure during execution                                 |

## `scan`

Readiness scoring is available (`scoringAvailable: true`, `scores` populated). Behavior:

- No `--min-score` → exit `0` on successful scan (findings do not change the exit code).
- `--ci` without `--min-score` → report mode; still exit `0` on successful scan.
- `--min-score N` (with or without `--ci`) → exit `1` if `scores.overall < N`.

## `verify`

Compares a prior `scan --json` baseline to a fresh scan of the same repository.

- Requires a baseline file (`--baseline`, or `agentdoctor-report.json` / `.agentdoctor-baseline.json` in the repo root).
- `--min-score N` → exit `1` if post-verify `scores.overall < N`.
- `--ci` → exit `1` when **new** findings appear that were not in the baseline (regressions).
- Remaining findings from the baseline do not fail the process by themselves (manual/review items are expected).

Example:

```bash
npx @praneeth_54/agentdoctor --ci --json --min-score 70
echo $?

npx @praneeth_54/agentdoctor scan --json > agentdoctor-report.json
npx @praneeth_54/agentdoctor fix -y
npx @praneeth_54/agentdoctor verify --ci --json
echo $?
```

Related: [scoring.md](scoring.md) · [architecture.md](architecture.md) · [rules.md](rules.md) · [compatibility.md](compatibility.md)
