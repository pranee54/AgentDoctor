import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  AgentRuntime,
  AgentState,
  AgentStateMachine,
  retrieveProjectContext,
} from "../../../src/agent/index.js";
import {
  AI_PROVIDER_REQUIRED_MESSAGE,
  MockModelProvider,
  NoneModelProvider,
} from "../../../src/ai/index.js";

describe("AgentStateMachine", () => {
  it("allows IDLE → UNDERSTANDING → EXECUTING → VERIFYING → COMPLETED", () => {
    const m = new AgentStateMachine();
    m.transition(AgentState.UNDERSTANDING);
    m.transition(AgentState.EXECUTING);
    m.transition(AgentState.VERIFYING);
    m.transition(AgentState.COMPLETED);
    expect(m.state).toBe(AgentState.COMPLETED);
    expect(m.history).toHaveLength(4);
  });

  it("rejects illegal transitions", () => {
    const m = new AgentStateMachine();
    expect(() => m.transition(AgentState.VERIFYING)).toThrow(/Illegal agent state/);
  });
});

describe("AgentRuntime", () => {
  it("returns clear message when provider is none", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ad-agent-none-"));
    try {
      const runtime = new AgentRuntime({ root, provider: new NoneModelProvider() });
      const result = await runtime.runTurn({ userMessage: "Explain my project" });
      expect(result.responseText).toBe(AI_PROVIDER_REQUIRED_MESSAGE);
      expect(result.state).toBe(AgentState.FAILED);
      expect(result.audit.some((e) => e.type === "model-error")).toBe(true);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("completes a mock turn and records state transitions", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ad-agent-mock-"));
    try {
      const runtime = new AgentRuntime({ root, provider: new MockModelProvider() });
      const result = await runtime.runTurn({
        userMessage: "How does login work?",
        systemPrompt: "You are AgentDoctor.",
      });
      expect(result.state).toBe(AgentState.COMPLETED);
      expect(result.responseText).toContain("[AI-GENERATED mock]");
      expect(result.transitions.map((t) => t.to)).toEqual([
        AgentState.UNDERSTANDING,
        AgentState.EXECUTING,
        AgentState.VERIFYING,
        AgentState.COMPLETED,
      ]);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("enforces maxIterations", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ad-agent-limit-"));
    try {
      const runtime = new AgentRuntime({
        root,
        provider: new MockModelProvider(),
        limits: { maxIterations: 0 },
      });
      const result = await runtime.runTurn({ userMessage: "hi" });
      expect(result.state).toBe(AgentState.FAILED);
      expect(result.providerError).toMatch(/maxIterations/);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});

describe("retrieveProjectContext", () => {
  it("returns VERIFIED citations for in-repo files and rejects path escape", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ad-ctx-"));
    try {
      await fs.mkdir(path.join(root, "src"), { recursive: true });
      await fs.writeFile(path.join(root, "package.json"), '{"name":"ctx-demo"}\n');
      await fs.writeFile(
        path.join(root, "src", "auth.ts"),
        "export function login() { return true; }\n",
      );

      const bundle = await retrieveProjectContext({
        root,
        query: "auth login",
        includePaths: ["src/auth.ts", "../../etc/passwd"],
        budgetTokens: 4_000,
      });

      expect(
        bundle.citations.some((c) => c.path === "src/auth.ts" && c.confidence === "VERIFIED"),
      ).toBe(true);
      expect(
        bundle.citations.some(
          (c) => c.path?.includes("etc/passwd") && c.note?.includes("path_escape"),
        ),
      ).toBe(true);
      expect(bundle.rendered).toContain("src/auth.ts");
      expect(bundle.rendered).not.toMatch(/root:.*\/etc\/passwd/i);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  }, 30_000);

  it("rejects .private and AgentDoctorOS includePaths (ownership, not just containment)", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ad-ctx-own-"));
    try {
      await fs.mkdir(path.join(root, "src"), { recursive: true });
      await fs.mkdir(path.join(root, ".private", "secret-project"), { recursive: true });
      await fs.mkdir(path.join(root, "AgentDoctorOS"), { recursive: true });
      await fs.writeFile(path.join(root, "package.json"), '{"name":"ctx-own"}\n');
      await fs.writeFile(path.join(root, "src", "ok.ts"), "export const OK = 1;\n");
      await fs.writeFile(
        path.join(root, ".private", "secret-project", "secret.ts"),
        "export const FOREIGN_PROJECT_SECRET_123 = 1;\n",
      );
      await fs.writeFile(
        path.join(root, "AgentDoctorOS", "internal.ts"),
        "export const FOREIGN_SIGMA_PROJECT_456 = 1;\n",
      );

      const bundle = await retrieveProjectContext({
        root,
        query: "leak",
        includePaths: [
          "src/ok.ts",
          ".private/secret-project/secret.ts",
          "AgentDoctorOS/internal.ts",
        ],
        budgetTokens: 4_000,
      });

      expect(bundle.rendered).not.toContain("FOREIGN_PROJECT_SECRET_123");
      expect(bundle.rendered).not.toContain("FOREIGN_SIGMA_PROJECT_456");
      expect(
        bundle.citations.some((c) => c.path === "src/ok.ts" && c.confidence === "VERIFIED"),
      ).toBe(true);
      expect(
        bundle.citations.some(
          (c) =>
            c.path === ".private/secret-project/secret.ts" && c.note?.includes("ownership_denied"),
        ),
      ).toBe(true);
      expect(
        bundle.citations.some(
          (c) => c.path === "AgentDoctorOS/internal.ts" && c.note?.includes("ownership_denied"),
        ),
      ).toBe(true);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  }, 30_000);
});
