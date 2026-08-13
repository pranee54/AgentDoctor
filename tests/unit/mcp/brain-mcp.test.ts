import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import {
  BRAIN_MCP_TOOL_NAMES,
  BrainMcpSession,
  invokeBrainMcpTool,
  listBrainMcpTools,
  resolveProjectRoot,
  assertPathInsideProject,
  stableJson,
  BrainMcpError,
} from "../../../src/mcp/brain/index.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtureRoot = path.resolve(here, "../../../fixtures/understanding-dependencies-project");

const tmpDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tmpDirs.splice(0).map(async (dir) => {
      await fs.rm(dir, { recursive: true, force: true });
    }),
  );
});

async function makeIsolatedFixtureCopy(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "brain-mcp-"));
  tmpDirs.push(dir);
  await fs.cp(fixtureRoot, dir, { recursive: true });
  return dir;
}

async function sessionFor(root: string): Promise<BrainMcpSession> {
  const session = new BrainMcpSession({
    root,
    generatedAt: "2026-08-13T00:00:00.000Z",
    log: () => undefined,
  });
  await session.initialize();
  return session;
}

describe("Brain MCP tools", () => {
  it("lists all required tools with object schemas", () => {
    const tools = listBrainMcpTools();
    expect(tools.map((t) => t.name).sort()).toEqual([...BRAIN_MCP_TOOL_NAMES].sort());
    for (const tool of tools) {
      expect(tool.inputSchema.type).toBe("object");
      expect((tool.description ?? "").length).toBeGreaterThan(10);
    }
  });

  it("rejects unknown tools", async () => {
    const root = await makeIsolatedFixtureCopy();
    const session = await sessionFor(root);
    const result = await invokeBrainMcpTool(session, "brain_hack", {});
    expect(result.isError).toBe(true);
    expect(result.structured).toMatchObject({
      ok: false,
      error: { code: "invalid_argument" },
    });
  });

  it("runs overview/query/claims/evidence/ownership/risk/trace/explain/snapshot", async () => {
    const root = await makeIsolatedFixtureCopy();
    const session = await sessionFor(root);

    const overview = await invokeBrainMcpTool(session, "brain_overview", {});
    expect(overview.isError).toBe(false);
    expect(overview.structured).toMatchObject({
      ok: true,
      snapshot: { id: expect.any(String), contentHash: expect.any(String) },
      metadata: { tool: "brain_overview" },
    });

    const query = await invokeBrainMcpTool(session, "brain_query", {
      type: "ProjectSummary",
    });
    expect(query.isError).toBe(false);
    expect(query.structured).toMatchObject({ ok: true, metadata: { queryType: "ProjectSummary" } });

    const unsupported = await invokeBrainMcpTool(session, "brain_query", {
      type: "eval(process)",
    });
    expect(unsupported.isError).toBe(true);

    const claims = await invokeBrainMcpTool(session, "brain_claims", {});
    expect(claims.isError).toBe(false);
    const claimPayload = claims.structured as {
      ok: true;
      result: { claims: Array<{ id: string; status: string }> };
    };
    for (const claim of claimPayload.result.claims) {
      expect(["ACTIVE", "CONTRADICTED"]).toContain(claim.status);
    }

    const historical = await invokeBrainMcpTool(session, "brain_claims", {
      includeHistorical: true,
    });
    expect(historical.isError).toBe(false);

    const evidence = await invokeBrainMcpTool(session, "brain_evidence", {});
    expect(evidence.isError).toBe(false);
    const evidenceText = JSON.stringify(evidence.structured);
    expect(evidenceText).not.toMatch(/API_KEY\s*=\s*['"]?[A-Za-z0-9]{16,}/);

    const ownership = await invokeBrainMcpTool(session, "brain_ownership", {
      path: "does-not-exist-path.ts",
    });
    expect(ownership.isError).toBe(false);
    expect(JSON.stringify(ownership.structured)).toMatch(/UNKNOWN|matches/);

    const risk = await invokeBrainMcpTool(session, "brain_risk", {});
    expect(risk.isError).toBe(false);
    expect(risk.structured).toMatchObject({
      ok: true,
      result: { riskKind: "change-danger", notVulnerabilityScanner: true },
    });

    const brain = session.getBrain();
    const target = brain.model.dependencies[0]?.from ?? brain.components[0]?.path ?? "packages";
    const trace = await invokeBrainMcpTool(session, "brain_trace", {
      target,
      mode: "blast-radius",
    });
    expect(trace.isError).toBe(false);
    expect(trace.structured).toMatchObject({
      ok: true,
      result: { caps: { maxDepth: 25, maxEdges: 5000 } },
    });

    const firstClaim = claimPayload.result.claims[0];
    if (firstClaim) {
      const explained = await invokeBrainMcpTool(session, "brain_explain", {
        claimId: firstClaim.id,
      });
      expect(explained.isError).toBe(false);
      expect(explained.structured).toMatchObject({
        ok: true,
        claimStatus: expect.any(String),
      });
    }

    const snap = await invokeBrainMcpTool(session, "brain_snapshot", { action: "current" });
    expect(snap.isError).toBe(false);

    const history = await invokeBrainMcpTool(session, "brain_snapshot", { action: "history" });
    expect(history.isError).toBe(false);
  });

  it("preserves provenance and is deterministic for identical requests", async () => {
    const root = await makeIsolatedFixtureCopy();
    const session = await sessionFor(root);
    const a = await invokeBrainMcpTool(session, "brain_overview", {});
    const b = await invokeBrainMcpTool(session, "brain_overview", {});
    expect(stableJson(a.structured)).toBe(stableJson(b.structured));
    expect(a.structured).toMatchObject({
      ok: true,
      evidenceIds: expect.any(Array),
      confidence: expect.any(Number),
      snapshot: {
        id: expect.any(String),
        schemaVersion: expect.any(String),
        contentHash: expect.any(String),
      },
    });
  });

  it("compares snapshots via brain_delta without mutating", async () => {
    const root = await makeIsolatedFixtureCopy();
    const session = await sessionFor(root);
    const firstId = session.getBrain().snapshot.id;

    const markerDir = path.join(root, "packages", "brain-mcp-delta-marker");
    await fs.mkdir(markerDir, { recursive: true });
    await fs.writeFile(
      path.join(markerDir, "package.json"),
      JSON.stringify({ name: "@fixture/brain-mcp-delta-marker", version: "0.0.1" }, null, 2),
      "utf8",
    );

    const { compileProjectBrain } = await import("../../../src/mcp/brain/compile.js");
    const after = await compileProjectBrain(root, {
      generatedAt: "2026-08-13T01:00:00.000Z",
    });
    await session.getStore().saveSnapshot(after);
    const secondId = after.snapshot.id;
    expect(secondId).not.toBe(firstId);

    await session.loadSnapshot(secondId);

    const delta = await invokeBrainMcpTool(session, "brain_delta", {
      fromSnapshot: firstId,
      toSnapshot: secondId,
    });
    expect(delta.isError).toBe(false);
    expect(delta.structured).toMatchObject({
      ok: true,
      result: { fromSnapshot: firstId, toSnapshot: secondId },
      metadata: { readOnly: true },
    });
  });

  it("cross-process: load persisted brain from a fresh session", async () => {
    const root = await makeIsolatedFixtureCopy();
    const first = await sessionFor(root);
    const snapshotId = first.getBrain().snapshot.id;

    const second = new BrainMcpSession({
      root,
      buildIfMissing: false,
      log: () => undefined,
    });
    await second.initialize();
    expect(second.getBrain().snapshot.id).toBe(snapshotId);
    const overview = await invokeBrainMcpTool(second, "brain_overview", {});
    expect(overview.isError).toBe(false);
  });
});

describe("Brain MCP security", () => {
  it("requires explicit root and rejects missing roots", async () => {
    await expect(resolveProjectRoot("")).rejects.toBeInstanceOf(BrainMcpError);
    await expect(resolveProjectRoot("/tmp/agentdoctor-missing-root-xyz")).rejects.toMatchObject({
      code: "invalid_root",
    });
  });

  it("rejects path traversal and symlink escapes", async () => {
    const root = await makeIsolatedFixtureCopy();
    const realRoot = await resolveProjectRoot(root);
    await expect(assertPathInsideProject(realRoot, "../outside")).rejects.toMatchObject({
      code: "path_escape",
    });
    await expect(assertPathInsideProject(realRoot, "/etc/passwd")).rejects.toMatchObject({
      code: "path_escape",
    });

    const escapeDir = await fs.mkdtemp(path.join(os.tmpdir(), "brain-mcp-escape-"));
    tmpDirs.push(escapeDir);
    const secret = path.join(escapeDir, "secret.txt");
    await fs.writeFile(secret, "SECRET=super-secret-value\n", "utf8");
    const link = path.join(realRoot, "escape-link");
    await fs.symlink(secret, link);
    await expect(assertPathInsideProject(realRoot, "escape-link")).rejects.toMatchObject({
      code: "path_escape",
    });
  });

  it("fails closed on corrupt brain store", async () => {
    const root = await makeIsolatedFixtureCopy();
    const session = await sessionFor(root);
    const storeRoot = session.getStore().root;
    const snapId = session.getBrain().snapshot.id;
    const brainFile = path.join(storeRoot, "snapshots", snapId, "brain.json");
    await fs.writeFile(brainFile, "{not-json", "utf8");

    const broken = new BrainMcpSession({
      root,
      buildIfMissing: false,
      log: () => undefined,
    });
    await expect(broken.initialize()).rejects.toMatchObject({ code: "brain_corrupt" });
  });

  it("rejects shell/code injection style query types", async () => {
    const root = await makeIsolatedFixtureCopy();
    const session = await sessionFor(root);
    for (const type of ["$(rm -rf /)", "'; require('fs')", "ListChanges"]) {
      const result = await invokeBrainMcpTool(session, "brain_query", { type });
      expect(result.isError).toBe(true);
    }
  });
});
