# AgentDoctor 3.0.0 — Production Walker Inventory

**Generated:** 2026-09-27T05:52:35.625532Z
**OWNERSHIP_BOUNDARY_VERSION:** 4 (bumped this closure for symlink realpath ownership)

## Purpose

Prevent another `retrieveProjectContext`-style miss: every production filesystem consumer must be classified for ownership vs containment.

## Canonical layers

| Layer       | Module                                         | Role                                                                                         |
| ----------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Containment | `src/security/paths.ts` `resolveSafeRepoPath`  | Inside repo root + symlink escape reject                                                     |
| Ownership   | `src/project/ownership.ts`                     | `.private` / AgentDoctorOS / fixtures / nested `.git` + **realpath-relative** classification |
| Discovery   | `src/discovery/files.ts`                       | Source corpus walk via `decideDirectoryTraversal`                                            |
| CLI gate    | `src/cli/safe-root.ts` `resolveCliProjectRoot` | Refuse home/Desktop/Downloads/Documents                                                      |

## Inventory (production-relevant)

| Producer                                    | Walker / entry                | Ownership gate                            | Nested repo   | Symlink                   | Status               |
| ------------------------------------------- | ----------------------------- | ----------------------------------------- | ------------- | ------------------------- | -------------------- |
| discovery                                   | `discoverFiles`               | `decideDirectoryTraversal`                | stop          | skip/ignore dirs          | PASS                 |
| DNA                                         | via discovery/detectors       | inherited                                 | yes           | via discovery             | PASS                 |
| map                                         | `software-map` top-level      | `isProjectOwnedRelativePath`              | via discovery | N/A top                   | PASS                 |
| graph AST                                   | `listTsFiles` → discoverFiles | inherited                                 | yes           | yes                       | PASS                 |
| platform graph                              | `platform/graph/build`        | `decideDirectoryTraversal`                | yes           | yes                       | PASS                 |
| language enrich                             | discoverFiles                 | inherited                                 | yes           | yes                       | PASS                 |
| secrets                                     | `scan.ts` walkFiles           | `decideDirectoryTraversal`                | yes           | yes                       | PASS                 |
| security doctor                             | secrets + owned files         | inherited                                 | yes           | yes                       | PASS                 |
| search                                      | brain + symbol index          | brain gate + owned                        | yes           | yes                       | PASS                 |
| monorepo                                    | package globs                 | filter + nested check                     | yes           | N/A                       | PASS                 |
| decisions                                   | ADR crawl                     | ownership filter                          | yes           | N/A                       | PASS                 |
| agent context retrieve                      | `retrieve.ts`                 | **assertProjectOwnedRepoPath (realpath)** | yes           | **FIXED symlink launder** | PASS                 |
| agent execute/write                         | execute/write                 | assertProjectOwnedRepoPath                | yes           | yes                       | PASS                 |
| MCP path-safety                             | assertSafeRepoTarget          | lexical + realpath class                  | async nested  | **FIXED**                 | PASS                 |
| MCP transport                               | `agentdoctor mcp` STDIO       | inherits above                            | yes           | yes                       | PASS (forge test)    |
| Brain store                                 | loadLatest/loadSnapshot       | ownershipBoundaryVersion + snap stamp     | N/A           | N/A                       | PASS                 |
| Graph cache                                 | incremental index             | ownershipBoundaryVersion                  | N/A           | N/A                       | PASS                 |
| Twin                                        | invalidationHash              | boundary in hash                          | N/A           | N/A                       | PASS                 |
| CLI dna/map/graph/dashboard/product/brain/… | `resolveCliProjectRoot`       | broad-root refuse                         | N/A           | N/A                       | PASS                 |
| product discovery roots                     | home/Desktop guards           | selection only                            | N/A           | N/A                       | PASS                 |
| knowledge docs readdir                      | shallow docs/                 | PARTIAL (docs only)                       | N/A           | N/A                       | PARTIAL              |
| control-plane `.agentdoctor`                | baseline/proof/workspace      | scoped artifacts                          | N/A           | N/A                       | PASS (control-plane) |

## Raw search hits (excerpt)

