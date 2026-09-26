# MCP

**Status:** COMPLETE at defined local scope — Brain + intelligence + agent tools; see [LIMITATIONS.md](LIMITATIONS.md).

## Intelligence tools (read-only)

Includes `project_dna`, `software_map`, `what_if` (path-validated), plus graph/search/change/architecture tools. No shell execution from MCP handlers.

## Path safety

Repo-relative paths validated via `assertSafeRepoTarget` — traversal blocked.

## Limitations

MCP sessions are not an approval authority unless the host passes trusted `approvedByHuman` into agent write tools separately.
