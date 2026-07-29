# Scan examples

These examples use the checked-in fixtures, so they can be reproduced without
network access or real credentials. Run them from the repository root after
`npm run build`:

```sh
node dist/cli/index.js ./fixtures/<fixture>
```

The examples below show the difference between a clean result, a critical
finding, a warning, and an informational finding. A finding describes a
repository condition; it is not a security certification.

## Clean configured repository

```sh
node dist/cli/index.js ./fixtures/clean-configured-project
```

Expected summary:

```text
AI Coding Agents
✓ Cursor       configured
✓ Claude Code  configured
✓ Codex        configured

Findings
  ✓ No findings

Summary
  0 critical
  0 warning
  0 info
```

This is a configured repository with all three supported agents and no
reported findings. It does not mean that every possible risk has been checked.

## Critical: environment file exposed to an agent

```sh
node dist/cli/index.js ./fixtures/multi-agent-env-exposure
```

The fixture contains a runtime `.env` and a Codex configuration without a
relevant exclusion. The result is one `security/env-file-exposure` critical
finding, affected agent `Codex`, with guidance to exclude the file and rotate
any credentials that may have been exposed.

## Critical: credential-like filenames

```sh
node dist/cli/index.js ./fixtures/credential-files-project
```

The result reports three `security/private-key-file` critical findings for
`app-signing.der`, `app-signing.pem`, and `my-service-account.json`. The
fixture uses marker text only; AgentDoctor reports filenames and never prints
the fixture contents as secret evidence.

## Warning: stale instruction paths

```sh
node dist/cli/index.js ./fixtures/nested-missing-path
```

The Cursor rule references two files that do not exist. The result contains two
`instructions/missing-path-reference` warnings and identifies the rule file and
missing paths so the author can correct or remove the references.

## Critical: broad MCP filesystem scope

```sh
node dist/cli/index.js ./fixtures/mcp-project
```

The Cursor MCP configuration points its filesystem server at `/`. AgentDoctor
reports one `security/mcp-broad-filesystem` critical finding and recommends
scoping the server to the repository instead of a root or home directory.

## Informational: generated output without an ignore rule

```sh
node dist/cli/index.js ./fixtures/generated-nested-unignored
```

The `apps/build/` directory is reported as one
`context/generated-directory` informational finding. This is not a secret
finding: it helps a repository decide whether generated output should be
excluded from an agent's context.

## Clean multi-agent repository

```sh
node dist/cli/index.js ./fixtures/multi-agent-project
```

This fixture configures Cursor, Claude Code, and Codex together. The current
scan reports all three as configured, a Next.js/npm repository, and zero
findings. Compare it with `multi-agent-env-exposure` to see how the same
multi-agent shape changes when a runtime environment file is not excluded.

## JSON output for automation

Every example can be consumed without terminal formatting:

```sh
node dist/cli/index.js ./fixtures/multi-agent-env-exposure --json
```

The JSON result preserves stable rule IDs, severities, affected agents, and
evidence paths for CI annotations or downstream reporting.
