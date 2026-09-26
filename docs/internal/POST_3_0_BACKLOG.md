# Post-3.0 Backlog

Items discovered during Final Product Acceptance (2026-09-26).  
**Do not implement these as part of the 3.0.0 release freeze** unless promoted to P0/P1.

Package version at acceptance: **2.1.0** (3.0 = local-core scope / future cut).

---

## P2 — Non-blocking (quality / UX)

1. **Context planner often returns 0 file excerpts** for small JS projects during `plan` / `learn`, even when `search` finds the right files. Deterministic chat now falls back to graph paths for auth/entry/DB/overview, but budgeted retrieval still frequently says “No file excerpts retrieved.”
2. **API Doctor** does not detect `url.pathname === "/route"` style Node HTTP servers (campus-notes). Documented regex frameworks only — extend adapters post-release if desired.
3. **DNA fingerprint volatility** as `.agentdoctor/` artifacts accumulate (graph/brain/evidence) can change fingerprints between consecutive `start`/`dna` runs on the same logical project.
4. **Deterministic chat Truth footer** may still say “Insufficient repository evidence” even when specialized sections (graph/auth paths) were printed — reconcile `buildChatTurnResponse` with analyzer sections.
5. **Individual feature docs** still carry early “PARTIAL (2.1.0 local build)” banners; authoritative status is `FORMAL_3_0_AUDIT.md` / `FINAL_3_0_CAPABILITY_MATRIX.md`.
6. **BUILD_WITH_ME plan “files likely affected”** empty when context planner selects nothing — should optionally seed from `search`/what-if.
7. **IDE Gradle/Java** may re-create `fixtures/**/android/.project` and attempt AGP sync; keep fixtures marker-only and workspace Java/Gradle import disabled (see `IDE_DIAGNOSTICS_AUDIT.md`).

## P3 — Future enhancements

1. Richer student explanations (deeper grounded excerpts without requiring an LLM).
2. Optional LLM-assisted Project Chat defaults with clearer “provider required” UX in README quickstart.
3. Stronger Test Brain heuristics to ignore lockfile-only dirty trees when recommending tests.
4. Live runtime / APM / K8s adapters (remain EXTERNAL).
5. Enterprise IdP / SSO binding for org model (remain EXTERNAL).
6. Neural embeddings for search/memory (remain EXTERNAL).
7. Commercial SAST/SCA integration (remain EXTERNAL).
8. Compiler-grade call/type binding for Go/Java/Kotlin/Rust/Dart beyond line scanners.
9. Dedicated dashboard REST for org/settings if product wants first-class UI (currently CLI/local catalog).
10. Broader eval fixtures (GraphQL live, legacy multi-service) without weakening honesty of current lab.

---

## Explicitly out of scope for silent post-acceptance work

- Version bump to 3.0.0
- npm publish / git push / tag / GitHub release / production deploy
- New Doctors, providers, MCP categories, or architecture redesign
