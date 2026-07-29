# Exit codes

AgentDoctor uses stable exit codes for CI:

| Code | Meaning                                                                                      |
| ---- | -------------------------------------------------------------------------------------------- |
| `0`  | Success — scan completed                                                                     |
| `1`  | Issues or threshold failure — reserved for score / policy failures when scoring is available |
| `2`  | Usage error — invalid arguments or path                                                      |
| `3`  | Internal error — unexpected failure during execution                                         |

In the current public beta, readiness scoring is not available (`scoringAvailable: false`). `--min-score` is accepted but ignored, and scans that finish successfully exit `0` even when findings are present.

Example:

```bash
npx @praneeth_54/agentdoctor --json
echo $?
```

Related: [architecture.md](architecture.md) · [rules.md](rules.md) · [compatibility.md](compatibility.md)
