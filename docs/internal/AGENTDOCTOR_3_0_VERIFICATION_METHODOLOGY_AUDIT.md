# AgentDoctor 3.0.0 — Verification Methodology Audit

**Generated:** 2026-09-27T05:52:35.625843Z

## Why earlier RELEASE READY / PASS claims failed

Previous audits produced false confidence through recurring methodology errors — not merely missing one bug:

| Failure mode                                | What happened                                                           | Example                                         |
| ------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------- |
| Helper tests ≠ entrypoint tests             | `createFileSafe` / `executeAgentTool` unit passes treated as MCP secure | MCP claimed PASS without JSON-RPC forge         |
| Containment mistaken for ownership          | `resolveSafeRepoPath` treated as enough                                 | `retrieveProjectContext` VERIFIED foreign files |
| Lexical hint preferred over realpath        | Symlink alias `link-to-private` classified owned                        | Symlink laundering into `.private`              |
| `loadLatest` tested, `loadSnapshot(id)` not | Stale brains still loadable by id                                       | Brain stale-state gap                           |
| Current cache tested, stamped cache not     | Graph index lacked ownershipBoundaryVersion                             | Contaminated graph reload                       |
| One CLI surface fixed, siblings ignored     | scan/fix/verify gated; dna/map/graph/dashboard open                     | `$HOME` hang class                              |
| Prompt construction ≠ provider obedience    | System/data split documented; no provider E2E                           | Prompt injection NOT_VERIFIED                   |
| Green `npm run verify` = certification      | Suite health ≠ trust-boundary coverage                                  | 641–646 green with P0 still open                |
| Trusted fixtures only                       | Hostile foreign markers absent in many suites                           | Contamination invisible                         |

## Corrections required (and applied this closure)

1. **Hostile fixtures** with unmistakable foreign markers on every producer.
2. **Transport-level MCP STDIO forge** (`tests/unit/mcp/mcp-transport-adversarial.test.ts`).
3. **Deterministic local OpenAI-compatible adversarial provider E2E** (`tests/unit/ai/provider-adversarial-e2e.test.ts`) — labeled DETERMINISTIC LOCAL PROVIDER E2E, not live vendor cert.
4. **Symlink realpath ownership** (OWNERSHIP_BOUNDARY_VERSION → 4).
5. **CLI broad-root gate** via `resolveCliProjectRoot` across intelligence commands + matrix test.
6. **Stale loaders** for Brain snapshot-id + graph cache stamps.
7. **Walker inventory** mandatory living doc.
8. **Verdict vocabulary** — NOT_VERIFIED / PARTIAL / STRUCTURAL_ONLY never silently become PASS.

## What still cannot be claimed without evidence

- Live vendor LLM certification (OpenAI/Anthropic/Gemini paid)
- Exhaustive interactive CLI sessions (chat/agent REPL) beyond help+home probes
- Enterprise IdP / SSO / cloud deploy

## Non-negotiable gate language

`ZERO_TRUST_VERIFIED` requires executable evidence for every mandatory row.
Missing evidence ⇒ `NOT_FULLY_VERIFIED`.
