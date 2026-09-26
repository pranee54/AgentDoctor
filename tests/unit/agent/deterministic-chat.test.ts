import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { ChatService } from "../../../src/agent/chat/service.js";
import { NoneModelProvider } from "../../../src/ai/index.js";

describe("deterministic chat", () => {
  it("answers architecture questions without LLM", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ad-det-chat-"));
    await fs.writeFile(
      path.join(root, "package.json"),
      JSON.stringify({ name: "det-chat", dependencies: { express: "^4.0.0" } }),
    );
    try {
      const chat = new ChatService({
        root,
        provider: new NoneModelProvider(),
        persistAudit: false,
      });
      const res = await chat.ask("How does authentication work in this architecture?");
      expect(res.status).toBe("ok");
      expect(res.provider).toBe("deterministic");
      expect(res.message).toMatch(/Deterministic project answer/i);
      expect(res.message).toMatch(/det-chat/);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  }, 60_000);

  it("surfaces auth and entry paths from graph when explaining a real JS project", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ad-det-auth-"));
    await fs.mkdir(path.join(root, "src"));
    await fs.writeFile(
      path.join(root, "package.json"),
      JSON.stringify({ name: "campus-lite", type: "module" }),
    );
    await fs.writeFile(path.join(root, "src/auth.js"), "export function login(){ return true; }\n");
    await fs.writeFile(
      path.join(root, "src/server.js"),
      'import { login } from "./auth.js";\nexport function start(){ login(); }\n',
    );
    await fs.writeFile(
      path.join(root, "src/db.js"),
      "export async function query(){ return []; }\n",
    );
    try {
      const chat = new ChatService({
        root,
        provider: new NoneModelProvider(),
        persistAudit: false,
      });
      const explain = await chat.ask("Explain my project.");
      expect(explain.message).toMatch(/Graph:/i);
      const auth = await chat.ask("How does authentication work?");
      expect(auth.message).toMatch(/src\/auth\.js/);
      const start = await chat.ask("Where does the application start?");
      expect(start.message).toMatch(/src\/server\.js/);
      const db = await chat.ask("Where is the database accessed?");
      expect(db.message).toMatch(/src\/db\.js/);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  }, 60_000);
});
