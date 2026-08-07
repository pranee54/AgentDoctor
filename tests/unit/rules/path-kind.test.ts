import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  isCheckedInGithubActionDist,
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

  it("detects hyphenated, underscored, camelCase, and leading-underscore test trees", () => {
    expect(
      isSampleOrTestPath(
        "integration-test/spring-boot-sni-integration-tests/app/resources/test-hello-server.key",
      ),
    ).toBe(true);
    expect(isSampleOrTestPath("module/amqp/src/dockerTest/resources/server.key")).toBe(true);
    expect(isSampleOrTestPath("module/mail/src/testFixtures/resources/test-key.pem")).toBe(true);
    expect(isSampleOrTestPath("smoke-test/kafka/ssl.key")).toBe(true);
    expect(isSampleOrTestPath("_fixture/certs/key.pem")).toBe(true);
    expect(isSampleOrTestPath("packages/demo/integration_tests/tls/server.key")).toBe(true);
    expect(isSampleOrTestPath("services/api/docker-test/certs/client.p12")).toBe(true);
    expect(isSampleOrTestPath("app/src/httpTest/resources/server.key")).toBe(true);
    expect(isSampleOrTestPath("playground/env/.env")).toBe(true);
    expect(isSampleOrTestPath("packages/vite/playgrounds/ssr/.env.development")).toBe(true);
    expect(isSampleOrTestPath("bench/vercel/.env.dev")).toBe(true);
    expect(isSampleOrTestPath("examples/with-env/.env")).toBe(true);
    expect(isSampleOrTestPath("sandbox/demo-app/.env")).toBe(true);
  });

  it("does not treat production roots as samples", () => {
    expect(isSampleOrTestPath(".env")).toBe(false);
    expect(isSampleOrTestPath("config/.env")).toBe(false);
    expect(isSampleOrTestPath("test-private-key.pem")).toBe(false);
    expect(isSampleOrTestPath("app-signing.pem")).toBe(false);
    expect(isSampleOrTestPath("docs-assets/app/.env")).toBe(false);
    expect(isSampleOrTestPath("config/certs/server.key")).toBe(false);
    expect(isSampleOrTestPath("deploy/secrets/id_rsa")).toBe(false);
    expect(isSampleOrTestPath("src/main/resources/keystore.p12")).toBe(false);
  });
});

describe("isSourceNamedArtifactCollision", () => {
  it("detects source packages named build/target/vendor under code parents or src ancestors", () => {
    expect(isSourceNamedArtifactCollision("scripts/build")).toBe(true);
    expect(isSourceNamedArtifactCollision("internal/build")).toBe(true);
    expect(isSourceNamedArtifactCollision("cmd/build")).toBe(true);
    expect(isSourceNamedArtifactCollision("src/target")).toBe(true);
    expect(isSourceNamedArtifactCollision("packages/astro/src/core/build")).toBe(true);
    expect(isSourceNamedArtifactCollision("packages/astro/src/assets/utils/vendor")).toBe(true);
    expect(isSourceNamedArtifactCollision("adev/src/assets/images/guide/build")).toBe(true);
    expect(isSourceNamedArtifactCollision("src/Mvc/build")).toBe(true);
    expect(isSourceNamedArtifactCollision("src/node-fallbacks/vendor")).toBe(true);
  });

  it("keeps real generated build/dist paths", () => {
    expect(isSourceNamedArtifactCollision("build")).toBe(false);
    expect(isSourceNamedArtifactCollision("packages/actions/dist")).toBe(false);
    expect(isSourceNamedArtifactCollision("apps/web/build")).toBe(false);
    expect(isSourceNamedArtifactCollision("frontend/build")).toBe(false);
    expect(isSourceNamedArtifactCollision("packages/foo/src/js/dist")).toBe(false);
    expect(isSourceNamedArtifactCollision("packages/react-router/vendor")).toBe(false);
  });
});

