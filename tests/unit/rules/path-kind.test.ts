import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  isSampleOrTestPath,
  isSourceNamedArtifactCollision,
} from "../../../src/core/rules/path-kind.js";
import { scan } from "../../../src/index.js";

const tempDirs: string[] = [];

async function tempRepo(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "agentdoctor-path-kind-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((d) => fs.rm(d, { recursive: true, force: true })));
});

describe("isSampleOrTestPath", () => {
  it("detects fixture, test, example, sample, and integration directory segments", () => {
    expect(isSampleOrTestPath("pkg/e2e/fixtures/dotenv/.env")).toBe(true);
    expect(isSampleOrTestPath("tests/unit/adapters/key.pem")).toBe(true);
    expect(isSampleOrTestPath("testdata/key.pem")).toBe(true);
    expect(isSampleOrTestPath("examples/tls/self_signed_certs/key.pem")).toBe(true);
    expect(isSampleOrTestPath("packages/adapter/test/private.key")).toBe(true);
    expect(isSampleOrTestPath("tests/test_apps/.env")).toBe(true);
    expect(isSampleOrTestPath("integration/microservices/src/tcp-tls/privkey.pem")).toBe(true);
    expect(isSampleOrTestPath("packages/react-router/__tests__/vendor")).toBe(true);
    expect(isSampleOrTestPath(".github/codeql/tests/unsanitized-response-to-terminal/vendor")).toBe(
      true,
    );
  });

  it("does not treat production roots as samples", () => {
    expect(isSampleOrTestPath(".env")).toBe(false);
    expect(isSampleOrTestPath("config/.env")).toBe(false);
    expect(isSampleOrTestPath("test-private-key.pem")).toBe(false);
    expect(isSampleOrTestPath("app-signing.pem")).toBe(false);
    expect(isSampleOrTestPath("docs-assets/app/.env")).toBe(false);
  });
});

describe("isSourceNamedArtifactCollision", () => {
  it("detects source packages named build/target under code parents", () => {
    expect(isSourceNamedArtifactCollision("scripts/build")).toBe(true);
    expect(isSourceNamedArtifactCollision("internal/build")).toBe(true);
    expect(isSourceNamedArtifactCollision("cmd/build")).toBe(true);
    expect(isSourceNamedArtifactCollision("src/target")).toBe(true);
  });

  it("keeps real generated build/dist paths", () => {
    expect(isSourceNamedArtifactCollision("build")).toBe(false);
    expect(isSourceNamedArtifactCollision("packages/actions/dist")).toBe(false);
    expect(isSourceNamedArtifactCollision("apps/web/build")).toBe(false);
    expect(isSourceNamedArtifactCollision("frontend/build")).toBe(false);
  });
});

