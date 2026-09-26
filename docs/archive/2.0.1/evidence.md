# Evidence bundles (2.0.1)

**Status:** SUPPORTED for local artifact write + SHA-256 integrity check

## Layout

```text
.agentdoctor/evidence/<change-id>/
  manifest.json
  change.json
  graph-impact.json
  architecture.json
  knowledge.json
  policy.json
  security.json
  tests.json
  git.json
  verification.json
```

`manifest.json` lists content files with SHA-256 digests (`schemaVersion` 1.0.0) and records `agentDoctorVersion`, revisions, and `verificationStatus` at write time (`evidence-produced`).

## Commands

```bash
agentdoctor evidence inspect <change-id> [--json]
agentdoctor evidence verify <change-id> [--json]
```

| Command   | Behavior                                         |
| --------- | ------------------------------------------------ |
| `inspect` | Lists present files and parsed manifest (if any) |
| `verify`  | Re-hashes each file listed in the manifest       |

## When is status `verified`?

Only when **every** file listed in `manifest.files` exists and its SHA-256 matches the recorded digest.

`verified` means **artifact integrity**, not:

- test pass/fail
- security clearance
- architectural approval
- policy enforcement at runtime
- compliance certification

Exit code for failed hash verify: issues/threshold (`1`). Missing evidence on inspect: usage error (`2`).
