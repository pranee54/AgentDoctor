# Dashboard Product Audit — AgentDoctor 3.0.0

Generated as part of the complete dashboard productization pass.

## 1. Existing routes (hash SPA)

| Route           | Label              | UX treatment        |
| --------------- | ------------------ | ------------------- |
| `#home`         | Home               | Structured renderer |
| `#chat`         | Project Chat       | Structured renderer |
| `#dna`          | DNA                | Structured renderer |
| `#map`          | Architecture / Map | Structured renderer |
| `#graph`        | Graph              | Structured renderer |
| `#deps`         | Dependencies       | Structured renderer |
| `#search`       | Search             | Structured renderer |
| `#features`     | Features           | Structured renderer |
| `#requirements` | Requirements       | Structured renderer |
| `#health`       | Tests / Health     | Structured renderer |
| `#evidence`     | Evidence           | Structured renderer |
| `#decisions`    | Decisions          | Structured renderer |
| `#evolution`    | Evolution          | Structured renderer |
| `#security`     | Security           | Structured renderer |
| `#forensic`     | Forensics          | Structured renderer |
| `#incident`     | Incidents          | Structured renderer |
| `#doctors`      | Doctors            | Structured renderer |
| `#whatif`       | What-if            | Structured renderer |
| `#memory`       | Memory             | Structured renderer |
| `#twin`         | Digital Twin       | Structured renderer |
| `#infra`        | Infrastructure     | Structured renderer |
| `#learn`        | Learn              | Structured renderer |
| `#system`       | System & Technical | Structured renderer |

Application shell: top bar + grouped sidebar + main content + command palette (`⌘K` / `Ctrl+K`).

## 2. API endpoints consumed

Dashboard remains read-only except `POST /api/chat` (ask-only; no repo writes).

- `/api/api-doctor`
- `/api/brain`
- `/api/chat`
- `/api/database`
- `/api/decisions`
- `/api/deps`
- `/api/dna`
- `/api/events`
- `/api/evolution`
- `/api/features`
- `/api/forensic`
- `/api/health`
- `/api/health-code`
- `/api/incident`
- `/api/infra`
- `/api/map`
- `/api/memory`
- `/api/meta`
- `/api/platform`
- `/api/requirements`
- `/api/scan`
- `/api/search`
- `/api/security`
- `/api/status`
- `/api/twin`
- `/api/v2/c4`
- `/api/v2/graph`
- `/api/v2/health`
- `/api/v2/knowledge`
- `/api/v2/projects`
- `/api/v2/workspaces`
- `/api/what-if`

Also used by UI:

- `POST /api/chat`
- `/api/v2/graph` (Graph page)
- `/api/api-doctor`, `/api/database`, `/api/events` (Doctors)
- `/api/scan`, `/api/brain` (Home + Evidence)

## 3. Page purpose (product)

| Area                                                     | Purpose                                                           |
| -------------------------------------------------------- | ----------------------------------------------------------------- |
| Home                                                     | Project Command Center — status, key areas, findings, next action |
| Chat                                                     | Project-aware Q&A with truth/evidence panel                       |
| DNA / Map / Graph / Deps / Search / Features             | Understand project shape                                          |
| Requirements / Health / Evidence / Decisions / Evolution | Engineering assurance                                             |
| Security / Forensics / Incidents / Doctors               | Security & diagnostics                                            |
| What-if / Memory / Twin                                  | Intelligence with uncertainty labels                              |
| Infra                                                    | Local infra signals; live cloud EXTERNAL                          |
| Learn                                                    | Student progressive disclosure over same evidence                 |
| System                                                   | Safety posture, adapters, raw technical details                   |

## 4. Old UX problems addressed

- Long horizontal equal-weight nav → grouped collapsible sidebar + top bar
- Home as JSON dump → Project Command Center with progressive enrichment
- Raw payloads as primary UI → structured sections + expandable Technical Details
- Weak project context → persistent project chip (name + stack + git)
- No command search → palette for pages + project search handoff
- Missing empty/loading/error language → shared primitives on all routes

## 5. New UX

- Distinctive dark engineering shell (calm, dense, restrained semantics)
- Consistent page template: header → context → primary → evidence → technical details
- Truth badges (`VERIFIED` / `INFERRED` / `UNKNOWN` / `EXTERNAL`) preserved
- Tables + filters for large lists (deps, findings); bounded samples for performance
- Fetch timeouts so heavy analyzers cannot hang the SPA indefinitely

## 6. Components created / standardized

In embedded CSS + client primitives (not a separate React kit):

- AppShell, Sidebar, TopBar, PageHeader, Project chip
- Section, Card, Status/Truth badges, Metric-style cards
- DataTable (`.table-wrap` + `.data`), Empty/Loading/Error states
- Evidence/Technical Details (`<details>`), Code/pre blocks
- Command palette, Drawer backdrop (mobile), Chat layout

## 7. Components reused

- Existing dashboard server (`src/dashboard/server.ts`) and all product APIs
- `PACKAGE_VERSION` / `status.ops.version` as sole version source
- Chat POST contract unchanged

## 8. Backend contracts used

Unchanged HTTP contracts. UI maps nullable/optional fields to Unknown / Not analyzed / Not available / EXTERNAL copy. No fabricated coverage %, scores, or live runtime metrics.

## 9–11. Empty / loading / error states

- Empty: explained missing data + why + next step (`emptyState`)
- Loading: skeleton + label (`loadingState`); Home progressive paint
- Error: human-readable failure (`errorState`); stack traces not primary

## 12. Responsive verification

CSS breakpoints (~980px): sidebar becomes drawer; top bar keeps Search; single-column grids; table horizontal scroll via `.table-wrap`.

## 13. Accessibility

