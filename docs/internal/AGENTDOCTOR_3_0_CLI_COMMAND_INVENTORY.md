# AGENTDOCTOR 3.0 — CLI COMMAND INVENTORY

Generated: 2026-09-27T06:15:56.219Z
Source: `dist/cli/index.js --help` recursive one-level + `src/cli/program.ts`
Top-level commands: **76**
Leaves (incl. one-level subs): **123**

| Leaf                      | Path arg | Traverses | Writes | Agent tools | Help ok | Broad-root gate                       | Test coverage        |
| ------------------------- | -------- | --------- | ------ | ----------- | ------- | ------------------------------------- | -------------------- |
| `scan`                    | Y        | Y         | Y      | Y           | 0       | resolveCliProjectRoot / classifyBroad | help+security matrix |
| `fix`                     | Y        | -         | Y      | -           | 0       | resolveCliProjectRoot / classifyBroad | help+security matrix |
| `fix-undo`                | Y        | -         | Y      | -           | 0       | N/A or leaf-specific                  | help only            |
| `fix-history`             | Y        | -         | Y      | -           | 0       | N/A or leaf-specific                  | help only            |
| `brain init`              | Y        | Y         | -      | -           | 0       | N/A or leaf-specific                  | help+security matrix |
| `brain status`            | Y        | Y         | -      | -           | 0       | resolveCliProjectRoot / classifyBroad | help+security matrix |
| `brain inspect`           | Y        | Y         | -      | -           | 0       | N/A or leaf-specific                  | help+security matrix |
| `brain rebuild`           | Y        | Y         | Y      | -           | 0       | N/A or leaf-specific                  | help+security matrix |
| `brain history`           | Y        | Y         | -      | -           | 0       | N/A or leaf-specific                  | help+security matrix |
| `brain search`            | Y        | Y         | -      | -           | 0       | N/A or leaf-specific                  | help+security matrix |
| `brain export`            | Y        | Y         | -      | -           | 0       | N/A or leaf-specific                  | help+security matrix |
| `brain import`            | Y        | Y         | Y      | -           | 0       | N/A or leaf-specific                  | help+security matrix |
| `brain snapshot`          | Y        | Y         | Y      | -           | 0       | N/A or leaf-specific                  | help+security matrix |
| `brain update`            | Y        | Y         | Y      | -           | 0       | N/A or leaf-specific                  | help+security matrix |
| `brain review`            | Y        | Y         | -      | -           | 0       | N/A or leaf-specific                  | help+security matrix |
| `brain proposals`         | Y        | Y         | -      | -           | 0       | N/A or leaf-specific                  | help+security matrix |
| `init`                    | Y        | Y         | -      | -           | 0       | N/A or leaf-specific                  | help only            |
| `graph build`             | Y        | Y         | -      | -           | 0       | N/A or leaf-specific                  | help+security matrix |
| `graph update`            | Y        | Y         | Y      | -           | 0       | N/A or leaf-specific                  | help+security matrix |
| `graph rebuild`           | Y        | Y         | Y      | -           | 0       | N/A or leaf-specific                  | help+security matrix |
| `graph status`            | Y        | Y         | -      | -           | 0       | resolveCliProjectRoot / classifyBroad | help+security matrix |
| `health`                  | Y        | -         | -      | -           | 0       | N/A or leaf-specific                  | help only            |
| `impact`                  | Y        | -         | -      | -           | 0       | N/A or leaf-specific                  | help only            |
| `test-impact`             | Y        | -         | -      | -           | 0       | N/A or leaf-specific                  | help only            |
| `refactor-impact`         | Y        | -         | -      | -           | 0       | N/A or leaf-specific                  | help only            |
| `session`                 | Y        | -         | -      | Y           | 0       | N/A or leaf-specific                  | help only            |
| `report`                  | Y        | Y         | -      | -           | 0       | N/A or leaf-specific                  | help only            |
| `c4`                      | Y        | Y         | -      | -           | 0       | N/A or leaf-specific                  | help only            |
| `architecture init`       | Y        | -         | Y      | -           | 0       | N/A or leaf-specific                  | help only            |
| `architecture analyze`    | Y        | -         | -      | -           | 0       | N/A or leaf-specific                  | help only            |
| `architecture check`      | Y        | -         | Y      | -           | 0       | N/A or leaf-specific                  | help only            |
| `architecture explain`    | Y        | -         | -      | -           | 0       | N/A or leaf-specific                  | help only            |
| `knowledge`               | Y        | -         | -      | -           | 0       | N/A or leaf-specific                  | help only            |
| `knowledge-create`        | Y        | -         | Y      | -           | 0       | N/A or leaf-specific                  | help only            |
| `knowledge-approve`       | Y        | -         | Y      | Y           | 0       | N/A or leaf-specific                  | help only            |
| `enforce`                 | Y        | -         | Y      | -           | 0       | N/A or leaf-specific                  | help only            |
| `team-register`           | Y        | -         | -      | -           | 0       | N/A or leaf-specific                  | help only            |
| `team-login`              | Y        | -         | -      | -           | 0       | N/A or leaf-specific                  | help only            |
| `change analyze`          | Y        | Y         | -      | -           | 0       | N/A or leaf-specific                  | help only            |
| `change verify`           | Y        | -         | -      | -           | 0       | N/A or leaf-specific                  | help only            |
| `change explain`          | Y        | -         | -      | -           | 0       | N/A or leaf-specific                  | help only            |
| `change diff`             | Y        | -         | -      | -           | 0       | N/A or leaf-specific                  | help only            |
| `change status`           | Y        | -         | -      | -           | 0       | N/A or leaf-specific                  | help only            |
| `evidence inspect`        | Y        | -         | -      | -           | 0       | N/A or leaf-specific                  | help only            |
| `evidence verify`         | Y        | -         | -      | -           | 0       | N/A or leaf-specific                  | help only            |
| `proof build`             | Y        | -         | -      | -           | 0       | N/A or leaf-specific                  | help only            |
| `proof inspect`           | Y        | -         | -      | -           | 0       | N/A or leaf-specific                  | help only            |
| `proof explain`           | Y        | -         | -      | -           | 0       | N/A or leaf-specific                  | help only            |
| `proof verify`            | Y        | -         | -      | -           | 0       | N/A or leaf-specific                  | help only            |
| `proof export`            | Y        | -         | -      | -           | 0       | N/A or leaf-specific                  | help only            |
| `policy check`            | Y        | -         | -      | -           | 0       | N/A or leaf-specific                  | help only            |
| `policy explain`          | Y        | -         | -      | -           | 0       | N/A or leaf-specific                  | help only            |
| `policy enforce`          | Y        | -         | Y      | -           | 0       | N/A or leaf-specific                  | help only            |
| `run explain`             | Y        | -         | -      | -           | 0       | N/A or leaf-specific                  | help only            |
| `workspace init`          | Y        | Y         | Y      | -           | 0       | N/A or leaf-specific                  | help only            |
| `workspace add`           | Y        | Y         | -      | -           | 0       | N/A or leaf-specific                  | help only            |
| `workspace list`          | Y        | Y         | -      | -           | 0       | N/A or leaf-specific                  | help only            |
| `workspace status`        | Y        | Y         | -      | -           | 0       | N/A or leaf-specific                  | help only            |
| `workspace remove`        | Y        | Y         | Y      | -           | 0       | N/A or leaf-specific                  | help only            |
| `changes`                 | Y        | Y         | -      | -           | 0       | N/A or leaf-specific                  | help only            |
| `context-health`          | Y        | -         | -      | -           | 0       | N/A or leaf-specific                  | help only            |
| `secrets`                 | Y        | Y         | -      | -           | 0       | resolveCliProjectRoot / classifyBroad | help+security matrix |
| `baseline save`           | Y        | Y         | Y      | -           | 0       | N/A or leaf-specific                  | help only            |
| `baseline list`           | Y        | -         | -      | -           | 0       | N/A or leaf-specific                  | help only            |
| `baseline diff`           | Y        | Y         | -      | -           | 0       | N/A or leaf-specific                  | help only            |
| `baseline delete`         | Y        | -         | Y      | -           | 0       | N/A or leaf-specific                  | help only            |
| `baseline trends`         | Y        | -         | -      | -           | 0       | N/A or leaf-specific                  | help only            |
| `packages`                | Y        | Y         | -      | -           | 0       | resolveCliProjectRoot / classifyBroad | help+security matrix |
| `pr-review`               | Y        | -         | -      | -           | 0       | N/A or leaf-specific                  | help only            |
| `dashboard`               | Y        | -         | -      | -           | 0       | N/A or leaf-specific                  | help only            |
| `plugins`                 | Y        | -         | Y      | -           | 0       | N/A or leaf-specific                  | help only            |
| `local-ai`                | -        | -         | -      | -           | 0       | N/A or leaf-specific                  | help only            |
| `chat`                    | Y        | -         | -      | -           | 0       | N/A or leaf-specific                  | help only            |
| `ask`                     | Y        | -         | -      | -           | 0       | resolveCliProjectRoot / classifyBroad | help+security matrix |
| `plan`                    | Y        | -         | Y      | Y           | 0       | N/A or leaf-specific                  | help only            |
| `agent`                   | Y        | -         | Y      | Y           | 0       | N/A or leaf-specific                  | help only            |
| `learn`                   | Y        | -         | Y      | Y           | 0       | N/A or leaf-specific                  | help only            |
| `platform scan`           | Y        | Y         | Y      | -           | 0       | N/A or leaf-specific                  | help only            |
| `platform graph`          | Y        | Y         | -      | -           | 0       | N/A or leaf-specific                  | help only            |
| `platform test-impact`    | Y        | -         | -      | -           | 0       | N/A or leaf-specific                  | help only            |
| `platform policy-check`   | Y        | -         | -      | Y           | 0       | N/A or leaf-specific                  | help only            |
| `platform firewall-check` | Y        | -         | -      | Y           | 0       | N/A or leaf-specific                  | help only            |
| `platform session-list`   | Y        | -         | -      | Y           | 0       | N/A or leaf-specific                  | help only            |
| `platform session-show`   | Y        | -         | -      | Y           | 0       | N/A or leaf-specific                  | help only            |
| `platform demo-session`   | Y        | -         | -      | -           | 0       | N/A or leaf-specific                  | help only            |
| `platform provenance`     | Y        | -         | -      | -           | 0       | N/A or leaf-specific                  | help only            |
| `platform context`        | Y        | -         | -      | -           | 0       | N/A or leaf-specific                  | help only            |
| `platform refactor`       | Y        | -         | Y      | -           | 0       | N/A or leaf-specific                  | help only            |
| `platform time-machine`   | Y        | -         | -      | -           | 0       | N/A or leaf-specific                  | help only            |
| `verify`                  | Y        | Y         | Y      | -           | 0       | resolveCliProjectRoot / classifyBroad | help+security matrix |
| `explain`                 | -        | -         | -      | -           | 0       | N/A or leaf-specific                  | help only            |
| `start`                   | Y        | Y         | Y      | -           | 0       | resolveCliProjectRoot / classifyBroad | help+security matrix |
| `dna`                     | Y        | Y         | Y      | -           | 0       | resolveCliProjectRoot / classifyBroad | help+security matrix |
| `requirements`            | Y        | -         | -      | -           | 0       | resolveCliProjectRoot / classifyBroad | help+security matrix |
| `api`                     | Y        | Y         | -      | -           | 0       | N/A or leaf-specific                  | help only            |
| `database`                | Y        | Y         | -      | -           | 0       | N/A or leaf-specific                  | help only            |
| `events`                  | Y        | -         | -      | -           | 0       | N/A or leaf-specific                  | help only            |
| `dependency`              | Y        | Y         | -      | -           | 0       | N/A or leaf-specific                  | help only            |
| `deps`                    | Y        | -         | -      | -           | 0       | resolveCliProjectRoot / classifyBroad | help+security matrix |
| `health-code`             | Y        | -         | -      | -           | 0       | N/A or leaf-specific                  | help only            |
| `code-health`             | Y        | -         | -      | -           | 0       | N/A or leaf-specific                  | help only            |
| `map`                     | Y        | Y         | -      | -           | 0       | resolveCliProjectRoot / classifyBroad | help+security matrix |
| `decisions`               | Y        | -         | -      | -           | 0       | resolveCliProjectRoot / classifyBroad | help+security matrix |
| `forensic`                | Y        | Y         | -      | -           | 0       | resolveCliProjectRoot / classifyBroad | help+security matrix |
| `twin`                    | Y        | -         | -      | -           | 0       | resolveCliProjectRoot / classifyBroad | help+security matrix |
| `eval-lab`                | Y        | -         | -      | -           | 0       | N/A or leaf-specific                  | help only            |
| `self-check`              | Y        | -         | -      | -           | 0       | N/A or leaf-specific                  | help only            |
| `infra`                   | Y        | -         | -      | -           | 0       | N/A or leaf-specific                  | help only            |
| `incident`                | Y        | -         | -      | -           | 0       | N/A or leaf-specific                  | help only            |
| `security-doctor`         | Y        | Y         | -      | -           | 0       | resolveCliProjectRoot / classifyBroad | help+security matrix |
| `test-brain`              | Y        | Y         | -      | -           | 0       | N/A or leaf-specific                  | help only            |
| `privacy-doctor`          | Y        | Y         | -      | -           | 0       | N/A or leaf-specific                  | help only            |
| `tech-debt`               | Y        | Y         | -      | -           | 0       | N/A or leaf-specific                  | help only            |
| `features`                | Y        | -         | -      | -           | 0       | N/A or leaf-specific                  | help only            |
| `evolution`               | Y        | -         | -      | -           | 0       | N/A or leaf-specific                  | help only            |
| `org`                     | Y        | -         | -      | -           | 0       | N/A or leaf-specific                  | help only            |
| `memory`                  | Y        | Y         | -      | -           | 0       | N/A or leaf-specific                  | help only            |
| `search`                  | Y        | Y         | -      | -           | 0       | N/A or leaf-specific                  | help only            |
| `role-agent`              | Y        | -         | Y      | Y           | 0       | N/A or leaf-specific                  | help only            |
| `what-if`                 | Y        | Y         | -      | -           | 0       | N/A or leaf-specific                  | help+security matrix |
| `doctor`                  | Y        | -         | -      | -           | 0       | N/A or leaf-specific                  | help only            |
| `brain-mcp`               | Y        | Y         | -      | Y           | 0       | N/A or leaf-specific                  | help only            |
| `mcp`                     | Y        | Y         | -      | Y           | 0       | N/A or leaf-specific                  | help only            |

## Notes

- Broad-root gate (`resolveCliProjectRoot` / `classifyBroadUserScanRoot`) applies to intelligence leaves; ops `doctor --json` is access-only.
- Interactive REPL (`chat` without script) is covered via `ask` entrypoint + ChatService; full TTY REPL not automated.
- Write mutations gated by ownership + approval; see agent/MCP suites.
