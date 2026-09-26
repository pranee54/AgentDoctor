# AgentDoctor AI Agent (2.1 development)

**Status:** IMPLEMENTED · **Product:** AgentDoctor 3.0 · See [LIMITATIONS.md](LIMITATIONS.md)

## Architecture

THE MODEL REASONS. AGENTDOCTOR PROVIDES PROJECT CONTEXT. AGENTDOCTOR CONTROLS TOOLS. AGENTDOCTOR VERIFIES RESULTS.

See [AGENTDOCTOR_2_1_ARCHITECTURE.md](./AGENTDOCTOR_2_1_ARCHITECTURE.md).

## Modes

| Mode          | Writes                        | Notes                                    |
| ------------- | ----------------------------- | ---------------------------------------- |
| LEARN         | No (`allowWrites` enforced)   | Explain project from evidence            |
| BUILD_WITH_ME | Yes only after human approval | Default student experience → coding loop |
| BUILD_FOR_ME  | Yes only after human approval | Less teaching, same gates                |
| DEVELOPER     | Yes only after human approval | Deep architecture focus                  |
| AI_AGENT      | Yes only after human approval | Model tool loop after approval           |

## Surfaces

| Surface                    | Status      | Notes                                                                    |
| -------------------------- | ----------- | ------------------------------------------------------------------------ |
| CLI chat / ask             | IMPLEMENTED | Fail-closed when provider=`none`                                         |
| CLI agent / plan / apply   | IMPLEMENTED | Writes need `--approve`; optional `--run-tests`                          |
| CLI learn / BUILD_WITH_ME  | IMPLEMENTED | `--build` connects to `runCodingLoop`                                    |
| Dashboard POST `/api/chat` | IMPLEMENTED | Ask-only; fail-closed on `none`; no write execution                      |
| MCP agent tools            | IMPLEMENTED | `project_ask`, `file_*`, `change_verify`; no unrestricted shell          |
| Model coding loop          | IMPLEMENTED | `useModelLoop` + Mock script tests; model proposes, AgentDoctor executes |

## Limits (enforced)

Hard caps: `maxToolCalls`, `maxIterations`, `maxWallTimeMs`, `maxFilesModified`, `maxContextChars` (truncate).

## Honesty

Never claims “everything is correct.” Post-change reports use `ENGINEERING_CORRECTNESS_NOT_CLAIMED`.

Do not claim: 100% correctness, fully autonomous coding, completely safe, production guaranteed.
