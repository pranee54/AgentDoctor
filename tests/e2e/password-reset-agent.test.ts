import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { AgentRuntime } from "../../src/agent/runtime.js";
import { AgentState } from "../../src/agent/state.js";
import { MockModelProvider } from "../../src/ai/index.js";

describe("E2E password reset agent flow", () => {
  it("creates reset route file after approval with mock tool script", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ad-e2e-pwreset-"));
    await fs.mkdir(path.join(root, "src", "auth"), { recursive: true });
    await fs.writeFile(
      path.join(root, "package.json"),
      JSON.stringify({ name: "pw-reset-fixture", private: true }),
    );
    await fs.writeFile(
      path.join(root, "src", "auth", "login.ts"),
      "export function login() { return true; }\n",
    );

    const target = "src/auth/password-reset.ts";
    const provider = new MockModelProvider({
      script: [
        {
          content: "Creating password reset stub",
          toolCalls: [
            {
              id: "t1",
              name: "create_file",
              arguments: {
                path: target,
                content:
                  "export function requestPasswordReset(email: string) { return { email, token: 'stub' }; }\n",
              },
            },
          ],
        },
        { content: "Done" },
      ],
    });

    try {
      const runtime = new AgentRuntime({ root, provider, limits: { maxIterations: 5 } });
      const result = await runtime.runTurn({
        userMessage: "Add password reset stub",
        approvedByHuman: true,
        allowedTools: ["create_file"],
      });
      expect(result.state).toBe(AgentState.COMPLETED);
      expect(result.toolResults?.some((t) => t.name === "create_file" && t.ok)).toBe(true);
      const abs = path.join(root, target);
      expect(await fs.stat(abs)).toBeTruthy();
      const content = await fs.readFile(abs, "utf8");
      expect(content).toMatch(/requestPasswordReset/);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  }, 60_000);
});
