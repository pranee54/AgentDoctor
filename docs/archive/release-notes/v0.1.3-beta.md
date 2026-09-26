# AgentDoctor v0.1.3-beta

Backward-compatible security-signal and detection-quality patch from real-world repository audits.

## Why the security result changed

Previously, repositories with no supported coding-agent configuration could show an unqualified clean findings result even when high-risk files such as `.env` were present. That was misleading: agent-specific exposure checks had nothing to attach to, so the scan looked “clean” rather than limited.

v0.1.3-beta distinguishes:

- **Repository risk** — high-risk material present in the tree (for example a runtime `.env`). Findings may use an empty `affectedAgents` list when no agent exposure claim is supported.
- **Agent exposure** — evidence that a configured/detected agent may read the material. Agents are listed in `affectedAgents` only when that claim is supported.

JSON also includes additive `agentSecurityAnalysis`: `full` or `limited`. Terminal output states when agent-specific security exposure checks are limited.

Environment templates (`.env.example`, `.env.sample`, `.env.template`, `.env.dist`) are informational. Common backup names (`.env_backup`, `.env_old`, `.env_local`) are warnings. Contents are never inspected or printed.

## Detection improvements

- Nested FastAPI: dependency evidence plus `app/main.py` / `*/app/main.py`
- Nested React: dependencies from discovered project `package.json` files
- Django: no longer inferred from arbitrary nested `settings.py` alone
- Poetry: requires `poetry.lock` and/or `[tool.poetry]`, not bare `pyproject.toml`
- Multi-project terminal summaries list languages, frameworks, and package managers

## Compatibility

- No migration required
- No public API breaking changes
- No JSON schema breaking changes (additive fields only)
- Rule IDs unchanged
- Exit-code behavior unchanged
- Scoring remains unavailable
- Auto-fix remains deferred

## Testing

122 automated tests passing. Real-world regression families covered include ProxyShield path handling, Flutter/Laravel multi-project detection, and Excepta FastAPI/React/Flutter.

## Installation

```bash
npx @praneeth_54/agentdoctor@0.1.3-beta
```

Global:

```bash
npm install -g @praneeth_54/agentdoctor@0.1.3-beta
agentdoctor
```

CLI binary remains `agentdoctor`.
