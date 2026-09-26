# FINAL RELEASE PLAN

**Status:** PLAN ONLY — no publish / push / tag executed in the final build program.

## Sequence

| Version | Theme                      | Gate                                             |
| ------- | -------------------------- | ------------------------------------------------ |
| 2.2.0   | Project Intelligence       | Formal audit of discovery/DNA/graph/map/chat     |
| 2.3.0   | Lifecycle + Learning       | Requirements/API/DB/events/student               |
| 2.4.0   | AI Agent + Assurance       | Roles, security doctor, ledger, MCP              |
| 2.5.0   | Operations + Organization  | Infra/incident/org maturity                      |
| 3.0.0   | Final Complete AgentDoctor | Twin/what-if/forensic/eval + no new core pillars |

## Target calendar

Implementation target referenced in master brief: **20 October 2026**.  
Quality overrides calendar — do not skip tests or weaken security to meet the date.

## Pre-release checklist (each cut)

1. `npm run verify`
2. Security regression suite green
3. Capability matrix updated
4. Changelog + release notes
5. npm pack dry-run
6. Explicit human authorization for version bump / tag / publish