describe("isCheckedInGithubActionDist", () => {
  it("detects Action package dist folders only", () => {
    expect(isCheckedInGithubActionDist(".github/actions/needs-triage/dist")).toBe(true);
    expect(isCheckedInGithubActionDist(".github/actions/validate-docs-links/dist")).toBe(true);
    expect(isCheckedInGithubActionDist(".github/workflows/dist")).toBe(false);
    expect(isCheckedInGithubActionDist("packages/actions/dist")).toBe(false);
    expect(isCheckedInGithubActionDist(".github/actions/needs-triage/src")).toBe(false);
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

  it("skips hyphenated and camelCase TLS test trees but keeps production keys", async () => {
    const root = await tempRepo();
    await fs.writeFile(path.join(root, "package.json"), "{}\n");
    await fs.writeFile(path.join(root, "AGENTS.md"), "demo\n");
    await fs.mkdir(path.join(root, "config/certs"), { recursive: true });
    await fs.writeFile(
      path.join(root, "config/certs/server.key"),
      "-----BEGIN PRIVATE KEY-----\nP\n",
    );
    await fs.mkdir(path.join(root, "integration-test/app/resources"), { recursive: true });
    await fs.writeFile(
      path.join(root, "integration-test/app/resources/test-hello-server.key"),
      "-----BEGIN PRIVATE KEY-----\nT\n",
    );
    await fs.mkdir(path.join(root, "module/src/dockerTest/resources"), { recursive: true });
    await fs.writeFile(
      path.join(root, "module/src/dockerTest/resources/server.key"),
      "-----BEGIN PRIVATE KEY-----\nD\n",
    );
    await fs.mkdir(path.join(root, "module/src/testFixtures/resources"), { recursive: true });
    await fs.writeFile(
      path.join(root, "module/src/testFixtures/resources/test-key.pem"),
      "-----BEGIN PRIVATE KEY-----\nF\n",
    );
    await fs.mkdir(path.join(root, "_fixture/certs"), { recursive: true });
    await fs.writeFile(
      path.join(root, "_fixture/certs/key.pem"),
      "-----BEGIN PRIVATE KEY-----\nU\n",
    );
    await fs.mkdir(path.join(root, "smoke-test/ssl"), { recursive: true });
    await fs.writeFile(path.join(root, "smoke-test/ssl/ssl.key"), "-----BEGIN PRIVATE KEY-----\nS\n");

    const result = await scan({ cwd: root });
    const keys = result.findings.filter((f) => f.ruleId === "security/private-key-file");
    const paths = keys.map((f) => f.evidence?.path);

    expect(paths).toContain("config/certs/server.key");
    expect(paths).not.toContain("integration-test/app/resources/test-hello-server.key");
    expect(paths).not.toContain("module/src/dockerTest/resources/server.key");
    expect(paths).not.toContain("module/src/testFixtures/resources/test-key.pem");
    expect(paths).not.toContain("_fixture/certs/key.pem");
    expect(paths).not.toContain("smoke-test/ssl/ssl.key");
  });

  it("skips playground and bench .env fixtures but keeps production .env", async () => {
    const root = await tempRepo();
    await fs.writeFile(path.join(root, "package.json"), "{}\n");
    await fs.writeFile(path.join(root, "AGENTS.md"), "demo\n");
    await fs.writeFile(path.join(root, ".env"), "SECRET=prod\n");
    await fs.mkdir(path.join(root, "config"), { recursive: true });
    await fs.writeFile(path.join(root, "config/.env"), "SECRET=config\n");
    await fs.mkdir(path.join(root, "playground/env"), { recursive: true });
    await fs.writeFile(path.join(root, "playground/env/.env"), "VITE_DEMO=1\n");
    await fs.writeFile(path.join(root, "playground/env/.env.development"), "VITE_DEMO=1\n");
    await fs.mkdir(path.join(root, "bench/vercel"), { recursive: true });
    await fs.writeFile(path.join(root, "bench/vercel/.env.dev"), "TOKEN=bench\n");
    await fs.mkdir(path.join(root, "examples/with-env"), { recursive: true });
    await fs.writeFile(path.join(root, "examples/with-env/.env"), "DEMO=1\n");
    await fs.mkdir(path.join(root, "sandbox/app"), { recursive: true });
    await fs.writeFile(path.join(root, "sandbox/app/.env"), "DEMO=1\n");

    const result = await scan({ cwd: root });
    const env = result.findings.filter((f) => f.ruleId === "security/env-file-exposure");
    const paths = env.map((f) => f.evidence?.path);

    expect(paths).toContain(".env");
    expect(paths).toContain("config/.env");
    expect(paths).not.toContain("playground/env/.env");
    expect(paths).not.toContain("playground/env/.env.development");
    expect(paths).not.toContain("bench/vercel/.env.dev");
    expect(paths).not.toContain("examples/with-env/.env");
    expect(paths).not.toContain("sandbox/app/.env");
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

  it("skips source-named build/vendor under src and checked-in Action dist", async () => {
    const root = await tempRepo();
    await fs.writeFile(path.join(root, "package.json"), "{}\n");
    await fs.writeFile(path.join(root, "AGENTS.md"), "demo\n");
    await fs.mkdir(path.join(root, "packages/lib/src/core/build"), { recursive: true });
    await fs.writeFile(path.join(root, "packages/lib/src/core/build/index.ts"), "export {}\n");
    await fs.mkdir(path.join(root, "packages/lib/src/utils/vendor"), { recursive: true });
    await fs.writeFile(path.join(root, "packages/lib/src/utils/vendor/x.js"), "1\n");
    await fs.mkdir(path.join(root, ".github/actions/needs-triage/dist"), { recursive: true });
    await fs.writeFile(path.join(root, ".github/actions/needs-triage/dist/index.js"), "1\n");
    await fs.mkdir(path.join(root, "packages/ui/dist"), { recursive: true });
    await fs.writeFile(path.join(root, "packages/ui/dist/index.js"), "1\n");
    await fs.mkdir(path.join(root, "build"), { recursive: true });
    await fs.writeFile(path.join(root, "build/out.js"), "1\n");

    const result = await scan({ cwd: root });
    const generated = result.findings.filter((f) => f.ruleId === "context/generated-directory");
    const paths = generated.map((f) => f.evidence?.path);

    expect(paths).not.toContain("packages/lib/src/core/build");
    expect(paths).not.toContain("packages/lib/src/utils/vendor");
    expect(paths).not.toContain(".github/actions/needs-triage/dist");
    expect(paths).toContain("packages/ui/dist");
    expect(paths).toContain("build");
  });
});
