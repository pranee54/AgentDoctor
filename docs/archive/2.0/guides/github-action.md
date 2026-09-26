# AgentDoctor — GitHub Action

Use AgentDoctor Safety in CI to scan repositories and apply policy gates on pull requests or mainline builds.

**Action:** `pranee54/AgentDoctor@v2.0.0`  
**Default npm pin:** `2.0.0` (`action.yml` input `version`)  
**Marketplace:** confirm listing status in the GitHub UI if you need Marketplace discovery — this guide does not claim Marketplace publication.

Canonical metadata: [`action.yml`](../../../action.yml) at the repository root.

---

## Minimal example

```yaml
name: AgentDoctor
on:
  pull_request:
  push:
    branches: [main]

jobs:
  agentdoctor:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: pranee54/AgentDoctor@v2.0.0
        with:
          path: .
          version: "2.0.0"
          fail-on-severity: critical
```

Report-only (no policy gates) — omit `minimum-score` / `fail-on-*` inputs; the Action stays non-failing until gates are configured.

---

## Inputs

| Input              | Default                            | Description                                                                       |
| ------------------ | ---------------------------------- | --------------------------------------------------------------------------------- |
| `path`             | `.`                                | Repository-relative directory to scan                                             |
| `version`          | `2.0.0`                            | Published npm version / `latest` / `beta`, or `workspace` for `dist/cli/index.js` |
| `output-file`      | `agentdoctor-report.json`          | JSON report path (when `json-output` is true)                                     |
| `minimum-score`    | _(empty)_                          | Fail when overall score &lt; integer 0–100                                        |
| `fail-on-severity` | _(empty)_                          | `critical` \| `warning` \| `info`                                                 |
| `fail-on-rule`     | _(empty)_                          | Comma-separated rule IDs                                                          |
| `verify-baseline`  | _(empty)_                          | Prior scan JSON; switches to `agentdoctor verify`                                 |
| `fail-on-new`      | _(default true when baseline set)_ | Fail on new findings vs baseline                                                  |
| `json-output`      | `true`                             | Write JSON report                                                                 |
| `summary`          | `false`                            | GitHub Actions step summary                                                       |
| `annotations`      | `false`                            | Finding annotations                                                               |

## Outputs

| Output          | Description                                                                  |
| --------------- | ---------------------------------------------------------------------------- |
| `report-path`   | Absolute path to JSON report (empty if `json-output` is false)               |
| `outcome`       | `success` \| `policy-failure` \| `configuration-error` \| `internal-failure` |
| `overall-score` | Overall readiness score when available                                       |

## Permissions

Typical: `contents: read`. The Action does not post PR comments or open issues.

## Workspace mode (this repository)

For CI against the checked-out build (no npm download):

```yaml
- run: npm ci && npm run build
- uses: ./
  with:
    version: workspace
    path: .
```

Requires `dist/cli/index.js` from `npm run build`.

## Verify against a baseline

```yaml
- uses: pranee54/AgentDoctor@v2.0.0
  with:
    version: "2.0.0"
    verify-baseline: agentdoctor-baseline.json
    fail-on-new: true
```

## Limitations

- Action covers **Safety** scan / verify gates — not Brain MCP, graph, or dashboard.
- Paths must stay inside `GITHUB_WORKSPACE`; symlinks that escape are rejected.
- Marketplace discovery is separate from Action availability via `uses: pranee54/AgentDoctor@…`.
