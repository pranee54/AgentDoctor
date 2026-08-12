# Readiness scoring (specification)

This document freezes the **v1** deterministic readiness scoring model for AgentDoctor
([Issue #13](https://github.com/pranee54/AgentDoctor/issues/13)).

**Status:** **Implemented** (v1). Scans return `scoringAvailable: true` and a populated
`scores` object. Behavior must match this document unless a later `docs/scoring.md`
revision explicitly supersedes it.

---

## Goals

- Convert the post-dedupe finding set into an understandable **0–100** readiness score.
- Keep scoring **deterministic**, documented, explainable, and stable enough for CI.
- Ensure **serious security findings cannot be hidden** behind averages.
- Populate the reserved JSON `scores` object (overall, categories, agents).
- Make `--min-score` meaningful via exit code `1`.
- Remain **findings-first**: findings stay authoritative; the score is a CI convenience grade.

## Non-goals

- LLM / AI-assisted scoring.
- Redesigning findings, rule IDs, severities, or agent detection.
- Secret-content scanning as part of scoring.
- Treating the score as security certification.
- Scoring from repository size, file counts, timing, or popularity.

---

## Shipped v1 behavior

| Surface                       | Behavior                                                                                       |
| ----------------------------- | ---------------------------------------------------------------------------------------------- |
| `scoringAvailable`            | `true`                                                                                         |
| `scores`                      | Populated `{ overall, categories, agents }`                                                    |
| `--min-score N`               | Exit `1` if `scores.overall < N`, or if analysis is `limited` (no supported agents)            |
| `--ci`                        | Exit `1` on any **critical** finding (override with `--fail-on-severity`)                      |
| Successful scan with findings | Exit code `0` unless a policy / threshold gate fails                                           |
| Exit code `1`                 | Policy / threshold / CI gate failure                                                           |
| Terminal                      | Prints overall readiness (`N/100`, or `n/a` when analysis is limited); category/agent via JSON |
| GitHub Action                 | Report-only until policy inputs are set (`minimum-score`, `fail-on-severity`, …)               |

Production scoring uses `computeReadinessScores` (pure function of post-dedupe findings).
An internal `filesScanned`-based placeholder exists for historical unit tests only and
**must not** be used as the production algorithm.

---

## V1 scoring algorithm

Scoring runs **after** the rule engine and cross-agent dedupe, as a pure function of
the final `findings` array (and each finding’s `affectedAgents` / `category` / `severity`).

It must not re-walk the filesystem or re-run rules.

### High-level steps

1. Start from **100**.
2. For each **deduped** finding, subtract a severity-based amount (with diminishing returns
   within the same severity).
3. Compute **category** scores the same way using only findings in that category.
4. Compute **per-agent** scores from findings that list that agent in `affectedAgents`.
5. Apply **security critical caps** on `overall` only.
6. Round with `Math.round`, then clamp to `[0, 100]` as integers.

### Deterministic ordering

Before applying diminishing returns, sort findings by:

1. Severity rank (`critical` → `warning` → `info`)
2. `ruleId` (lexicographic)
3. `evidence.path` (empty string if absent)
4. Finding `id` (lexicographic)

---

## Severity weights

| Severity | Base deduction per finding |
| -------- | -------------------------- |
| critical | **35**                     |
| warning  | **10**                     |
| info     | **2**                      |

### Diminishing returns

Within the same severity, after the sort above, multiply the base deduction:

| Occurrence (nth finding of that severity) | Multiplier |
| ----------------------------------------- | ---------- |
| 1st                                       | 1.0        |
| 2nd                                       | 0.7        |
| 3rd                                       | 0.5        |
| 4th+                                      | 0.35       |

Cross-agent duplicates are already merged into one finding → they contribute **once**
to overall and category scores.

---

## Security critical caps

Caps apply to **`overall` only**, after deductions. They ensure security criticals
cannot be averaged away.

| Condition                                                               | Maximum `overall` |
| ----------------------------------------------------------------------- | ----------------- |
| ≥1 finding with `category === "security"` and `severity === "critical"` | **69**            |
| ≥2 such security critical findings                                      | **49**            |

There is **no** soft cap for security warnings in v1.

---

## Category scores

Each of `security`, `context`, `instructions`, `mcp`, `compatibility`, and `performance`
is computed independently:

```text
categoryScore = clamp(round(100 − Σ deductions for findings in that category), 0, 100)
```

Same severity weights and diminishing returns, applied **within that category only**.
Categories with zero findings score **100**.

Security caps do **not** rewrite individual category scores.

---

## Agent scores

For each of `cursor`, `claude-code`, and `codex`:

```text
agentScore = clamp(round(100 − Σ deductions for findings whose affectedAgents includes the agent), 0, 100)
```

- Same weights and diminishing returns, applied on that agent’s attributed finding list
  (deterministic sort as above).
- If no findings attribute the agent → score **100**.
- **100 means “no attributed findings,” not “agent is configured or healthy.”**

A single deduped finding that lists multiple agents deducts from **each** listed agent’s
score, but still only once for overall/category.

---

## Limited analysis behavior

When `agentSecurityAnalysis` is `limited` (no supported agent detected/configured):

- Repository-risk findings still deduct and still trigger security caps.
- Empty `affectedAgents` is expected for some findings; those findings still affect
  overall and category scores.
- Terminal readiness prints **n/a** (scores remain in JSON for repository-risk only).
- `--min-score N` / Action `minimum-score` **fail** when analysis is `limited` — an
  empty or agentless tree must not pass a CI readiness gate with a vacuous 100.

---

## CLI `--min-score` behavior

With `scoringAvailable === true` and `scores` non-null:

| Invocation                  | Behavior                                                                     |
| --------------------------- | ---------------------------------------------------------------------------- |
| No `--ci`, no `--min-score` | Exit `0` on successful scan; scores present in JSON                          |
| `--min-score N`             | Exit `1` if `scores.overall < N`, or if analysis is `limited`                |
| `--ci`                      | Exit `1` if any critical finding exists (override with `--fail-on-severity`) |
| `--ci` without other gates  | Still enforces the critical severity gate                                    |
| `--ci --min-score N`        | Enforces critical findings **and** the score threshold                       |

`N` must be a number from **0** to **100** (already validated by the CLI).

Suggested CI gate for security-oriented workflows: `--ci --min-score 70`
(fails when a security critical is present under the v1 caps).

---

## Exit codes

| Code | Meaning                                                                                     |
| ---- | ------------------------------------------------------------------------------------------- |
| `0`  | Scan completed successfully (including when findings exist, unless a score threshold fails) |
| `1`  | Score threshold failure (`--min-score`)                                                     |
| `2`  | Usage error                                                                                 |
| `3`  | Internal error                                                                              |

See [exit-codes.md](exit-codes.md).

---

## Compatibility notes

- Top-level JSON keys `scores` and `scoringAvailable` already exist; v1 **populates** them
  rather than inventing a parallel schema.
- v1 does **not** add `scoringModel`, `scoreExplanation`, or other new JSON fields.
- Explainability in v1 = this document’s formula plus the existing `findings` array.
- Enabling scoring and enforcing `--min-score` is an intentional beta behavior change
  (minor beta, for example `0.2.0-beta`), not a silent patch.
- Findings, rule IDs, and agent detection contracts are unchanged by scoring.

See [compatibility.md](compatibility.md).

---

## Determinism guarantees

Given the same AgentDoctor version and the same post-dedupe finding set:

- Scores are identical across machines and runs.
- No randomness, wall-clock, absolute paths, or LLM calls influence the result.
- Rounding and clamping rules are fixed as specified above.

---

## Out of scope (deferred to v2+)

- Additive JSON such as `scoringModel` or `scoreExplanation`
- Soft cap for security warnings
- Overall score penalty for “no agents configured” (CLI `--min-score` already fails when analysis is `limited`)
- Per-agent `not_configured` status fields
- Category-level security caps
- Programmatic threshold enforcement inside `scan()` (CLI-only for v1)
- Weight retunes without an explicit spec revision

---

## Related

- [Issue #13](https://github.com/pranee54/AgentDoctor/issues/13)
- [exit-codes.md](exit-codes.md)
- [compatibility.md](compatibility.md)
- [rules.md](rules.md)
- [ROADMAP.md](../ROADMAP.md)
