# AgentDoctor 2.1.0 — Release Checklist

**Package on disk:** `2.1.0`  
**RC status:** YES (final independent audit)

Legend: `[x]` done · `[ ]` pending release ops in this cut

---

## Preparation

- [x] Final independent audit: no release blockers
- [x] Changelog entry for 2.1.0
- [x] Release notes: [RELEASE_2_1_0.md](./RELEASE_2_1_0.md)
- [x] README updated for 2.1
- [x] Version bump: package.json, lockfile, PACKAGE_VERSION, action.yml
- [x] Limitations documented

## Version cut

- [x] Bump `package.json` / `package-lock.json` / `PACKAGE_VERSION`
- [x] Finalize CHANGELOG `## [2.1.0]`
- [x] Align README / Action default version pins

## Pre-publish / release ops

- [ ] `npm run verify` (run during cut)
- [ ] `npm pack` + clean-install smoke
- [ ] CLI / MCP / dashboard smoke
- [ ] Release commit `release: 2.1.0`
- [ ] Tag `v2.1.0`
- [ ] Push commit + tag
- [ ] GitHub Release
- [ ] `npm publish`
- [ ] Post-publish install `@praneeth_54/agentdoctor@2.1.0`