- Landmark regions (`banner`, `main`, `nav`)
- Focusable controls; palette `role="dialog"` + `aria-modal`
- Collapse/menu buttons labeled; graph SVG `aria-label`
- Keyboard: `⌘/Ctrl+K`, `Escape` closes palette

## 14. Security verification

- Dashboard still loopback-default, read-only except ask-only chat
- No UI path to bypass path safety / approvals / policy
- Secret findings shown redacted (values stripped in Technical Details copy)
- Cross-project isolation unchanged (local single-repo workspace)
- `?user=` still documented as non-auth local hint on System

## 15. Performance considerations

- Client-side cache (`state.cache`) for route payloads
- Bounded table samples (e.g. deps 100, findings 50)
- Graph SVG samples nodes by type
- `fetchJson` AbortController timeouts (default 25s; Home heavies 15–20s)
- Progressive Home: paint before/while heavy analyzers run

## 16. Remaining limitations

- No multi-project switcher backend — local single-repo only; chip shows active root context
- Graph is a readable sample canvas, not a full interactive graph engine
- Coverage not shown unless API provides it (never fabricated as 0%)
- Live K8s/APM/runtime remain EXTERNAL
- Neural search/memory remain EXTERNAL where contracts say so
- AI Agent full plan/approve/execute loop is CLI/MCP; dashboard Chat is ask-only
- Changes-as-diff workspace not a separate route (findings/evidence/evolution cover available signals)
- Large-repo `/api/scan` / `/api/security` can still be slow; UI times out rather than hanging forever
- Feature analysis is **deferred** (opt-in Run analysis) because `/api/features` can block the single-threaded dashboard server on very large trees
- Visual QA on tablet/phone should be re-checked when deploying to other hosts

## Implementation files

- `src/dashboard/page.ts` — HTML AppShell assembler
- `src/dashboard/ui/styles.ts` — design tokens + layout CSS
- `src/dashboard/ui/client.ts` — SPA navigation + renderers
- `src/dashboard/server.ts` — unchanged API surface (import `htmlPage`)

## Verification notes

- `tsc --noEmit`, `npm run build`, `npm run lint`, `npm run format:check`
- `tests/unit/product/dashboard-product-routes.test.ts` + product/dashboard MCP suites
- Manual browser smoke against `http://127.0.0.1:3847/`

## Browser verification (local)

Ran against `http://127.0.0.1:3847/` after rebuild:

- All **23** hash routes rendered expected page titles with **0 mismatches**
- Features route uses deferred **Run analysis** (no auto-blocking fetch)
- No horizontal page overflow observed in smoke pass
- Version chip `v3.0.0` from `PACKAGE_VERSION` / status
- Command palette opens; Escape closes
- Home progressive enrichment (context → health/deps → scan/security)

## Final UX QA

Date: 2026-09-27 (local polish pass)

### Routes visually audited

All **23** hash routes opened in browser after polish rebuild:

`home` `chat` `dna` `map` `graph` `deps` `search` `features` `requirements` `health` `evidence` `decisions` `evolution` `security` `forensic` `incident` `doctors` `whatif` `memory` `twin` `infra` `learn` `system`

Title assertion: **0 mismatches**. Active nav + page headers verified via automation.

### Visual / content improvements

- Shorter sidebar labels: Map, Health, System
- Page descriptions rewritten to answer “what can I do here?”
- Empty/error language standardized (role=status / role=alert); less internal jargon (`payload`, `marker(s)`, scan-API notes)
- Home microcopy tightened; progressive loading labels clarified
- Chat: explicit **Ask-only** banner (no edit/shell implication)
- Features: professional on-demand analysis empty state + Run button
- What-if: Observed / Inferred / Predicted uncertainty strip
- Twin / Infra: deterministic snapshot vs EXTERNAL live runtime wording
- Learn: study path + viva prep sections
- Graph: sample-canvas scope note (not a full graph engine)
- Top bar: Local · Read-only status chip
- Command palette: ArrowUp/Down + Enter keyboard navigation
- Shared CSS: empty/error polish, ask-banner, uncertainty grid, responsive 1280/1024/768/390

### Responsive sizes tested

| Width | Result                                                             |
| ----- | ------------------------------------------------------------------ |
| 1440  | Desktop shell; no overflow; status visible                         |
| 1280  | Content full width rule applied; no overflow (CSS + desktop smoke) |
| 1024  | Sidebar still docked (>980); chat two-column; no overflow          |
| 768   | Mobile nav visible; status chip hidden; drawer mode; no overflow   |
| 390   | Mobile nav; chat ask-banner; drawer opens; no overflow             |
| 360   | Mobile nav; deps readable; no overflow                             |

### Accessibility checks

- Landmarks: `banner`, `main`, `nav`, palette `dialog`/`aria-modal`
- Focus-visible outline retained
- Empty `role=status`, error `role=alert`
- Chat input label; filter `aria-label`s
- Palette keyboard: ⌘/Ctrl+K, Escape, arrows, Enter
- Mobile menu button labeled

### Browser console

No page `error` / `unhandledrejection` events captured during the 23-route smoke after polish.

### Performance observations

- Home still staggers brain → health/deps → scan/security
- Features remains deferred (opt-in) to avoid blocking the Node dashboard server
- Route fetch timeouts + load generation guards prevent stale paints
- Large deps/security lists remain bounded + filterable

### Security / truth

- Ask-only chat messaging reinforced
- Secret values still redacted in Security technical view
- Truth badges retained; predictions not presented as verified facts
- No API/contract/security control changes

### Remaining limitations

- Graph is still a sample canvas (no full zoom engine)
- No multi-project switcher (local single-repo)
- Heavy analyzers on very large trees remain slow; UI degrades with timeouts + deferred Features
- Neural search/memory and live runtime remain EXTERNAL where contracts say so
