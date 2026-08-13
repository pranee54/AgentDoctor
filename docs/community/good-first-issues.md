# Good first issues (Brain / MCP / adoption)

Realistic starter contributions compatible with AgentDoctor **1.1.0**. Prefer small PRs. Label as `good first issue` when filing on GitHub.

Do **not** treat Agent Context / task_context APIs as first issues — those are 🟡 Planned in [ROADMAP.md](../../ROADMAP.md).

Also see Safety-oriented starters: [../good-first-issues.md](../good-first-issues.md).

---

### 1. Expand Quickstart troubleshooting with real failure strings

|                |                                                                                                      |
| -------------- | ---------------------------------------------------------------------------------------------------- |
| **Difficulty** | Easy                                                                                                 |
| **Area**       | Docs                                                                                                 |
| **Problem**    | New users hit `--root` / stdout pollution / empty ownership without recognizing stderr messages      |
| **Expected**   | Add 2–3 troubleshooting rows to `docs/quickstart.md` with exact CLI/MCP error substrings from source |
| **Acceptance** | Strings match `src/cli/commands/brain-mcp.ts` / MCP errors; no invented messages                     |
| **Files**      | `docs/quickstart.md`, `src/mcp/brain/errors.ts`                                                      |
| **Validate**   | Manual read + grep for quoted strings                                                                |

### 2. Add a Brain fixture note for ownership UNKNOWN

|                |                                                              |
| -------------- | ------------------------------------------------------------ |
| **Difficulty** | Easy                                                         |
| **Area**       | Docs / fixtures                                              |
| **Problem**    | Developers expect invented owners                            |
| **Expected**   | Short fixture walkthrough showing UNKNOWN without CODEOWNERS |
| **Acceptance** | Uses an existing fixture path; no fake owners                |
| **Files**      | `docs/demo/`, `fixtures/` ownership-related                  |
| **Validate**   | `brain_ownership` against that path returns UNKNOWN          |

### 3. Document `brain_query` type list with one example each

|                |                                                                           |
| -------------- | ------------------------------------------------------------------------- |
| **Difficulty** | Easy                                                                      |
| **Area**       | MCP docs                                                                  |
| **Problem**    | Query types are listed but examples are sparse                            |
| **Expected**   | Table of supported types from docs/mcp with one minimal args example each |
| **Acceptance** | Types match `docs/mcp/brain-mcp.md`; unsupported types remain rejected    |
| **Files**      | `docs/mcp/brain-mcp.md`                                                   |
| **Validate**   | Docs review; optional `test:mcp`                                          |

### 4. Improve MCP examples README

|                |                                                                                 |
| -------------- | ------------------------------------------------------------------------------- |
| **Difficulty** | Easy                                                                            |
| **Area**       | Examples                                                                        |
| **Problem**    | `examples/mcp/` has configs but little prose                                    |
| **Expected**   | `examples/mcp/README.md` explaining placeholders, rebuild tip, host differences |
| **Acceptance** | Paths stay `/ABSOLUTE/PATH/...`; no machine paths                               |
| **Files**      | `examples/mcp/`                                                                 |
| **Validate**   | Link check from quickstart                                                      |

### 5. Understanding unit test for a documented UNKNOWN case

|                |                                                                        |
| -------------- | ---------------------------------------------------------------------- |
| **Difficulty** | Medium                                                                 |
| **Area**       | Tests                                                                  |
| **Problem**    | UNKNOWN policy needs regression protection                             |
| **Expected**   | Focused test asserting no invented owner when evidence missing         |
| **Acceptance** | `npm run test:understanding` passes; no production architecture change |
| **Files**      | `tests/unit/understanding/ownership-discovery.test.ts` (or adjacent)   |
| **Validate**   | `npm run verify:understanding`                                         |

### 6. Entrypoint discovery fixture coverage gap

|                |                                                                  |
| -------------- | ---------------------------------------------------------------- |
| **Difficulty** | Medium                                                           |
| **Area**       | Fixtures / understanding                                         |
| **Problem**    | Some entrypoint patterns are lightly covered                     |
| **Expected**   | Minimal fixture + assertion aligned with existing discover rules |
| **Acceptance** | No new frameworks invented; follows current detectors            |
| **Files**      | `fixtures/`, `tests/unit/understanding/entrypoint-*.test.ts`     |
| **Validate**   | `npm run test:understanding`                                     |

### 7. Clarify Safety vs Brain in docs index

|                |                                                                      |
| -------------- | -------------------------------------------------------------------- |
| **Difficulty** | Easy                                                                 |
| **Area**       | Docs                                                                 |
| **Problem**    | Readers confuse Scan with Brain risk                                 |
| **Expected**   | Short callout in `docs/README.md` separating Safety vs change-danger |
| **Acceptance** | Wording matches product docs; no new claims                          |
| **Files**      | `docs/README.md`                                                     |
| **Validate**   | Docs review                                                          |

### 8. Error-message copy for invalid `brain_snapshot` action

|                |                                                                |
| -------------- | -------------------------------------------------------------- |
| **Difficulty** | Medium                                                         |
| **Area**       | MCP UX                                                         |
| **Problem**    | Unsupported snapshot actions need clearer stderr/tool errors   |
| **Expected**   | Improve message listing `current                               | history | compare | load | rebuild` if not already crystal clear |
| **Acceptance** | Existing tests updated; behavior unchanged except message text |
| **Files**      | `src/mcp/brain/tools/handlers.ts`, `tests/unit/mcp/`           |
| **Validate**   | `npm run verify:mcp`                                           |

---

**Out of scope for first issues:** HTTP/SSE transports, task_context APIs, enterprise Brain hosting, lowering security tests.
