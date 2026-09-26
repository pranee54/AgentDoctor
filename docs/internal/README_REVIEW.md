# README Rebuild Review

**Date:** 2026-09-26  
**Scope:** Root `README.md` rebuild for open-source front door  
**Package version:** 2.1.0 (unchanged)  
**Release actions:** NOT PERFORMED

---

## Old README problems

1. Positioned mainly as “engineering assurance for AI coding agents” — undersold project intelligence / student / full loop.
2. Heavy 2.0.1 / 2.1 release archaeology in the hero; weak 30-second product story for strangers.
3. Capability surface incomplete relative to audited 3.0 local core (DNA, twin, what-if, forensic, eval, doctors).
4. Docs map pointed primarily at `docs/2.0.1/` rather than final audit / limitations / acceptance.
5. Did not clearly separate **published 2.1.0** vs **audited 3.0 local core (not published as 3.0.0)**.
6. Funnel weakness: curiosity → install → try-your-project was present but not first-screen dominant.

---

## New structure

1. Hero + badges (facts only)
2. What / Why / How
3. Personas (students → developers → AI → security → teams)
4. Capability tables (Understand / Ask / Build / Test / Secure / Verify / Learn / Operate)
5. Coding-agent distinction + password-reset workflow
6. Install + 5-minute quickstart (verified commands)
7. Command reference (`<details>` groups from live CLI)
8. AI providers (implemented only)
9. MCP + security + truth + evidence/proof
10. Architecture + stack
11. Verification evidence (627 tests, audits)
12. Limitations + roadmap + docs map + contributing + license
13. Maintainer discoverability suggestions (no fake social proof)

---

## Verified capabilities (README claims)

Aligned to `docs/FINAL_3_0_CAPABILITY_MATRIX.md`, `FORMAL_3_0_AUDIT.md`, `FINAL_PRODUCT_ACCEPTANCE.md`, `FINAL_LIMITATIONS.md`.

EXTERNAL items labeled EXTERNAL (K8s/APM/IdP/embeddings/commercial SAST/full compilers/optional LLM).

---

## Verified commands

Every command named in README was checked with `agentdoctor <cmd> --help` (or parent help for `change` / `evidence` / `proof`).

Evidence/proof positional `<changeId>` forms corrected after CLI inspection.

---

## Links checked

Docs links in README point to existing files under `docs/`, plus `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `LICENSE`, `CHANGELOG.md`.

---

## Badges checked

| Badge       | Source                                                  |
| ----------- | ------------------------------------------------------- |
| npm version | `https://img.shields.io/npm/v/@praneeth_54/agentdoctor` |
| CI          | `ci.yml` on `pranee54/AgentDoctor`                      |
| Node        | engines from package (`>=20`) via shields node badge    |
| License     | MIT (`LICENSE`)                                         |

No fake stars/users/benchmarks.

---

## Package check

`npm pack --dry-run` (run after README write) must list `README.md` in tarball contents. Version remains **2.1.0**.

---

## Verification result

| Command              | Result                                                                                |
| -------------------- | ------------------------------------------------------------------------------------- |
| `npm run verify`     | **PASS** · **627/627** tests · typecheck/lint/format/build PASS                       |
| `npm pack --dry-run` | **PASS** · README.md **28.5 kB** included · version **2.1.0** · 712 files · ~452.5 kB |

---

## Remaining documentation limitations

1. `SECURITY.md` supported-versions table updated lightly to include 2.1.x; older rows still historical.
2. Some feature docs still carry early “PARTIAL” maturity banners — authoritative status remains final 3.0 matrix / formal audit.
3. `CONTRIBUTING.md` still references older `docs/2.0` paths in places — backlog polish, not README-blocking.
4. Social growth requires distribution beyond README (demos, eval clips, ecosystem posts); README only completes the GitHub landing step of the funnel.

---

## Funnel note

```text
Content → Curiosity → GitHub README → 30s understanding → 5-min install
  → Real project test → “I need this” → Star / Issue / Share
```

README optimizes the middle of that funnel with honest capabilities and a copy/paste quickstart — not hype.
