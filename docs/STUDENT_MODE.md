# Student Mode (2.1)

**Status:** IMPLEMENTED · **Default student experience:** BUILD_WITH_ME · **Product:** AgentDoctor 3.0

```bash
agentdoctor learn [path]
agentdoctor learn --viva [path]
agentdoctor learn --docs [path]
agentdoctor learn --mode BUILD_WITH_ME --build "Add feature" [path]
agentdoctor learn --mode BUILD_WITH_ME --build "Add feature" --approve --apply-ops '[...]' [path]
```

## Modes

| Mode                 | allowWrites                  | Behavior                                                                                     |
| -------------------- | ---------------------------- | -------------------------------------------------------------------------------------------- |
| LEARN                | false (enforced)             | Explain / viva / docs only. Write and execute tools return `mode_forbidden`.                 |
| BUILD_WITH_ME        | true after human `--approve` | Explain → plan → teach → approve → `runCodingLoop` → explain diffs → verify. **IMPLEMENTED** |
| BUILD_FOR_ME         | true after approval          | Same coding engine; less teaching.                                                           |
| DEVELOPER / AI_AGENT | true after approval          | Same gates; deeper / fuller tool use.                                                        |

The model cannot override `ModeProfile.allowWrites`.

## Honesty

- Documentation and viva questions are grounded in repository evidence; missing facts are UNKNOWN.
- Post-change reports keep `ENGINEERING_CORRECTNESS_NOT_CLAIMED`.
- **PARTIAL:** Rich interactive pedagogical UI beyond CLI/text teaching notes.
