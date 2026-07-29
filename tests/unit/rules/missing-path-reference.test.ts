import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { scan } from "../../../src/index.js";
import {
  extractPathCandidates,
  isLikelyLocalPathReference,
  resolveInstructionPathReference,
} from "../../../src/core/rules/instructions/missing-path-reference.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixturesRoot = path.resolve(here, "../../../fixtures");

const tempDirs: string[] = [];

async function tempRepo(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "agentdoctor-path-ref-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((d) => fs.rm(d, { recursive: true, force: true })));
});

function missingPathFindings(result: Awaited<ReturnType<typeof scan>>) {
  return result.findings.filter((f) => f.ruleId === "instructions/missing-path-reference");
}

describe("isLikelyLocalPathReference", () => {
  it("rejects CSS class selectors and CLI flags", () => {
    expect(isLikelyLocalPathReference(".content")).toBe(false);
    expect(isLikelyLocalPathReference(".button")).toBe(false);
    expect(isLikelyLocalPathReference("#app")).toBe(false);
    expect(isLikelyLocalPathReference("--verbose")).toBe(false);
    expect(isLikelyLocalPathReference("npm test")).toBe(false);
    expect(isLikelyLocalPathReference("GET /api/users")).toBe(false);
    expect(isLikelyLocalPathReference("true")).toBe(false);
    expect(isLikelyLocalPathReference("false")).toBe(false);
    expect(isLikelyLocalPathReference("camelCaseIdentifier")).toBe(false);
    expect(isLikelyLocalPathReference("ClassName")).toBe(false);
  });

  it("accepts repository-style and relative path references", () => {
    expect(isLikelyLocalPathReference("docs/API.md")).toBe(true);
    expect(isLikelyLocalPathReference("src/core/scanner/scan.ts")).toBe(true);
    expect(isLikelyLocalPathReference("./config/settings.json")).toBe(true);
    expect(isLikelyLocalPathReference("../shared/types.ts")).toBe(true);
    expect(isLikelyLocalPathReference("packages/mobile/")).toBe(true);
    expect(isLikelyLocalPathReference("proxyshield/backend/includes/config.php")).toBe(true);
  });
});

describe("resolveInstructionPathReference", () => {
  it("resolves repo-root-style paths from repository root", () => {
    const result = resolveInstructionPathReference(
      ".cursor/rules/example.mdc",
      "project/backend/includes/config.php",
    );
    expect(result).toEqual({
      status: "ok",
      pathsToCheck: ["project/backend/includes/config.php"],
      primaryRelative: "project/backend/includes/config.php",
    });
  });

  it("resolves explicit relative paths from the instruction file directory", () => {
    const result = resolveInstructionPathReference(
      ".cursor/rules/example.mdc",
      "../../docs/guide.md",
    );
    expect(result).toEqual({
      status: "ok",
      pathsToCheck: ["docs/guide.md"],
      primaryRelative: "docs/guide.md",
    });
  });

  it("flags traversal that escapes the repository", () => {
    const result = resolveInstructionPathReference("CLAUDE.md", "../../etc/passwd");
    expect(result.status).toBe("escape");
  });
});

describe("extractPathCandidates", () => {
  it("keeps markdown links and path-like backticks only", () => {
    const text = [
      "See `.content` and `--verbose` then run `npm test`.",
      "Read `docs/API.md` and [guide](docs/guide.md).",
    ].join("\n");
    expect(extractPathCandidates(text).sort()).toEqual(["docs/API.md", "docs/guide.md"]);
  });
});

