# Demo asset plan

Optional screenshots and short recordings for the README and social channels.

**Do not fabricate screenshots.** Capture real terminal output from this repository or anonymized fixtures.

## Suggested files

| File                 | Description                    |
| -------------------- | ------------------------------ |
| `cli-scan.png`       | Default terminal scan (hero)   |
| `cli-json.png`       | Short JSON mode excerpt        |
| `cli-explain.png`    | `explain` command              |
| `demo.gif`           | 10–20s animated terminal demo  |
| `social-preview.png` | 1280×640 GitHub social preview |

Spec for social preview: [social-preview-spec.md](social-preview-spec.md).

## A. Hero terminal screenshot

### Setup

```bash
cd /path/to/AgentDoctor
npm run build
# Prefer a fixture with clear findings, anonymized names only
node dist/cli/index.js ./fixtures/insecure-agent-project
```

Or published:

```bash
npx @praneeth_54/agentdoctor@0.1.3-beta ./fixtures/insecure-agent-project
```

### Capture requirements

Include:

- AgentDoctor version line
- Repository detection block
- AI Coding Agents status (configured / not configured)
- 2–4 representative findings (mix of severities if possible)
- Summary counts

Exclude:

- Real secret values (fixtures already use fake markers)
- Personal absolute home paths if avoidable
- Oversized windows — crop to the meaningful first screen

Theme: dark terminal, readable font size, no extra window chrome if possible.

## B. Short GIF / demo (≈10–20 seconds)

Flow:

1. Terminal open in a sample repository (fixture or anonymized clone)
2. Run `npx @praneeth_54/agentdoctor` (or local `node dist/cli/index.js .`)
3. Pause briefly while findings appear
4. Optionally run `… --json` and show a short excerpt
5. End

Tools: asciinema + svg/gif conversion, or a simple screen recording cropped tightly.

Keep motion calm — presence over noise.

## README integration

When assets exist, link them near the top of the root README under a **Demo** heading. Until then, keep the text-based example already in the README (derived from real fixture output).

## Safety

Never commit screenshots that contain real credentials, private URLs, or customer data.
