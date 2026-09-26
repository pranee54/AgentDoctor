# Plugin SDK (v2)

Plugins are discovered at:

```text
<repo>/.agentdoctor/plugins/<plugin-id>/plugin.json
```

## Manifest

```json
{
  "id": "example-analyzer",
  "name": "Example Analyzer Plugin",
  "version": "1.0.0",
  "apiVersion": "2.0",
  "capabilities": ["analyzer"],
  "requestedPermissions": ["none"],
  "entry": "index.js"
}
```

- `apiVersion` must be `"2.0"`.
- Capabilities today: `rule` | `reporter` | `analyzer`.
- `requestedPermissions` are **declarations only** — the runtime does not grant network or unrestricted filesystem access.
- Invalid manifests are reported by `agentdoctor plugins` without crashing the process.

## Example

See `fixtures/plugin-example/`.

## Not yet shipped

Executable plugin hooks that inject custom rules/writers into the scan pipeline, and hostile-plugin process isolation beyond validation.
