# Security Policy

## Supported versions

| Version    | Supported |
| ---------- | --------- |
| 0.1.x-beta | ✓         |
| < 0.1.0    | ✗         |

## Reporting a vulnerability

Please report security issues privately. Do not open a public GitHub issue.

Preferred channel:

1. [GitHub Security Advisories](https://github.com/pranee54/AgentDoctor/security/advisories/new) on this repository

Include:

- Description of the issue
- Steps to reproduce
- Impact assessment
- Any suggested fix

Please allow reasonable time for a fix before public disclosure.

We aim to acknowledge valid reports within **7 days** and provide a remediation plan or fix timeline for confirmed issues affecting current supported versions.

## Scope notes

AgentDoctor treats repository contents as untrusted input. Reports related to:

- path traversal / symlink escape
- secret leakage in findings or logs
- unsafe process execution
- terminal escape injection

are especially appreciated.

AgentDoctor is not a complete secret scanner and does not claim to find all credentials.
