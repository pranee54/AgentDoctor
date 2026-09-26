# AgentDoctor 2.0 — Trust Boundaries

```
[Developer workstation]
    │
    ├─ Safety CLI (scan/fix/verify) ──► repo files (opt-in writes via Safe Fix)
    ├─ Brain / intelligence (read+local store) ──► .agentdoctor/**
    ├─ Platform evaluate-only ──► verdicts only (no agent intercept)
    ├─ Controlled runner (optional) ──► only commands AD actually executes/blocks
    ├─ MCP STDIO ──► client process (must be trusted to not exfiltrate)
    └─ Dashboard loopback HTTP ──► local browser only by default
```

## Boundary rules

1. **Repo root** — all analysis scoped to resolved repository root.
2. **Evaluate vs enforce** — policy evaluation never equals blocked execution unless enforcement interface ran.
3. **Proposal vs fact** — AI/init artifacts start as `proposed`/`draft`; never auto-approved.
4. **Local vs team** — filesystem-first local mode; team mode requires explicit local-dev auth (or future IdP).
5. **Network** — dashboard refuses non-loopback without `--allow-non-loopback`.

## Data classification

| Class                   | Examples              | Handling                       |
| ----------------------- | --------------------- | ------------------------------ |
| Public metadata         | File paths, rule ids  | OK in reports                  |
| Sensitive               | `.env`, keys          | Redact; block modify in policy |
| Authoritative knowledge | Approved records only | Retrieval abstains otherwise   |
| Proposed                | Init artifacts        | Labeled; not facts             |
