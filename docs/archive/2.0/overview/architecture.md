# AgentDoctor 2.0 — Architecture

**Package version:** 2.1.0

**Contracts version:** `2.0.0-contracts`

**Positioning:** Engineering intelligence & safety for AI coding agents.

```text
AgentDoctor
│
├── Repository Intelligence
│   ├── AST (TS/JS)
│   ├── Graph
│   ├── Git
│   └── Impact
│
├── Engineering Knowledge
│   ├── Brain
│   ├── Governance
│   └── Provenance
│
├── Safety
│   ├── Scanner
│   ├── Safe Fix
│   ├── Secrets
│   └── Policies
│
├── Agent Interface
│   ├── MCP (brain-mcp / mcp)
│   ├── CLI
│   ├── API / dashboard
│   └── Adapters
│
└── Verification
    ├── Tests
    ├── Reports
    └── Release validation
```

## Layer responsibilities

| Layer                   | Role                                                | Primary paths                                                            |
| ----------------------- | --------------------------------------------------- | ------------------------------------------------------------------------ |
| Repository intelligence | Structure, history, blast radius                    | `src/intelligence`, `src/architecture`                                   |
| Engineering knowledge   | Claims, proposals, approved knowledge               | `src/core/understanding`, `src/core/brain-product`, `src/knowledge`      |
| Safety                  | Scan / fix / verify / policy / CI                   | `src/core/scanner`, `src/core/fix`, `src/core/verify`, `src/core/policy` |
| Platform 2.0            | Sessions, provenance, evaluate-only firewall        | `src/platform`                                                           |
| Shared contracts        | Unified finding / graph / knowledge / policy shapes | `src/contracts`                                                          |
| Enforcement             | Controlled runner (blocks under AD control)         | `src/enforcement`                                                        |
| Team (local-dev)        | scrypt password auth + RBAC — **not SSO**           | `src/team`                                                               |
| Agent interface         | MCP, CLI, dashboard, adapters                       | `src/mcp`, `src/cli`, `src/dashboard`, `src/agents`                      |
| Storage                 | Filesystem default; memory; SQLite stubbed          | `src/storage`                                                            |
| Ops                     | Local health probe                                  | `src/ops`                                                                |

## Trust model (short)

1. **Analysis** — scan, graph, brain, knowledge suggestions
2. **Policy evaluation** — firewall / packs; `executionResult: "not-executed"` by default
3. **Human approval** — knowledge / brain proposal review
4. **Runtime enforcement** — only via AgentDoctor-controlled runner / CI wrapper when explicitly used

## Non-goals (honest)

- No IDE interception of third-party agents
- No enterprise SSO / IdP in this package
- No claimed multi-language AST parity beyond TS/JS
- No forced cloud infrastructure for local users

## Extension rule

Additive modules + feature flags (`DEFAULT_FEATURE_FLAGS`). Existing Safety CLI exit codes, Brain store format, Brain MCP tool names, and platform evaluate-only behavior remain stable.
