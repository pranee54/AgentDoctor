# Exit codes

AgentDoctor uses stable exit codes for CI:

| Code | Meaning                                                                            |
| ---- | ---------------------------------------------------------------------------------- |
| `0`  | Success — scan completed (including when findings exist, unless a threshold fails) |
| `1`  | Threshold failure — `scores.overall` is below `--min-score N`                      |
| `2`  | Usage error — invalid arguments or path                                            |
| `3`  | Internal error — unexpected failure during execution                               |

Readiness scoring is available (`scoringAvailable: true`, `scores` populated). Behavior:

- No `--min-score` → exit `0` on successful scan (findings do not change the exit code).
- `--ci` without `--min-score` → report mode; still exit `0` on successful scan.
- `--min-score N` (with or without `--ci`) → exit `1` if `scores.overall < N`.

Example:

```bash
npx @praneeth_54/agentdoctor --ci --json --min-score 70
echo $?
```

Related: [scoring.md](scoring.md) · [architecture.md](architecture.md) · [rules.md](rules.md) · [compatibility.md](compatibility.md)
