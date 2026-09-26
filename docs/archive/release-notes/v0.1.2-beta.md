# AgentDoctor v0.1.2-beta

Backward-compatible quality patch from real-world repository audits.

## What was fixed

- More reliable CLI/package binary execution when using the local package or packaged installs
- Correct nested `context/generated-directory` ignore handling for `.gitignore` / `.cursorignore` patterns such as `build/` and `**/build/`
- Precise generated-directory evidence paths (for example `mobile-apps/build` instead of bare `build`)
- Multi-project repository detection for independently buildable apps without Node workspace tooling
- Mixed Composer / Pub / npm detection without inventing a false primary package manager
- No false “malformed package.json” diagnostic when a root `package.json` is simply absent
- Expanded conservative credential-file detection for `.der` and service-account JSON filenames
- Quieter permission diagnostics for paths under directories AgentDoctor already skips

## Compatibility

- No migration required
- No public API breaking changes
- No JSON schema breaking changes
- Rule IDs unchanged
- Exit-code behavior unchanged

## Testing

104 automated tests passing.

## Installation

```bash
npx @praneeth_54/agentdoctor@0.1.2-beta
```

Global:

```bash
npm install -g @praneeth_54/agentdoctor@0.1.2-beta
agentdoctor
```

CLI binary remains `agentdoctor`.
