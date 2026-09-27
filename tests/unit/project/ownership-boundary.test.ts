import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { discoverFiles } from "../../../src/discovery/files.js";
import { detectProject } from "../../../src/detectors/project.js";
import { loadDecisionLedger } from "../../../src/product/decisions/ledger.js";
import { buildProjectDna } from "../../../src/product/dna/build.js";
import {
  classifyRelativePathOwnership,
  isNestedRepositoryRoot,
} from "../../../src/project/ownership.js";

async function write(file: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, content, "utf8");
}

describe("project ownership boundary", () => {
  it("classifies private and internal trees as non-owned", () => {
    expect(classifyRelativePathOwnership(".private/oss-validation/sigma/docs/adr/x.md")).toBe(
      "private_workspace",
    );
    expect(classifyRelativePathOwnership("AgentDoctorOS/22_DECISIONS/ADR-001.md")).toBe(
      "internal_docs",
    );
    expect(classifyRelativePathOwnership("docs/adr/001-cache.md")).toBe("project_owned");
  });

  it("excludes nested-repo ADRs and .private SIGMA ADRs from decisions", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ad-own-dec-"));
    try {
      await write(
        path.join(root, "package.json"),
        JSON.stringify({ name: "boundary-demo", private: true }),
      );
      await write(
        path.join(root, "docs", "adr", "001-owned.md"),
        "# Owned ADR\n\n**Status**: Accepted\n\nKeep this one.\n",
      );

      // Foreign SIGMA-like private checkout (no need for real .git — top-level .private is enough)
      await write(
        path.join(
          root,
          ".private",
          "oss-validation",
          "sigma",
          "docs",
          "adr",
          "0001-rendering-and-security.md",
        ),
        "# ADR-0001 — Стратегия за рендиране\n\nCloudflare D1 foreign content\n",
      );

      // Nested repository with its own .git + ADR
      const nested = path.join(root, "nested-repo");
      await fs.mkdir(path.join(nested, ".git"), { recursive: true });
      await write(path.join(nested, "package.json"), JSON.stringify({ name: "foreign-nested" }));
      await write(
        path.join(nested, "adr", "0001.md"),
        "# Nested foreign ADR\n\n**Status**: Accepted\n",
      );

      // AgentDoctorOS internal notes must not silently become product ADRs
      await write(
        path.join(root, "AgentDoctorOS", "22_DECISIONS", "ADR-001_NORTH_STAR.md"),
        "# ADR-001 North Star\n\n## Decision\nInternal note\n",
      );

      expect(await isNestedRepositoryRoot(root, nested)).toBe(true);
      expect(await isNestedRepositoryRoot(root, root)).toBe(false);

      const ledger = await loadDecisionLedger(root);
      const titles = ledger.decisions.map((d) => d.title).join("\n");
      expect(titles).toContain("Owned ADR");
      expect(titles).not.toContain("Стратегия");
      expect(titles).not.toContain("Nested foreign ADR");
      expect(titles).not.toContain("North Star");
      expect(ledger.decisions).toHaveLength(1);
      expect(ledger.decisions[0]?.ownership).toBe("project_owned");
      expect(ledger.decisions[0]?.truthMeaning).toMatch(/does not prove/i);
      expect(ledger.decisions.every((d) => !d.id.includes(".private/"))).toBe(true);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("discoverFiles skips nested repos and private trees for project intelligence", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ad-own-disc-"));
    try {
      await write(path.join(root, "src", "app.ts"), "export const ok = 1;\n");
      await write(
        path.join(root, ".private", "oss-validation", "sigma", "src", "poison.ts"),
        "export const poison = true;\n",
      );
      const nested = path.join(root, "other-project");
      await fs.mkdir(path.join(nested, ".git"), { recursive: true });
      await write(path.join(nested, "src", "foreign.ts"), "export const foreign = 1;\n");

      const discovery = await discoverFiles({ root });
      const rels = discovery.files.map((f) => f.relativePath.replace(/\\/g, "/"));
      expect(rels.some((r) => r.endsWith("src/app.ts"))).toBe(true);
      expect(rels.some((r) => r.includes(".private/"))).toBe(false);
      expect(rels.some((r) => r.includes("other-project/"))).toBe(false);
      expect(
        discovery.directoriesSkipped.some(
          (d) => d.includes("nested_repository") || d.includes("private_workspace"),
        ),
      ).toBe(true);

      const dna = await buildProjectDna(root);
      const blob = JSON.stringify(dna);
      expect(blob).not.toContain("poison");
      expect(blob).not.toContain("foreign.ts");
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("detectProject file list excludes nested repository package markers from foreign trees", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ad-own-det-"));
    try {
      await write(path.join(root, "package.json"), JSON.stringify({ name: "host-app" }));
      const nested = path.join(root, "vendor-app");
      await fs.mkdir(path.join(nested, ".git"), { recursive: true });
      await write(path.join(nested, "package.json"), JSON.stringify({ name: "cloudflare-d1-app" }));
      const detection = await detectProject(root);
      const pkgs = detection.discovery.files
        .map((f) => f.relativePath.replace(/\\/g, "/"))
        .filter((r) => r.endsWith("package.json"));
      expect(pkgs).toEqual(["package.json"]);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("graph builders and secrets scan exclude .private, AgentDoctorOS, and nested repos", async () => {
    const { buildIntelligenceGraph, listTsFiles } =
      await import("../../../src/intelligence/graph/build.js");
    const { buildRepositoryGraph } = await import("../../../src/platform/graph/build.js");
    const { scanSecrets } = await import("../../../src/core/secrets/scan.js");
    const { buildSoftwareMap } = await import("../../../src/product/map/software-map.js");

    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ad-own-graph-"));
    try {
      await write(path.join(root, "package.json"), JSON.stringify({ name: "graph-host" }));
      await write(path.join(root, "src", "owned.ts"), "export const owned = 1;\n");

      await write(
        path.join(root, ".private", "oss-validation", "foreign", "src", "leak.ts"),
        "export class PageHighlightingComponent {}\n",
      );
      await write(
        path.join(root, "AgentDoctorOS", "leak.py"),
        "def internal_docs_should_not_graph():\n    return 1\n",
      );
      const nested = path.join(root, "nested-app");
      await fs.mkdir(path.join(nested, ".git"), { recursive: true });
      await write(path.join(nested, "src", "nested.ts"), "export const nested = 1;\n");

      const tsFiles = await listTsFiles(root);
      const tsRels = tsFiles.map((f) => path.relative(root, f).replace(/\\/g, "/"));
      expect(tsRels.some((r) => r.endsWith("src/owned.ts"))).toBe(true);
      expect(tsRels.some((r) => r.includes(".private/"))).toBe(false);
      expect(tsRels.some((r) => r.includes("nested-app/"))).toBe(false);

      const ast = await buildIntelligenceGraph({ root, mode: "typescript-ast" });
      const astPaths = ast.nodes.map((n) => String(n.path ?? "")).filter(Boolean);
      expect(astPaths.some((p) => p.includes(".private/"))).toBe(false);
      expect(astPaths.some((p) => p.includes("AgentDoctorOS/"))).toBe(false);
      expect(astPaths.some((p) => p.includes("nested-app/"))).toBe(false);

      const regex = await buildRepositoryGraph(root);
      const regexPaths = regex.nodes.map((n) => String(n.path ?? "")).filter(Boolean);
      expect(regexPaths.some((p) => p.includes(".private/"))).toBe(false);
      expect(regexPaths.some((p) => p.includes("AgentDoctorOS/"))).toBe(false);

      await write(
        path.join(root, ".private", "oss-validation", "foreign", "secret.env"),
        'API_KEY="leak_should_not_scan_aaaaaaaa"\n',
      );
      await write(path.join(root, ".env"), 'API_KEY="owned_scan_target_bbbbbbbb"\n');
      const secrets = await scanSecrets({ root, enabled: true, maxFiles: 50 });
      expect(secrets.findings.every((f) => !f.file.includes(".private/"))).toBe(true);
      expect(secrets.findings.every((f) => !f.file.includes("AgentDoctorOS/"))).toBe(true);

      const map = await buildSoftwareMap(root);
      const blob = JSON.stringify(map);
      expect(blob).not.toContain("AgentDoctorOS");
      expect(blob).not.toContain(".private");
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
