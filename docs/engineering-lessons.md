# Engineering lessons from AgentDoctor 1.1.0

Real problems from shipping Project Brain → MCP → Agent. Not a victory lap.

## 1. Windows hostile filenames

|                |                                                                               |
| -------------- | ----------------------------------------------------------------------------- |
| **Problem**    | Tests creating paths with ESC / reserved characters failed or hung on Windows |
| **Why**        | POSIX fixtures assumed Unix filename rules                                    |
| **Detected**   | Windows CI quality job failures                                               |
| **Fix**        | Skip or sanitize Windows-illegal names in `hostile` tests                     |
| **Validation** | Windows matrix job green                                                      |
| **Lesson**     | Portability fixtures must be OS-aware                                         |

## 2. Windows npm / `.cmd` invocation

|                |                                                                                           |
| -------------- | ----------------------------------------------------------------------------------------- |
| **Problem**    | `spawnSync("npm")` / POSIX `.bin` shims returned null status or wrong binaries on Windows |
| **Why**        | npm is often `npm.cmd`; shims are not interchangeable with Unix                           |
| **Detected**   | `cli-bin` / pack-install tests on `windows-latest`                                        |
| **Fix**        | Invoke via `node` + `npm-cli.js`; prefer package CLI over POSIX shim                      |
| **Validation** | Focused Windows CLI bin tests                                                             |
| **Lesson**     | Never assume `spawn("npm")` is portable                                                   |

## 3. `cmd /s /c` quoting

|                |                                                             |
| -------------- | ----------------------------------------------------------- |
| **Problem**    | Nested quotes produced `--version is not recognized`        |
| **Why**        | Windows `cmd` quoting rules differ from POSIX argv          |
| **Detected**   | CLI bin tests; CodeQL incomplete sanitization alerts        |
| **Fix**        | Nested quoting `""exe" "args""` + hardened escape helper    |
| **Validation** | Unit tests for escape rules; CodeQL closed for that finding |
| **Lesson**     | Treat Windows command lines as a security-sensitive surface |

## 4. Pack / install timeouts

|                |                                                                              |
| -------------- | ---------------------------------------------------------------------------- |
| **Problem**    | `npm pack` + install exceeded short Vitest timeouts (~5s vs tens of seconds) |
| **Why**        | Real pack is I/O heavy on CI runners                                         |
| **Detected**   | Flaky / red Windows CLI tests                                                |
| **Fix**        | Raise timeout for pack/install path; disable fund/audit noise                |
| **Validation** | Stable CLI bin suite                                                         |
| **Lesson**     | Integration timeouts must match real install cost                            |

## 5. Project Brain lab needs `dist/`

|                |                                                              |
| -------------- | ------------------------------------------------------------ |
| **Problem**    | STDIO MCP / Brain laboratory ENOENT on `dist/cli/index.js`   |
| **Why**        | Spawn targets the built CLI; typecheck alone is insufficient |
| **Detected**   | CI Project Brain job                                         |
| **Fix**        | `npm run build` before laboratory steps in CI                |
| **Validation** | CI job green after workflow fix                              |
| **Lesson**     | Document build-before-MCP for contributors                   |

## 6. CodeQL filesystem race

|                |                                                           |
| -------------- | --------------------------------------------------------- |
| **Problem**    | Report writer race flagged by CodeQL                      |
| **Why**        | Non-atomic write patterns                                 |
| **Detected**   | CodeQL alerts                                             |
| **Fix**        | Atomic / race-safe write path in validation report helper |
| **Validation** | Alert cleared                                             |
| **Lesson**     | Treat CI SAST as part of release train                    |

## 7. Local Brain state vs source tree

|                |                                                                          |
| -------------- | ------------------------------------------------------------------------ |
| **Problem**    | Huge `.agentdoctor/project-brain/` snapshots pollute status / packs      |
| **Why**        | Durable Brain store is runtime state under the scanned root              |
| **Detected**   | Local development / accidental staging risk                              |
| **Fix**        | Gitignore / docs: never commit `.agentdoctor/`                           |
| **Validation** | Packaging excludes understanding lab artifacts from unintended publishes |
| **Lesson**     | Persistence paths need explicit hygiene rules                            |

## 8. Real Cursor MCP validation vs LLM grading

|                |                                                                         |
| -------------- | ----------------------------------------------------------------------- |
| **Problem**    | Easy to over-claim “the agent used Brain” from prose quality            |
| **Why**        | Authenticated LLM Q1–Q7 may be BLOCKED without login                    |
| **Detected**   | `validation/mcp-agent` report: tools PASS, LLM BLOCKED                  |
| **Fix**        | Separate MCP contract PASS from LLM grading; require tool-call evidence |
| **Validation** | README / validation docs state honest limits                            |
| **Lesson**     | Without tool-call evidence, MCP usage is UNKNOWN                        |

## 9. STDIO protocol discipline

|                |                                                |
| -------------- | ---------------------------------------------- |
| **Problem**    | Diagnostic prints on stdout break MCP          |
| **Why**        | Hosts parse stdout as protocol                 |
| **Detected**   | Protocol / STDIO client tests                  |
| **Fix**        | Logs → stderr only (`src/mcp/brain/server.ts`) |
| **Validation** | `npm run verify:mcp`                           |
| **Lesson**     | STDIO MCP is unforgiving about stdout          |

## 10. Provenance and UNKNOWN

|                |                                                           |
| -------------- | --------------------------------------------------------- |
| **Problem**    | Agents invent owners when evidence is missing             |
| **Why**        | Models optimize for complete answers                      |
| **Detected**   | Product design + ownership discovery tests / demo         |
| **Fix**        | Explicit UNKNOWN policy; ownership tools refuse invention |
| **Validation** | Ownership fixture / demo returns UNKNOWN                  |
| **Lesson**     | UNKNOWN is a feature, not a gap to paper over             |

Related commits on the 1.1.0 train include Windows CLI portability, CI build ordering, and CodeQL hardening (see `git log` around `2bdb65f`…`ce20992`).
