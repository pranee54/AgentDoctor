# AgentDoctor 2.0 — npm packaging decision

## Question

How should npm consumers of `@praneeth_54/agentdoctor` discover 2.0 features and limitations?

## Options

### Option A — Curated docs directory inside the npm package

Add something like `docs/2.0/overview/` + guides to `package.json#files`.

**Pros**

- Offline / npm-only users get limitations without GitHub
- Aligns pack contents with product honesty

**Cons**

- Increases tarball size (current pack ~273 kB / 1.1 MB unpacked for `dist` alone)
- Full audit/report set is large and churn-heavy; easy to ship stale “final” wording
- Duplicate maintenance: GitHub docs vs packed subset can diverge

### Option B — Keep detailed reports on GitHub; make packed README complete

Ship limitations, capability labels, CLI surfaces, and absolute GitHub links in the **packed README**; keep deep audits under `docs/2.0/` in the repository only.

**Pros**

- npm pack stays lean (preferred for CLI installs)
- Single source of truth for deep reports in git
- README is always present in the tarball today
- Matches current `files: ["dist","README.md","LICENSE","CHANGELOG.md"]`

**Cons**

- Offline users without GitHub need the README to be self-sufficient
- Deep threat-model / audit detail requires network to open GitHub links

## Recommendation

**Choose Option B for the 2.0.0 cut.**

### Reasoning

1. **Size / UX:** AgentDoctor is primarily a CLI + MCP binary. Consumers benefit more from a clear README than from megabytes of audit markdown in every install.
2. **Honesty without bloat:** The rewritten README already embeds capability classifications and the critical limitations list — enough for safe adoption.
3. **Drift control:** Audits (RC, deep validation, baselines) change often during prep; packing them invites stale “final report” claims inside npm.
4. **Compatibility with current pack:** Option B requires no `files` expansion for the first 2.0.0 publish.

### Optional later enhancement (not required to start the cut)

If npm-only offline disclosure becomes a hard requirement, add a **thin** curated file only, e.g. `docs/LIMITATIONS.md` copied/synced from `docs/2.0/overview/known-limitations.md`, not the full audits tree (hybrid A-lite).

## Decision status

| Item                            | Status                                                      |
| ------------------------------- | ----------------------------------------------------------- |
| Recommended option              | **B**                                                       |
| Applied in this prep            | README rewritten with limitations + GitHub `docs/2.0` links |
| `package.json#files` changed    | **No** (intentional)                                        |
| Final publish-time confirmation | Human reviewer should reaffirm Option B or A-lite           |

## Evidence

- RC audit: pack contains only `dist`, README, LICENSE, CHANGELOG
- Clean install smoke: `AGENTDOCTOR_2.0_*.md` absent from `node_modules` package root
