# IDE Diagnostics Audit

**Date:** 2026-09-26  
**Package version:** 2.1.0 (unchanged)  
**Release actions:** NOT PERFORMED  
**Method:** Repository commands are source of truth; Cursor Problems panel is classified separately.

---

## Initial Problems Count

User reported a **very large** Cursor Problems indicator (order of thousands / 10K+) plus colored Explorer folders.

**Not used as source of truth.** Measured against CLI verification and workspace layout instead.

---

## PROJECT VERIFICATION = PASS

Exact commands run in this audit:

| Command                | Exit | Result                                           |
| ---------------------- | ---- | ------------------------------------------------ |
| `npm run typecheck`    | 0    | PASS (no `tsc` errors)                           |
| `npm run lint`         | 0    | PASS (eslint clean)                              |
| `npm run format:check` | 0    | PASS                                             |
| `npm test`             | 0    | **626 / 626** PASS · 128 files · 0 fail · 0 skip |
| `npm run build`        | 0    | PASS                                             |
| `npm run verify`       | 0    | **PASS** (`VERIFY_EXIT:0`)                       |

Agent tool `ReadLints` over the workspace: **No linter errors found** for AgentDoctor source.

**Conclusion:** There are **zero real AgentDoctor project TypeScript / ESLint / test / build failures**. The Problems flood is **not** a failed 3.0 audited product state.

---

## Actual Diagnostics

Classification (IDE vs project):

| Bucket                                           | Count / signal                                                                                      | Kind                           |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------- | ------------------------------ |
| TypeScript (AgentDoctor `src`/`tests` via `tsc`) | **0**                                                                                               | PROJECT ERROR — none           |
| ESLint (`eslint .` project config)               | **0**                                                                                               | PROJECT ERROR — none           |
| Vitest / build                                   | **0** failures                                                                                      | PROJECT ERROR — none           |
| Cursor `ReadLints` (TS/ESLint on workspace)      | **0**                                                                                               | IDE DIAGNOSTIC — none for core |
| Java Language Server                             | **likely thousands** when active                                                                    | IDE DIAGNOSTIC (unrelated)     |
| Gradle / Maven import                            | **likely thousands** when active                                                                    | IDE DIAGNOSTIC (unrelated)     |
| Nested TS projects under validation checkouts    | **605 `tsconfig*.json`**, **1505 `package.json`**, **~30 nested `node_modules`**, **~39 392 files** | IDE DIAGNOSTIC                 |
| Fixture intentional samples                      | small; not product                                                                                  | INTENTIONAL FIXTURE CONTENT    |
| `node_modules` (root)                            | excluded by `tsc`/`eslint`; not committed                                                           | IDE DIAGNOSTIC if mis-scoped   |
| `dist/`                                          | generated; gitignored                                                                               | GENERATED                      |
| Git Explorer colors                              | modified + untracked 3.0 work                                                                       | GIT DECORATION                 |

### Summary by source (expected before workspace scoping)

```
TypeScript (project tsc):     0 errors
ESLint (project eslint):      0 errors
Java:                         HIGH (checkout Android/Spring/JVM samples when JDT/Gradle on)
Gradle/Maven:                 HIGH (17 build.gradle*/pom.xml under checkouts + .gradle caches)
Generated files (dist):       0 product errors (excluded from typecheck emit checks)
Fixtures:                     intentional samples; not treated as production by tsc/eslint
node_modules (root):          skipped by project tooling
Nested checkout TS projects:  PRIMARY flood vector (hundreds of foreign projects)
Unknown:                      residual stale LS cache until window reload
```

---

## TypeScript Diagnostics

**PROJECT ERROR: 0**

Evidence:

- `tsconfig.json` includes only `src/**/*`, `tests/**/*`, vitest configs, `eslint.config.js`
- Explicitly **excludes** `node_modules`, `dist`, `fixtures`
- `npm run typecheck` and `npm run build` PASS

**IDE risk:** VS Code/Cursor can still discover **nested** `tsconfig.json` trees under:

`validation/real-world/repositories/checkouts/`

That directory is **gitignored** laboratory content (`/.gitignore` line for checkouts) but still present on disk (~GB of third-party repos). Nested project discovery is independent of AgentDoctor’s root `tsconfig.json`.

