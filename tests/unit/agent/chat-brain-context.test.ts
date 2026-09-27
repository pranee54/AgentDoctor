/**
 * Brain → Project Chat bridge: ask must consume searchable Brain evidence.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { answerDeterministicProjectQuestion } from "../../../src/agent/chat/deterministic.js";
import { formatChatResponseForCli } from "../../../src/agent/chat/response.js";
import { NoneModelProvider } from "../../../src/ai/index.js";
import { ChatService } from "../../../src/agent/chat/service.js";
import {
  extractQueryTerms,
  isControlPlaneRelativePath,
} from "../../../src/agent/context/brain-evidence.js";
import { retrieveProjectContext } from "../../../src/agent/context/retrieve.js";
import { rebuildBrain, searchBrain, loadLatestBrain } from "../../../src/core/brain-cli/service.js";
import { LocalBrainStore } from "../../../src/core/understanding/brain/index.js";
import { OWNERSHIP_BOUNDARY_VERSION } from "../../../src/project/ownership.js";

const temps: string[] = [];

async function mkProject(prefix: string): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  temps.push(root);
  return root;
}

afterEach(async () => {
  while (temps.length) {
    const p = temps.pop();
    if (p) await fs.rm(p, { recursive: true, force: true });
  }
});

async function seedProxyshieldFixture(root: string): Promise<void> {
  await fs.mkdir(path.join(root, "proxyshield", "backend", "admin", "assets"), { recursive: true });
  await fs.mkdir(path.join(root, "src"), { recursive: true });
  await fs.writeFile(
    path.join(root, "package.json"),
    JSON.stringify({ name: "network-chat-fixture" }),
  );
  await fs.writeFile(
    path.join(root, "proxyshield", "backend", "admin", "users.php"),
    "<?php\n// Users admin for Proxyshield\nfunction list_users() { return []; }\n",
  );
  await fs.writeFile(
    path.join(root, "proxyshield", "backend", "admin", "user.php"),
    "<?php\n// Single user endpoint\nfunction get_user($id) { return $id; }\n",
  );
  await fs.writeFile(
    path.join(root, "proxyshield", "backend", "admin", "config.php"),
    "<?php\n// Config for Proxyshield\nconst PROXYSHIELD_CONFIG = true;\n",
  );
  await fs.writeFile(path.join(root, "src", "app.py"), "def main():\n    print('network')\n");
  await fs.writeFile(
    path.join(root, "proxyshield", "backend", "admin", "assets", "chart.umd.min.js"),
    "class Os {}\nclass Js {}\n",
  );
  // Hostile control-plane decoy — must never become VERIFIED application evidence.
  await fs.mkdir(path.join(root, ".agentdoctor", "platform", "sessions"), { recursive: true });
  await fs.writeFile(
    path.join(root, ".agentdoctor", "platform", "sessions", "fake.json"),
    JSON.stringify({
      authentication_system: "fake-oauth-master-key",
      login: "this must not become VERIFIED project evidence",
    }),
  );
}

describe("brain → chat evidence bridge", () => {
  it("extractQueryTerms keeps module names and drops stopwords", () => {
    expect(extractQueryTerms("What is the Proxyshield module?")).toEqual(["Proxyshield"]);
    expect(extractQueryTerms("What does Proxyshield provide?")).toEqual(["Proxyshield"]);
    expect(isControlPlaneRelativePath(".agentdoctor/platform/sessions/fake.json")).toBe(true);
    expect(isControlPlaneRelativePath("proxyshield/backend/admin/users.php")).toBe(false);
  });

  it("brain search remains usable after rebuild", async () => {
    const root = await mkProject("ad-brain-chat-search-");
    await seedProxyshieldFixture(root);
    const brain = await rebuildBrain(root);
    const proxyHits = searchBrain(brain, "Proxyshield");
    const userHits = searchBrain(brain, "Users");
    expect(proxyHits.length + userHits.length).toBeGreaterThan(0);
  });

  it("ask Proxyshield / Users uses Brain evidence instead of UNKNOWN-only", async () => {
    const root = await mkProject("ad-brain-chat-ask-");
    await seedProxyshieldFixture(root);
    await rebuildBrain(root);

    const proxy = await answerDeterministicProjectQuestion({
      root,
      question: "What is the Proxyshield module?",
      sessionId: "t-proxy",
    });
    const users = await answerDeterministicProjectQuestion({
      root,
      question: "What is the Users module?",
      sessionId: "t-users",
    });
    const provides = await answerDeterministicProjectQuestion({
      root,
      question: "What does Proxyshield provide?",
      sessionId: "t-provides",
    });
    const components = await answerDeterministicProjectQuestion({
      root,
      question: "What components belong to Proxyshield?",
      sessionId: "t-comp",
    });

    for (const res of [proxy, users, provides, components]) {
      const cli = formatChatResponseForCli(res);
      expect(
        res.truthClaims.some((c) => c.label === "UNKNOWN" && /Insufficient/i.test(c.text)),
      ).toBe(false);
      expect(
        res.citations.some((c) => c.source === "brain" || c.evidenceType === "project-brain") ||
          /Brain evidence|PROVIDES|CONTAINS|module/i.test(res.message),
      ).toBe(true);
      expect(cli).not.toMatch(/Insufficient repository evidence was retrieved/);
    }

    expect(proxy.message).toMatch(/Proxyshield|Brain/i);
    expect(provides.message + JSON.stringify(provides.citations)).toMatch(/PROVIDES|Users|Brain/i);
  });

  it("architecture ask prefers Brain / filtered evidence over raw minified graph noise", async () => {
    const root = await mkProject("ad-brain-chat-arch-");
    await seedProxyshieldFixture(root);
    await rebuildBrain(root);

    const res = await answerDeterministicProjectQuestion({
      root,
      question: "Explain the architecture of this project",
      sessionId: "t-arch",
    });
    const noisy = (res.message.match(/chart\.umd\.min\.js/g) ?? []).length;
    const hasBrain =
      res.citations.some((c) => c.source === "brain") || /Brain evidence/i.test(res.message);
    expect(hasBrain || /\[VERIFIED\] Project/i.test(res.message)).toBe(true);
    expect(noisy).toBeLessThan(4);
  });

  it("unsupported questions stay UNKNOWN", async () => {
    const root = await mkProject("ad-brain-chat-unknown-");
    await seedProxyshieldFixture(root);
    await rebuildBrain(root);

    const res = await answerDeterministicProjectQuestion({
      root,
      question: "What is the quantum payment subsystem?",
      sessionId: "t-quantum",
    });
    expect(
      res.truthClaims.some((c) => c.label === "UNKNOWN") ||
        /Insufficient|UNKNOWN/i.test(res.message),
    ).toBe(true);
    expect(res.citations.filter((c) => c.source === "brain")).toHaveLength(0);
  });

  it("control-plane decoy under .agentdoctor cannot become VERIFIED source evidence", async () => {
    const root = await mkProject("ad-brain-chat-cp-");
    await seedProxyshieldFixture(root);
    await rebuildBrain(root);

    const ctx = await retrieveProjectContext({
      root,
      query: "Explain the authentication system",
      includePaths: [".agentdoctor/platform/sessions/fake.json"],
    });
    const verifiedPaths = ctx.citations
      .filter((c) => c.confidence === "VERIFIED" && c.evidenceType === "source-code")
      .map((c) => c.path ?? "");
    expect(verifiedPaths.some((p) => p.includes(".agentdoctor"))).toBe(false);
    expect(
      ctx.citations.some(
        (c) =>
          c.path?.includes(".agentdoctor/platform/sessions/fake.json") &&
          c.confidence === "VERIFIED" &&
          c.evidenceType === "source-code",
      ),
    ).toBe(false);

    const ask = await answerDeterministicProjectQuestion({
      root,
      question: "Explain the authentication system",
      sessionId: "t-auth-cp",
    });
    expect(ask.message).not.toMatch(/fake-oauth-master-key/);
    expect(
      ask.citations.some(
        (c) =>
          c.confidence === "VERIFIED" &&
          c.evidenceType === "source-code" &&
          (c.path?.includes(".agentdoctor") || c.excerpt?.includes("fake-oauth")),
      ),
    ).toBe(false);
  });

  it("stale ownership-boundary brain cannot become current evidence", async () => {
    const root = await mkProject("ad-brain-chat-stale-");
    await seedProxyshieldFixture(root);
    await rebuildBrain(root);

    const store = LocalBrainStore.underRepo(root);
    const meta = await store.readMeta();
    await store.writeMeta({
      ...meta,
      ownershipBoundaryVersion: OWNERSHIP_BOUNDARY_VERSION - 1,
    });

    expect(await loadLatestBrain(root)).toBeNull();
    const ctx = await retrieveProjectContext({ root, query: "Proxyshield" });
    expect(ctx.citations.filter((c) => c.source === "brain")).toHaveLength(0);
    expect(ctx.limitations.some((l) => /brain/i.test(l))).toBe(true);
  });

  it("ChatService none-provider ask surfaces Brain for Proxyshield", async () => {
    const root = await mkProject("ad-brain-chat-svc-");
    await seedProxyshieldFixture(root);
    await rebuildBrain(root);
    const chat = new ChatService({
      root,
      provider: new NoneModelProvider(),
      persistAudit: false,
    });
    try {
      const res = await chat.ask("What is the Proxyshield module?");
      expect(res.status).toBe("ok");
      expect(formatChatResponseForCli(res)).not.toMatch(
        /Insufficient repository evidence was retrieved/,
      );
    } finally {
      await chat.end();
    }
  });
});
