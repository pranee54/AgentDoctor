import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { AgentRuntime } from "../../src/agent/runtime.js";
import { AgentState } from "../../src/agent/state.js";
import { MockModelProvider } from "../../src/ai/index.js";

describe("E2E AgentRuntime.runTurn tool path", () => {
  it("blocks create_file without human approval", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ad-e2e-turn-noappr-"));
    await fs.writeFile(
      path.join(root, "package.json"),
      JSON.stringify({ name: "turn-noappr", private: true }),
    );
    const target = "src/new.ts";
    const provider = new MockModelProvider({
      script: [
        {
          content: "Creating file",
          toolCalls: [
            {
              id: "t1",
              name: "create_file",
              arguments: { path: target, content: "export const x = 1;\n" },
            },
          ],
        },
        { content: "Stopped" },
      ],
    });
    try {
      const runtime = new AgentRuntime({ root, provider, limits: { maxIterations: 4 } });
      const result = await runtime.runTurn({
        userMessage: "Add file",
        approvedByHuman: false,
        allowedTools: ["create_file"],
      });
      expect(result.state).toBe(AgentState.COMPLETED);
      const tool = result.toolResults?.find((t) => t.name === "create_file");
      expect(tool?.ok).toBe(false);
      expect(tool?.error).toMatch(/approval|Human approval/i);
      await expect(fs.stat(path.join(root, target))).rejects.toThrow();
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("executes create_file with approvedByHuman", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ad-e2e-turn-appr-"));
    await fs.writeFile(
      path.join(root, "package.json"),
      JSON.stringify({ name: "turn-appr", private: true }),
    );
    const target = "src/approved.ts";
    const provider = new MockModelProvider({
      script: [
        {
          content: "Creating file",
          toolCalls: [
            {
              id: "t1",
              name: "create_file",
              arguments: { path: target, content: "export const ok = true;\n" },
            },
          ],
        },
        { content: "Done" },
      ],
    });
    try {
      const runtime = new AgentRuntime({ root, provider, limits: { maxIterations: 4 } });
      const result = await runtime.runTurn({
        userMessage: "Add file",
        approvedByHuman: true,
        allowedTools: ["create_file"],
      });
      expect(result.state).toBe(AgentState.COMPLETED);
      expect(result.toolResults?.some((t) => t.name === "create_file" && t.ok)).toBe(true);
      const text = await fs.readFile(path.join(root, target), "utf8");
      expect(text).toContain("ok = true");
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
