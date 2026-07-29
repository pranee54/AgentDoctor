import { describe, expect, it } from "vitest";

import { agentRegistry, getAgentAdapter } from "../../../src/agents/registry.js";

describe("agentRegistry", () => {
  it("registers Cursor, Claude Code, and Codex adapters", () => {
    expect(agentRegistry.map((a) => a.id)).toEqual(["cursor", "claude-code", "codex"]);
  });

  it("looks up adapters by id", () => {
    expect(getAgentAdapter("cursor")?.displayName).toBe("Cursor");
    expect(getAgentAdapter("missing")).toBeUndefined();
  });

  it("exposes a stable detect() interface on every adapter", () => {
    for (const adapter of agentRegistry) {
      expect(typeof adapter.detect).toBe("function");
      expect(adapter.displayName.length).toBeGreaterThan(0);
    }
  });
});
