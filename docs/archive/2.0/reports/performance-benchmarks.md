# AgentDoctor 2.0 — Performance Benchmarks

**Policy:** No invented timings. Qualitative bounds only unless measured.

## Observed during development (qualitative)

| Operation                                      | Expected local behavior                      |
| ---------------------------------------------- | -------------------------------------------- |
| Safety `scan` on this repo                     | Seconds on modern laptop                     |
| Intelligence graph `auto` (TS API, ≤400 files) | Seconds–tens of seconds depending on machine |
| Regex fallback graph                           | Typically faster, less precise               |
| Git intelligence (≤200 commits)                | Sub-second to few seconds                    |
| Dashboard `/api/v2/graph`                      | Dominated by graph build cost                |

## Not claimed

- Formal SLO / p95 latency
- Memory ceilings for monorepos >10k TS files
- Incremental index speedups vs cold build (incremental indexing is partial)

## How to measure locally

```bash
time npx agentdoctor graph --json >/dev/null
time npx agentdoctor health --json >/dev/null
npm run verify
```

Record wall times in future revisions of this file after measurement.
