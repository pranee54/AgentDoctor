# Rules reference

Stable rule IDs are part of AgentDoctor’s public interface. Do not rename casually.

## Severity policy

| Severity     | When to use                                                                                                                               |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **critical** | Strong evidence of a meaningful security risk (e.g. credential-like files without exclusion, broad MCP filesystem scope). Used sparingly. |
| **warning**  | Likely configuration / security / instruction issue worth fixing.                                                                         |
| **info**     | Optimization opportunity, possible intentional duplication, or low-confidence concern.                                                    |

Precision over quantity. False security findings are worse than missing low-value ones.

## Thresholds

Documented in `src/core/rules/thresholds.ts`:

| Threshold                 | Value                      |
| ------------------------- | -------------------------- |
| Instruction file info     | > 16 KB                    |
| Instruction file warning  | > 32 KB                    |
| Large log/dump            | ≥ 256 KB                   |
| Duplicate content minimum | ≥ 80 normalized characters |

Exact token savings are never claimed.

---

## Security

### `security/env-file-exposure`

- **Severity:** critical (runtime), warning (backup), info (template)
- **Detects:** repository `.env` / `.env.*` files, plus conservative backup names such as `.env_backup`
- **Semantics:** repository risk is reported even when no supported agent is configured (`affectedAgents` empty); agent exposure is asserted only for configured/detected agents without a clear exclusion
- **Templates:** `.env.example`, `.env.sample`, `.env.template`, `.env.dist` are informational (filename classification only)
- **Why:** Credentials may enter model context when agents can read the file; tracked/shared env files remain high-risk repository material either way
- **Agents:** Cursor only if not covered by `.cursorignore` / `.gitignore` / documented default `.env*` ignore; Claude Code unless a Read deny exists; Codex unless a filesystem deny exists in `.codex/config.toml`
- **False positives:** Cursor’s documented default `.env*` ignore means Cursor is often not listed for agent exposure
- **Fixability:** review

### `security/private-key-file`

- **Severity:** critical
- **Detects:** High-confidence private key / credential filenames (`id_rsa`, `*.pem` / `*.der` excluding obvious cert names, `credentials.json`, `service-account*.json`, etc.)
- **Why:** Credential material in the tree is high risk
- **Contents:** Never inspected or printed
- **Fixability:** manual

### `security/claude-bypass-permissions`

- **Severity:** warning
- **Detects:** Claude Code `defaultMode: "bypassPermissions"` in project settings
- **Source:** [Claude Code permissions docs](https://code.claude.com/docs/en/permissions)
- **Fixability:** review

### `security/mcp-broad-filesystem`

- **Severity:** critical
- **Detects:** MCP filesystem-related path args of `/`, `~`, `$HOME`, or absolute paths outside the repo
- **Does not:** follow or read those paths
- **Fixability:** review

---

## Context

### `context/large-instruction-file`

- **Severity:** info (>16KB) / warning (>32KB)
- **Detects:** Large agent instruction files
- **Fixability:** review

### `context/large-log-file`

- **Severity:** info
- **Detects:** Large `*.log` / dump-like files not already ignored (including files larger than the content-read size limit; size is taken from metadata without reading contents)
- **Fixability:** safe

### `context/generated-directory`

- **Severity:** info
- **Detects:** Common generated directories with exact repository-relative evidence (e.g. `mobile-apps/build`) when no matching ignore pattern applies
- **Ignores:** Root and nested `.gitignore` / `.cursorignore`, including `build/` and `**/build/`; Claude Code `permissions.deny` Read rules (`Read(./path/**)`); Codex filesystem deny keys in `.codex/config.toml`
- **Fix:** `agentdoctor fix` can append `.cursorignore` patterns, Claude Code Read deny rules, and/or Codex filesystem deny keys
- **Note:** `vendor/` only flagged outside PHP/Composer
- **Fixability:** safe

---

## Instructions

### `instructions/empty-instructions`

- **Severity:** warning
- **Detects:** Empty instruction files
- **Dedupes** across Cursor/Codex for shared `AGENTS.md`
- **Fixability:** review

### `instructions/duplicate-content`

- **Severity:** info
- **Detects:** Exact normalized duplicate instruction bodies (≥80 chars)
- **Note:** Duplication can be intentional for cross-agent compatibility
- **Fixability:** review

### `instructions/missing-path-reference`

- **Severity:** warning
- **Detects:** Conservative markdown-link / backtick local paths that do not exist (or escape the repo)
- **Resolution:** `./` and `../` resolve from the instruction file directory; other candidates resolve from the repository root
- **Non-paths:** CSS-like selectors (`.content`), CLI flags (`--verbose`), spaced commands, Go/npm module hosts (`github.com/…`), scoped packages (`@scope/pkg`), Go stdlib imports (`io/ioutil`), globs (`**/*`), code tokens (`try/finally`), and bare build roots (`dist/`) are ignored
- **Fixability:** manual

---

## MCP

Official project-level formats verified:

| Agent       | File                                   | Docs                                    |
| ----------- | -------------------------------------- | --------------------------------------- |
| Cursor      | `.cursor/mcp.json`                     | Cursor MCP project config               |
| Claude Code | `.mcp.json`                            | https://code.claude.com/docs/en/mcp     |
| Codex       | `.codex/config.toml` `[mcp_servers.*]` | https://developers.openai.com/codex/mcp |

### `mcp/malformed-config`

- **Severity:** warning
- **Detects:** Unreadable / invalid MCP JSON
- **Fixability:** manual

### `mcp/duplicate-server`

- **Severity:** info
- **Detects:** Same server name repeated for one agent
- **Fixability:** review

Environment variable **values** are never stored — only key names when present.

## Related docs

- [Documentation index](README.md)
- [Architecture](architecture.md)
- [Exit codes](exit-codes.md)