describe("sample/test path suppression across security rules", () => {
  it("skips fixture .env and test PEM but still flags root secrets", async () => {
    const root = await tempRepo();
    await fs.writeFile(path.join(root, "package.json"), "{}\n");
    await fs.writeFile(path.join(root, "AGENTS.md"), "demo\n");
    await fs.writeFile(path.join(root, ".env"), "SECRET=1\n");
    await fs.writeFile(path.join(root, "root-key.pem"), "-----BEGIN PRIVATE KEY-----\nA\n");
    await fs.mkdir(path.join(root, "pkg/e2e/fixtures/dotenv"), { recursive: true });
    await fs.writeFile(path.join(root, "pkg/e2e/fixtures/dotenv/.env"), "SECRET=fixture\n");
    await fs.mkdir(path.join(root, "tests/unit"), { recursive: true });
    await fs.writeFile(path.join(root, "tests/unit/key.pem"), "-----BEGIN PRIVATE KEY-----\nB\n");
    await fs.mkdir(path.join(root, "examples/tls"), { recursive: true });
    await fs.writeFile(path.join(root, "examples/tls/key.pem"), "-----BEGIN PRIVATE KEY-----\nC\n");

    const result = await scan({ cwd: root });
    const env = result.findings.filter((f) => f.ruleId === "security/env-file-exposure");
    const keys = result.findings.filter((f) => f.ruleId === "security/private-key-file");

    expect(env.some((f) => f.evidence?.path === ".env")).toBe(true);
    expect(env.every((f) => f.evidence?.path !== "pkg/e2e/fixtures/dotenv/.env")).toBe(true);
    expect(keys.some((f) => f.evidence?.path === "root-key.pem")).toBe(true);
    expect(keys.every((f) => f.evidence?.path !== "tests/unit/key.pem")).toBe(true);
    expect(keys.every((f) => f.evidence?.path !== "examples/tls/key.pem")).toBe(true);
  });

  it("does not flag .env.example variants including dotted suffixes", async () => {
    const root = await tempRepo();
    await fs.writeFile(path.join(root, "package.json"), "{}\n");
    await fs.writeFile(path.join(root, "AGENTS.md"), "demo\n");
    await fs.writeFile(path.join(root, ".env"), "SECRET=1\n");
    await fs.writeFile(path.join(root, ".env.example"), "SECRET=\n");
    await fs.writeFile(path.join(root, ".env.local.example"), "SECRET=\n");
    await fs.writeFile(path.join(root, ".env.testing.example"), "SECRET=\n");

    const result = await scan({ cwd: root });
    const env = result.findings.filter((f) => f.ruleId === "security/env-file-exposure");
    expect(env).toHaveLength(1);
    expect(env[0]?.evidence?.path).toBe(".env");
  });

  it("skips integration-tree keys and generated dirs under test trees", async () => {
    const root = await tempRepo();
    await fs.writeFile(path.join(root, "package.json"), "{}\n");
    await fs.writeFile(path.join(root, "AGENTS.md"), "demo\n");
    await fs.mkdir(path.join(root, "integration/tcp-tls"), { recursive: true });
    await fs.writeFile(
      path.join(root, "integration/tcp-tls/privkey.pem"),
      "-----BEGIN PRIVATE KEY-----\nX\n",
    );
    await fs.mkdir(path.join(root, "packages/lib/__tests__/vendor/pkg"), { recursive: true });
    await fs.writeFile(path.join(root, "packages/lib/__tests__/vendor/pkg/x.js"), "1\n");
    await fs.mkdir(path.join(root, "dist/app"), { recursive: true });
    await fs.writeFile(path.join(root, "dist/app/out.js"), "1\n");

    const result = await scan({ cwd: root });
    const keys = result.findings.filter((f) => f.ruleId === "security/private-key-file");
    const generated = result.findings.filter((f) => f.ruleId === "context/generated-directory");

    expect(keys.every((f) => f.evidence?.path !== "integration/tcp-tls/privkey.pem")).toBe(true);
    expect(generated.every((f) => f.evidence?.path !== "packages/lib/__tests__/vendor")).toBe(true);
    expect(generated.some((f) => f.evidence?.path === "dist")).toBe(true);
  });

  it("does not label scripts/build or internal/build as generated output", async () => {
    const root = await tempRepo();
    await fs.writeFile(path.join(root, "package.json"), "{}\n");
    await fs.writeFile(path.join(root, "AGENTS.md"), "demo\n");
    await fs.mkdir(path.join(root, "scripts/build"), { recursive: true });
    await fs.writeFile(path.join(root, "scripts/build/main.ts"), "export {}\n");
    await fs.mkdir(path.join(root, "internal/build"), { recursive: true });
    await fs.writeFile(path.join(root, "internal/build/build.go"), "package build\n");
    await fs.mkdir(path.join(root, "frontend/build"), { recursive: true });
    await fs.writeFile(path.join(root, "frontend/build/index.html"), "<html></html>\n");

    const result = await scan({ cwd: root });
    const generated = result.findings.filter((f) => f.ruleId === "context/generated-directory");

    expect(generated.every((f) => f.evidence?.path !== "scripts/build")).toBe(true);
    expect(generated.every((f) => f.evidence?.path !== "internal/build")).toBe(true);
    expect(generated.some((f) => f.evidence?.path === "frontend/build")).toBe(true);
  });
});