```
src/detectors/project.ts:4:import { discoverFiles } from "../discovery/files.js";
src/detectors/project.ts:51:  const discovery = await discoverFiles({ root, maxFileSizeBytes });
src/enforcement/runner.ts:7:import { existsSync, realpathSync } from "node:fs";
src/enforcement/runner.ts:162:    return realpathSync(resolved);
src/index.ts:97:  resolveSafeRepoPath,
src/plugins/sdk.ts:85:    const entries = await fs.readdir(pluginsRoot, { withFileTypes: true });
src/mcp/intelligence/path-safety.ts:5:  assertProjectOwnedRepoPath,
src/mcp/intelligence/path-safety.ts:12:  resolveSafeRepoPath,
src/mcp/intelligence/path-safety.ts:60:      resolveSafeRepoPath(root, candidate);
src/mcp/intelligence/path-safety.ts:75:    const abs = resolveSafeRepoPath(root, primary);
src/mcp/intelligence/path-safety.ts:87:      realRoot = fs.realpathSync(root);
src/mcp/intelligence/path-safety.ts:92:      realAbs = fs.realpathSync(abs);
src/mcp/intelligence/path-safety.ts:126:    const abs = resolveSafeRepoPath(root, rel);
src/mcp/intelligence/path-safety.ts:127:    await assertProjectOwnedRepoPath(root, abs, rel);
src/security/paths.ts:60:    return fs.realpathSync(root);
src/security/paths.ts:71:export function resolveSafeRepoPath(rootInput: string, candidate: string): string {
src/security/paths.ts:92:      realTarget = fs.realpathSync(absolute);
src/security/paths.ts:109:        realAncestor = fs.realpathSync(ancestor);
src/security/paths.ts:136:  resolveSafeRepoPath(rootInput, candidate);
src/security/paths.ts:141:  const abs = resolveSafeRepoPath(rootInput, absoluteOrRel);
src/agent/verify.ts:178:    detail: "All prior agent writes used path-safe resolveSafeRepoPath",
src/project/ownership.ts:105:export async function decideDirectoryTraversal(options: {
src/project/ownership.ts:173:    return fs.realpathSync(candidate);
src/project/ownership.ts:187:export async function assertProjectOwnedRepoPath(
src/intelligence/graph/build.ts:5:import { discoverFiles } from "../../discovery/files.js";
src/intelligence/graph/build.ts:60:  const discovered = await discoverFiles({ root });
src/assurance/proof.ts:118:    const entries = await fs.readdir(proofsDir(root));
src/assurance/change.ts:683:      const entries = await fs.readdir(evidenceRoot, { withFileTypes: true });
src/assurance/change.ts:760:    const entries = await fs.readdir(directory);
src/storage/provider.ts:22:      // Do not use resolveSafeRepoPath here — it calls resolveRepoRoot() which
src/storage/provider.ts:66:        entries = await fs.readdir(dir, { withFileTypes: true });
src/platform/graph/build.ts:5:import { decideDirectoryTraversal } from "../../project/ownership.js";
src/platform/graph/build.ts:51:    entries = await fs.readdir(dir, { withFileTypes: true });
src/platform/graph/build.ts:61:      const traversal = await decideDirectoryTraversal({
src/agent/context/retrieve.ts:6:import { assertProjectOwnedRepoPath, ProjectOwnershipError } from "../../project/ownership.js";
src/agent/context/retrieve.ts:8:import { resolveSafeRepoPath, PathEscapeError } from "../../security/paths.js";
src/agent/context/retrieve.ts:30: * Hostile paths are rejected via resolveSafeRepoPath + project ownership
src/agent/context/retrieve.ts:84:      const abs = resolveSafeRepoPath(root, rel);
src/agent/context/retrieve.ts:85:      await assertProjectOwnedRepoPath(root, abs, rel);
src/agent/tools/write.ts:4:import { assertProjectOwnedRepoPath, ProjectOwnershipError } from "../../project/ownership.js";
src/agent/tools/write.ts:5:import { PathEscapeError, resolveSafeRepoPath } from "../../security/paths.js";
src/agent/tools/write.ts:55:  const abs = resolveSafeRepoPath(root, relativePath);
src/agent/tools/write.ts:57:    await assertProjectOwnedRepoPath(root, abs, relativePath);
src/agent/tools/execute.ts:15:import { discoverFiles } from "../../discovery/files.js";
src/agent/tools/execute.ts:16:import { assertProjectOwnedRepoPath, ProjectOwnershipError } from "../../project/ownership.js";
src/agent/tools/execute.ts:17:import { PathEscapeError, resolveSafeRepoPath } from "../../security/paths.js";
src/agent/tools/execute.ts:48:    abs = resolveSafeRepoPath(root, rel);
src/agent/tools/execute.ts:56:    await assertProjectOwnedRepoPath(root, abs, rel);
src/agent/tools/execute.ts:148:    // Repo-root isolation is already enforced by resolveSafeRepoPath.
src/agent/tools/execute.ts:189:        const discovery = await discoverFiles({ root });
src/utils/fs.ts:62:    const entries = await fs.readdir(dirPath);
src/platform/knowledge/analyze.ts:89:    const entries = await fs.readdir(docsDir);
src/platform/sessions/store.ts:119:    return (await fs.readdir(dir))
src/workspace/index.ts:115:    entries = await fs.readdir(dir);
src/product/discovery/roots.ts:84:      entries = await fs.readdir(current, { withFileTypes: true });
src/product/discovery/roots.ts:226:    const entries = await fs.readdir(cwd, { withFileTypes: true });
src/product/graph/enrich-languages.ts:7:import { discoverFiles } from "../../discovery/files.js";
src/product/graph/enrich-languages.ts:28:  const discovered = await discoverFiles({ root });
src/product/index.ts:181:  decideDirectoryTraversal,
src/product/index.ts:185:  assertProjectOwnedRepoPath,
src/discovery/files.ts:5:import { classifyRelativePathOwnership, decideDirectoryTraversal } from "../project/ownership.js";
src/discovery/files.ts:20:export async function discoverFiles(options: DiscoverFilesOptions): Promise<DiscoveryResult> {
src/discovery/files.ts:45:      entries = await fs.readdir(current, { withFileTypes: true });
src/discovery/files.ts:84:        const traversal = await decideDirectoryTraversal({
src/product/decisions/ledger.ts:12:import { resolveSafeRepoPath } from "../../security/paths.js";
src/product/decisions/ledger.ts:197:  return resolveSafeRepoPath(rootInput, candidate);
src/product/map/software-map.ts:36:    const entries = await fs.readdir(root, { withFileTypes: true });
src/core/baseline/store.ts:110:    const names = await fs.readdir(baselineDir(root));
src/core/fix/backup.ts:120:    names = await fs.readdir(dir);
src/core/brain-product/init.ts:191:    files = (await fs.readdir(dir)).filter((f) => f.endsWith(".md")).sort();
src/core/secrets/scan.ts:4:import { decideDirectoryTraversal } from "../../project/ownership.js";
src/core/secrets/scan.ts:114:    entries = await fs.readdir(dir, { withFileTypes: true });
src/core/secrets/scan.ts:128:      const traversal = await decideDirectoryTraversal({
src/core/monorepo/detect.ts:41:      const entries = await fs.readdir(parent, { withFileTypes: true });
src/core/context-health/analyze.ts:111:    const entries = await fs.readdir(instructionsDir);
src/core/understanding/relationships/discover.ts:3:import { discoverFiles } from "../../../discovery/files.js";
src/core/understanding/relationships/discover.ts:218:  const discovery = await discoverFiles({ root: cwd });
src/core/understanding/domain/discover.ts:1:import { discoverFiles } from "../../../discovery/files.js";
src/core/understanding/domain/discover.ts:45:  const discovery = await discoverFiles({ root: cwd });
src/core/understanding/entrypoints/discover.ts:1:import { discoverFiles } from "../../../discovery/files.js";
src/core/understanding/entrypoints/discover.ts:24:  const discovery = await discoverFiles({ root: cwd });
src/core/understanding/ownership/discover.ts:4:import { discoverFiles } from "../../../discovery/files.js";
src/core/understanding/ownership/discover.ts:203:    (await discoverFiles({ root: cwd })).files.map((file) => file.relativePath);
src/core/understanding/dependencies/discover.ts:3:import { discoverFiles } from "../../../discovery/files.js";
src/core/understanding/dependencies/discover.ts:591:  const discovery = await discoverFiles({ root: cwd });

```

## Rule

Any NEW production walker must:

1. Use `discoverFiles` / `decideDirectoryTraversal`, OR
2. Call `assertProjectOwnedRepoPath` after `resolveSafeRepoPath` (realpath), OR
3. Be explicitly documented as control-plane / non-source-intelligence.
