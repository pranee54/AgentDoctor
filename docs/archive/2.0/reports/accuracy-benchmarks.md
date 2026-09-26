# AgentDoctor 2.0 — Accuracy Benchmarks

**Policy:** Do not invent benchmark numbers. Only report measured or qualitative fixture outcomes.

## Measured in automated tests

| Scenario                                                 | Evidence | Result           |
| -------------------------------------------------------- | -------- | ---------------- |
| Shared contract adapter maps platform findings           | unit     | PASS             |
| Init proposals are not auto-approved                     | unit     | PASS             |
| AST graph builds or falls back with limitations          | unit     | PASS             |
| Dead-code categories distinguish exported/public/dynamic | unit     | PASS (heuristic) |
| Knowledge retrieval abstains without approval            | unit     | PASS             |
| Policy evaluate MCP returns `not-executed`               | unit     | PASS             |
| Local-dev auth registers hash then authenticates         | unit     | PASS             |

## Not measured (no fabricated scores)

| Metric                                                | Status                                 |
| ----------------------------------------------------- | -------------------------------------- |
| Symbol resolution precision/recall vs gold AST corpus | Not independently validated            |
| Test-impact precision with coverage files             | Blocked — coverage adapter not bundled |
| Multi-language false-positive rates                   | Unsupported beyond TS/JS               |
| Prompt-injection detector ROC                         | Partial platform heuristics only       |

When golden fixtures are added later, record raw counts here — never placeholder percentages.
