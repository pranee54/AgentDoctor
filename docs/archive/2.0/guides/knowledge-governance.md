# AgentDoctor 2.0 — Knowledge Governance

## Record fields

Stable id, title, content, owner, approver, audience, version, status, effective/expiration dates, source, evidence, related repo/module/policy, change history.

## Statuses

`observed` | `proposed` | `draft` | `pending-review` | `approved` | `rejected` | `deprecated` | `unknown`

## CLI

```bash
agentdoctor knowledge-create --title "…" --content "…"
agentdoctor knowledge
agentdoctor knowledge-approve --id <id> --decision approved
```

## Retrieval rule

`retrieveAuthoritative` **abstains** when no approved (non-expired) record matches. Vector similarity is **not** authority (vector search flag off by default).

## Distinctions

| Kind                                        | Authority                        |
| ------------------------------------------- | -------------------------------- |
| Observed facts (Brain claims with evidence) | Evidence-backed, claim lifecycle |
| Draft / proposed knowledge                  | Non-authoritative                |
| Approved knowledge                          | Authoritative for audience       |
| AI suggestions                              | Never auto-approved              |
| Deprecated                                  | Not authoritative                |

## KSoR / external systems

Integration boundaries are documented for future adapters; no hard dependency on external KSoR runtimes in this package.