---

## ESLint Diagnostics

**PROJECT ERROR: 0**

`eslint.config.js` ignores: `dist`, `fixtures`, `coverage`, `node_modules`, `test-results`, `scripts`, `validation`, `.private`, `AgentDoctorOS`.

`npm run lint` PASS.

---

## Java/Gradle Diagnostics

**PROJECT ERROR: 0** (AgentDoctor has **no** production Java under `src/`)

On disk (not AgentDoctor product):

| Location                                               | Role                                                                                                 |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `tests/fixtures/languages/Main.java`                   | intentional language-adapter fixture                                                                 |
| `fixtures/**/*.java` (few)                             | understanding / mobile samples                                                                       |
| `validation/software-understanding/frameworks/java/**` | validation sample                                                                                    |
| `validation/real-world/repositories/checkouts/**`      | **cloned real-world labs** (spring-petclinic, flutter-bloc Android, microservices-demo adservice, …) |

Counts (approx.):

- `*.java` under checkouts: **53**
- `*.kt` under checkouts: **36**
- Gradle/Maven manifests under checkouts: **17**
- `.gradle` cache dirs present under checkouts/fixtures

If Cursor status bar shows **Java** / **Gradle** extensions, those language servers import foreign JVM/Android projects and emit large Problem lists (missing SDKs, unresolved deps, Gradle sync). That is **CASE B** — unrelated workspace indexing — **not** AgentDoctor core failure.

Recommended extensions for this repo (`.vscode/extensions.json`): ESLint, Prettier, EditorConfig only — **not** Java/Gradle.

---

## Fixture Diagnostics

**INTENTIONAL FIXTURE CONTENT** — do not “fix” to silence the IDE.

Includes insecure samples, prompt-injection text, incomplete projects, multi-language snippets. Project `tsc`/`eslint` already exclude `fixtures/**`. Evaluation suite must keep working.

Tiny Java/Kotlin/Dart/Rust fixtures under `tests/fixtures/languages/` exist for AgentDoctor parsers; they are not a full Java product.

---

## Generated File Diagnostics

| Path                                            | Status                                                                          |
| ----------------------------------------------- | ------------------------------------------------------------------------------- |
| `dist/`                                         | gitignored; build output; excluded from typecheck include path for emit project |
| `test-results/`, `coverage/`                    | gitignored                                                                      |
| `.agentdoctor/`                                 | local state; gitignored                                                         |
| `validation/real-world/repositories/checkouts/` | **generated lab checkouts**; gitignored; **main IDE flood source**              |

---

## node_modules Diagnostics

Root `node_modules/` is gitignored and excluded from `tsc`/`eslint`.

Additional nested `node_modules` (**~30**) exist **inside** validation checkouts — another IDE indexing hazard if those trees are visible to language servers.

**Do not modify or commit `node_modules`.**

---

## Git Decorations

Explorer colors are **GIT DECORATION**, not compiler errors.

From `git status --short` / `git diff --name-status`:

| Kind              | Meaning                                 | Examples                                                                                                      |
| ----------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `M` (modified)    | Tracked files changed in 3.0 local work | `src/agent/*`, `src/cli/program.ts`, `src/dashboard/server.ts`, MCP registries, some docs                     |
| `??` (untracked)  | New 3.0 local files                     | `src/product/**`, many `docs/FINAL_*`, `docs/FORMAL_3_0_AUDIT.md`, `fixtures/eval/**`, e2e/unit product tests |
| Deleted / renamed | None observed as primary noise          | —                                                                                                             |

Approx. **78** short-status entries at audit time (many untracked trees collapsed in `git status` views).

Colored folders (`docs`, `fixtures`, `src`, `tests`, …) = SCM change markers for the uncommitted 3.0 local-core + audit docs. **Do not revert.**

---

## Root Causes

