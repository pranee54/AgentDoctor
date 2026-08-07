import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  isConcretePathReference,
  normalizePathReference,
  preparePathReference,
} from "../../../src/core/path-resolution/index.js";
import { scan } from "../../../src/index.js";

const tempDirs: string[] = [];

async function tempRepo(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "agentdoctor-path-prep-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((d) => fs.rm(d, { recursive: true, force: true })));
});

function missingPathFindings(result: Awaited<ReturnType<typeof scan>>) {
  return result.findings.filter((f) => f.ruleId === "instructions/missing-path-reference");
}

describe("normalizePathReference", () => {
  it("URI-decodes and unifies separators", () => {
    expect(normalizePathReference("docs/architecture%20docs/adrs/")).toBe(
      "docs/architecture docs/adrs/",
    );
    expect(normalizePathReference("artifacts\\agent-sentinel.txt")).toBe(
      "artifacts/agent-sentinel.txt",
    );
  });

  it("returns null for malformed percent-encoding", () => {
    expect(normalizePathReference("docs/%E0%A4%A")).toBeNull();
  });
});

describe("preparePathReference Stage 1", () => {
  it("rejects placeholders, ellipsis, home, git-ref shapes, and bundler module types", () => {
    expect(preparePathReference(".agents/rules/<rule-name>.mdc").status).toBe("reject");
    expect(preparePathReference("packages/core/<package>/migrations/").status).toBe("reject");
    expect(preparePathReference("skills-contrib/{skill}/SKILL.md").status).toBe("reject");
    expect(preparePathReference("bases/base/...")).toMatchObject({
      status: "reject",
      reason: "ellipsis",
    });
    expect(preparePathReference("~/bashrc")).toMatchObject({ status: "reject", reason: "home" });
    expect(preparePathReference("origin/main")).toMatchObject({
      status: "reject",
      reason: "git-ref",
    });
    expect(preparePathReference("feature/new-cli-command")).toMatchObject({
      status: "reject",
      reason: "git-ref",
    });
    expect(preparePathReference("asset/webmanifest")).toMatchObject({
      status: "reject",
      reason: "bundler-module-type",
    });
    expect(isConcretePathReference("docs/API.md")).toBe(true);
  });

  it("keeps concrete paths and exposes normalized form", () => {
    const prepared = preparePathReference("docs/architecture%20docs/patterns/x.md");
    expect(prepared).toEqual({
      status: "concrete",
      original: "docs/architecture%20docs/patterns/x.md",
      normalized: "docs/architecture docs/patterns/x.md",
    });
  });
});

describe("missing-path Stage 1 integration", () => {
  it("does not flag intentional placeholders", async () => {
    const root = await tempRepo();
    await fs.writeFile(path.join(root, "package.json"), "{}\n");
    await fs.writeFile(
      path.join(root, "AGENTS.md"),
      "Add `.agents/rules/<rule-name>.mdc` and `schemas/plugins/<Name>.json`.\n",
    );

    expect(missingPathFindings(await scan({ cwd: root }))).toHaveLength(0);
  });

  it("does not flag URI-encoded links that exist after decode", async () => {
    const root = await tempRepo();
    await fs.writeFile(path.join(root, "package.json"), "{}\n");
    await fs.mkdir(path.join(root, "docs", "architecture docs", "patterns"), { recursive: true });
    await fs.writeFile(
      path.join(root, "docs", "architecture docs", "patterns", "frozen.md"),
      "# ok\n",
    );
    await fs.writeFile(
      path.join(root, "AGENTS.md"),
      "See [frozen](docs/architecture%20docs/patterns/frozen.md).\n",
    );

    expect(missingPathFindings(await scan({ cwd: root }))).toHaveLength(0);
  });

  it("still flags a real missing concrete path", async () => {
    const root = await tempRepo();
    await fs.writeFile(path.join(root, "package.json"), "{}\n");
    await fs.writeFile(path.join(root, "AGENTS.md"), "Open `docs/still-missing.md`.\n");

    const findings = missingPathFindings(await scan({ cwd: root }));
    expect(findings.some((f) => f.evidence?.detail?.includes("docs/still-missing.md"))).toBe(true);
  });

  it("does not flag git-ref shaped backticks", async () => {
    const root = await tempRepo();
    await fs.writeFile(path.join(root, "package.json"), "{}\n");
    await fs.writeFile(
      path.join(root, "AGENTS.md"),
      "Compare against `origin/main` then branch `fix/bug-in-worker-threads`.\n",
    );

    expect(missingPathFindings(await scan({ cwd: root }))).toHaveLength(0);
  });
});
