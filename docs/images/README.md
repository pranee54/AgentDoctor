# Demo assets

Screenshots and short recordings for the README and social channels.

**Do not fabricate screenshots.** Capture real terminal output from this repository or anonymized fixtures.

## Status

| File                 | Status        | Description                                                                     |
| -------------------- | ------------- | ------------------------------------------------------------------------------- |
| `cli-scan.png`       | **Available** | Real CLI scan of `fixtures/insecure-agent-project` with AgentDoctor v0.1.4-beta |
| `cli-json.png`       | Pending       | Short JSON mode excerpt                                                         |
| `cli-explain.png`    | Pending       | `explain` command                                                               |
| `demo.gif`           | Pending       | 10–20s animated terminal demo                                                   |
| `social-preview.png` | Pending       | 1280×640 GitHub social preview                                                  |

Spec for social preview: [social-preview-spec.md](social-preview-spec.md).

## `cli-scan.png`

Captured from the published package:

```bash
npx @praneeth_54/agentdoctor@0.1.4-beta ./fixtures/insecure-agent-project
```

Shows repository detection, three configured agents, critical env/credential findings, and the Claude Code `bypassPermissions` warning. Linked from the root README under **What you get**.

## Pending GIF demo (≈10–20 seconds)

Flow when recording `demo.gif`:

1. Terminal open in a sample repository (fixture or anonymized clone)
2. Run `npx @praneeth_54/agentdoctor` (or local `node dist/cli/index.js .`)
3. Pause briefly while findings appear
4. Optionally run `… --json` and show a short excerpt
5. End

## Safety

Never commit screenshots that contain real credentials, private URLs, or customer data.