describe("instructions/missing-path-reference regressions", () => {
  it("does not flag nested instruction + valid repo-root path", async () => {
    const findings = missingPathFindings(
      await scan({ cwd: path.join(fixturesRoot, "nested-root-path-ok") }),
    );
    expect(findings).toHaveLength(0);
  });

  it("resolves nested instruction + valid explicit relative path inside the repo", async () => {
    const findings = missingPathFindings(
      await scan({ cwd: path.join(fixturesRoot, "nested-relative-path-ok") }),
    );
    expect(findings).toHaveLength(0);
  });

  it("flags an actual missing repo-root path", async () => {
    const findings = missingPathFindings(
      await scan({ cwd: path.join(fixturesRoot, "nested-missing-path") }),
    );
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(
      findings.some((f) => f.evidence?.detail?.includes("project/docs/does-not-exist.md")),
    ).toBe(true);
    expect(findings.every((f) => !f.evidence?.detail?.includes(".cursor/rules/project/docs"))).toBe(
      true,
    );
  });

  it("does not flag CSS selector `.content`", async () => {
    const root = await tempRepo();
    await fs.writeFile(path.join(root, "package.json"), "{}\n");
    await fs.writeFile(path.join(root, "AGENTS.md"), "Style the `.content` block.\n");

    const findings = missingPathFindings(await scan({ cwd: root }));
    expect(findings).toHaveLength(0);
  });

  it("does not flag CLI flag `--verbose`", async () => {
    const root = await tempRepo();
    await fs.writeFile(path.join(root, "package.json"), "{}\n");
    await fs.writeFile(path.join(root, "AGENTS.md"), "Pass `--verbose` when debugging.\n");

    const findings = missingPathFindings(await scan({ cwd: root }));
    expect(findings).toHaveLength(0);
  });

  it("does not flag command `npm test`", async () => {
    const root = await tempRepo();
    await fs.writeFile(path.join(root, "package.json"), "{}\n");
    await fs.writeFile(path.join(root, "AGENTS.md"), "Always run `npm test`.\n");

    const findings = missingPathFindings(await scan({ cwd: root }));
    expect(findings).toHaveLength(0);
  });

  it("flags a real Markdown link to a missing local file", async () => {
    const root = await tempRepo();
    await fs.writeFile(path.join(root, "package.json"), "{}\n");
    await fs.writeFile(
      path.join(root, "CLAUDE.md"),
      "See [architecture](docs/architecture.md) for details.\n",
    );

    const findings = missingPathFindings(await scan({ cwd: root }));
    expect(findings.some((f) => f.evidence?.detail?.includes("docs/architecture.md"))).toBe(true);
  });

  it("never follows path traversal outside the repository", async () => {
    const root = await tempRepo();
    await fs.writeFile(path.join(root, "package.json"), "{}\n");
    await fs.writeFile(
      path.join(root, "CLAUDE.md"),
      "Do not read `../../etc/passwd` or `../outside.md`\n",
    );

    const result = await scan({ cwd: root });
    const findings = missingPathFindings(result);
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings.every((f) => f.message.includes("escapes the repository root"))).toBe(true);
    expect(JSON.stringify(result)).not.toMatch(/root:.*:.*passwd/);
  });

  it("keeps root AGENTS.md missing-path behavior", async () => {
    const root = await tempRepo();
    await fs.writeFile(path.join(root, "package.json"), "{}\n");
    await fs.writeFile(path.join(root, "AGENTS.md"), "Open `docs/missing-from-agents.md`.\n");

    const findings = missingPathFindings(await scan({ cwd: root }));
    expect(findings.some((f) => f.evidence?.path === "AGENTS.md")).toBe(true);
    expect(findings.some((f) => f.evidence?.detail?.includes("docs/missing-from-agents.md"))).toBe(
      true,
    );
  });

  it("keeps nested instruction missing-path detection when the root path is absent", async () => {
    const findings = missingPathFindings(
      await scan({ cwd: path.join(fixturesRoot, "nested-missing-path") }),
    );
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings.some((f) => f.evidence?.detail === "missing=src/does-not-exist.ts")).toBe(true);
  });

  it("ProxyShield fixture: only the intentionally missing path is flagged", async () => {
    const result = await scan({
      cwd: path.join(fixturesRoot, "proxyshield-path-regression"),
    });
    const findings = missingPathFindings(result);

    expect(
      findings.every(
        (f) => !String(f.evidence?.detail ?? "").includes(".cursor/rules/proxyshield"),
      ),
    ).toBe(true);
    expect(findings.every((f) => !String(f.message).includes("`.content`"))).toBe(true);

    const existing = [
      "proxyshield/backend/admin/includes/layout.php",
      "proxyshield/backend/admin/includes/icons.php",
      "proxyshield/backend/includes/config.php",
      "proxyshield/backend/includes/countries.json",
    ];
    for (const rel of existing) {
      expect(findings.some((f) => String(f.evidence?.detail ?? "").includes(rel))).toBe(false);
    }

    expect(findings).toHaveLength(1);
    expect(findings[0]?.evidence?.detail).toBe(
      "missing=proxyshield/backend/admin/includes/missing-helper.php",
    );
  });
});
