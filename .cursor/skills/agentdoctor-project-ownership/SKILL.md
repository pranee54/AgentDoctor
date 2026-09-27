---
name: agentdoctor-project-ownership
description: Project ownership boundary rules for AgentDoctor discovery, graph, search, agent tools, MCP, and what-if. Use when changing walkers, path resolution, or ownership classification.
---

# AgentDoctor project ownership

## Purpose
Ensure product intelligence only indexes **project-owned** source. Paths inside the scan root are not automatically owned.

## Key module
`src/project/ownership.ts` — `classifyRelativePathOwnership`, `decideDirectoryTraversal`, `assertProjectOwnedRepoPath`, `OWNERSHIP_BOUNDARY_VERSION` (currently **4**).

## Non-owned by default
- `.private/`, `AgentDoctorOS/`
- nested repositories (`.git` under a subdirectory)
- `fixtures/`, validation checkouts
- symlink realpath that lands outside ownership

## When changing ownership
1. Bump `OWNERSHIP_BOUNDARY_VERSION` if classification semantics change
2. Ensure Brain/Twin/Graph caches invalidate via stamp/hash
3. Add hostile fixture regression (markers must not appear as VERIFIED)
4. Update walker inventory if a new producer walks the filesystem

## What NOT to do
Use lexical `relativeHint` alone after symlink resolution; treat control-plane `.agentdoctor/` artifact I/O as source ownership (separate scope).
