# Good first issues

Suggested starter contributions for AgentDoctor. Prefer small, testable PRs.
These are ideas — create GitHub issues from them and label `good first issue`.

Do **not** treat major architecture, scoring, or auto-fix as first issues.

## Documentation

1. **Add a “reading a finding” walkthrough** — short doc showing one JSON finding field-by-field using a fixture, without inventing fields.
2. **Expand MCP examples in docs** — safe, anonymized `.mcp.json` shapes and what AgentDoctor flags vs ignores.
3. **Improve `explain` examples** — document 3–5 popular rule IDs with expected explain output.

## Fixtures and detection

4. **Framework detection fixture pack** — minimal fixtures for Nest / Nuxt / Svelte already supported by detectors but lightly covered in integration scans.
5. **Ignore-pattern edge cases** — nested `.cursorignore` vs `.gitignore` interactions with `context/generated-directory` (extend existing generated-* fixtures).
6. **Env template naming matrix** — fixture covering `.env.dist` / `.env.template` alongside runtime `.env` for documentation screenshots.

## Terminal / UX (docs-driven, no behavior change without tests)

7. **Document multi-project terminal layout** — screenshot + prose for Languages / Frameworks / Package managers lines (Excepta-style).
8. **CI recipe gist** — example GitHub Actions workflow that runs `npx @praneeth_54/agentdoctor --json` and uploads the artifact (no fake score gate).

## Research (write-up first)

9. **Adapter research: Windsurf / Gemini CLI / Aider** — inventory official project config paths; open an issue with sources; do not implement until reviewed.
10. **Rule documentation gaps** — audit `docs/rules.md` against `src/core/rules/registry.ts` and file missing sections as docs PRs.

## Testing quality

11. **Performance smoke benchmark notes** — document approximate scan times on fixtures (local only); no CI flake thresholds without agreement.
12. **False-positive corpus** — add anonymized “should not flag” fixtures for common noisy paths (with tests).

## How to pick one

1. Comment on the issue you want.
2. Keep the PR focused.
3. Add or update tests for behavior changes.
4. Update docs when user-facing text changes.
5. Never commit real secrets.