1. **PRIMARY — IDE DIAGNOSTIC:** Local `validation/real-world/repositories/checkouts/` contains large third-party clones (e.g. chakra-ui ~307 MB, filament ~228 MB, turborepo ~166 MB, …) with **605 nested TypeScript configs** and JVM/Android Gradle trees. Cursor/VS Code language servers index them even though AgentDoctor project tooling ignores them.
2. **SECONDARY — IDE DIAGNOSTIC:** Java/Gradle extensions (status bar) import checkout JVM/Android projects → large Problem lists.
3. **NOT A CAUSE — GIT DECORATION:** Colored Explorer entries from dirty working tree after 3.0 build/audits.
4. **NOT A CAUSE — PROJECT ERROR:** AgentDoctor `typecheck` / `lint` / `test` / `build` / `verify` all PASS.

Matches user CASE mapping:

- **CASE A:** No real AgentDoctor source errors to fix.
- **CASE B:** Yes — Java/Gradle + unrelated checkout projects.
- **CASE C:** Nested `node_modules` / generated checkout trees.
- **CASE D:** Fixtures intentional; left alone.
- **CASE E:** After scoping, reload window / restart TS & Java LS if Problems linger (stale cache).
- **CASE F:** N/A for product parsers; no false language upgrade.

---

## Fixes Applied

**No AgentDoctor product/source code changes** (would risk audited 3.0 state).

Editor/workspace scoping only:

1. **`.vscode/settings.json`**
   - `files.exclude` / `files.watcherExclude` / `search.exclude` for validation checkouts, `node_modules`, `dist`, `.gradle`, coverage/test-results
   - Disable Java/Gradle/Maven **import & autobuild** for this workspace
   - `java.import.exclusions` + `java.project.resourceFilters` covering checkouts, fixtures, dist, etc.

2. **`.cursorignore`** (new)
   - Excludes checkouts / `node_modules` / `dist` / other heavy generated trees from Cursor indexing without changing product ignore semantics for tests.

**Not done (by design):**

- No “fixes” to insecure/eval fixtures
- No `@ts-ignore` / eslint disables
- No version bump / publish / push / tag / deploy
- No deletion of validation checkouts (labs remain for validation scripts)

**User action to clear stale Problems UI:**

1. Reload Cursor window (`Developer: Reload Window`), or
2. `Java: Clean Java Language Server Workspace` if Java still active, and/or disable Java/Gradle extensions for this workspace,
3. Confirm Problems filters are not stuck on “entire workspace” stale entries.

---

## Final Verification

Reconfirmed after diagnosis (and editor-config-only changes — no product code edits):

| Gate         | Result             |
| ------------ | ------------------ |
| typecheck    | PASS               |
| lint         | PASS               |
| format:check | PASS               |
| tests        | **626 / 626** PASS |
| build        | PASS               |
| verify       | PASS               |

3.0 audited capabilities unchanged; release lock held.

---

## Remaining Editor-Only Diagnostics

After reload, Problems for AgentDoctor core should be **empty or near-empty**.

Any remaining large count must be re-inspected by **diagnostic source** column:

- If source = `java` / `Gradle for Java` → disable extension or clean JDT workspace (**IDE DIAGNOSTIC**)
- If source = `ts` on paths under `validation/real-world/repositories/checkouts` → confirm `files.exclude` applied / reload (**IDE DIAGNOSTIC**)
- If source = `eslint`/`ts` on `src/**` or `tests/**` → treat as **PROJECT ERROR** and fix properly (none present at audit time)

**Do not chase the number.** Chase the source.

---

## Final Status

```
PROJECT VERIFICATION = PASS

Real AgentDoctor TypeScript errors:     0
Real AgentDoctor ESLint errors:         0
Real test/build failures:               0

Large Problems count root cause:        IDE indexing of gitignored
                                        validation checkouts (+ Java/Gradle LS)

Explorer colors root cause:             GIT DECORATIONS (uncommitted 3.0 work)

Fixes:                                  workspace/editor scope only
Product code changes:                   none
Release actions:                        none
```

**Distinguish:**

| Label                       | This audit                                  |
| --------------------------- | ------------------------------------------- |
| PROJECT ERROR               | None                                        |
| IDE DIAGNOSTIC              | Validation checkouts + Java/Gradle LS       |
| GIT DECORATION              | Modified/untracked 3.0 local core & docs    |
| INTENTIONAL FIXTURE CONTENT | Eval/security/language fixtures left intact |
