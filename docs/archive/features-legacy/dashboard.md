# Local dashboard

```bash
agentdoctor dashboard [path] [--host 127.0.0.1] [--port 8787]
# Unsafe (explicit opt-in only):
agentdoctor dashboard [path] --host 0.0.0.0 --allow-non-loopback
```

Opens a **read-only** HTTP UI bound to **loopback** (`127.0.0.1` / `::1` / `localhost`) by default.

Non-loopback hosts are **refused** unless `--allow-non-loopback` is supplied. That flag is not an enterprise security boundary: anyone who can reach the port can spoof `?user=` roles.

## API

| Path                | Description                                   |
| ------------------- | --------------------------------------------- |
| `GET /`             | HTML shell                                    |
| `GET /api/status`   | Root, adapters, monorepo, role/policy notices |
| `GET /api/scan`     | Scan summary + capped findings                |
| `GET /api/brain`    | Brain store status                            |
| `GET /api/meta`     | Fix audits + named baselines + sessions       |
| `GET /api/platform` | Platform snapshot summary + test-impact       |

Non-GET methods return `405`. The dashboard **cannot** apply Safe Fix or mutate the repository.

## Honest limitations

- Local `?user=` role selection is **not authentication**.
- Action Policy Evaluator results shown in platform data are **evaluate-only** — no commands are executed and no agents are intercepted.
- Do not expose this dashboard as a multi-tenant or enterprise RBAC control plane.
