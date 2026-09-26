# AgentDoctor 2.0 — Repository Brain Guide

## Purpose

Upgrade Project Brain into a reviewable **Repository Brain** without treating AI output as approved truth.

## Initialize

```bash
agentdoctor init --name "My App" --domain "payments"
# or
agentdoctor brain init
```

Writes artifacts under `.agentdoctor/repository-brain/proposals/` with lifecycle status **proposed**.

Typical artifacts: architecture overview, domain map, feature map, module plan, folder proposal, domain model, API proposal, data model, coding standards, security rules, AI agent instructions, testing strategy, deployment assumptions, ADR stubs.

## Lifecycle states

`observed` → `proposed` → `draft` → `pending-review` → `approved` | `rejected` → `deprecated` | `unknown`

**Never** treat generated proposals as approved facts.

## Review workflow

```bash
agentdoctor brain proposals
agentdoctor brain review --artifact <id> --decision approved
agentdoctor brain review --artifact <id> --decision rejected
```

## Snapshots & history

```bash
agentdoctor brain snapshot
agentdoctor brain update
agentdoctor brain history
agentdoctor brain inspect
```

Snapshots associate with local store metadata; git commit association is best-effort when git is available.

## Contradiction handling

Existing Project Brain contradiction / claim lifecycle remains authoritative for observed claims. Proposals remain separate until approved into knowledge or explicit claim promotion (human-gated).
