import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { roleAllowedTools, rolePrompt, runRoleAgent } from "../../../src/agent/roles.js";

describe("agent roles", () => {
  it("returns role-specific prompts", () => {
    expect(rolePrompt("security")).toContain("security");
    expect(rolePrompt("planner")).toContain("planner");
  });

  it("filters tools per role", () => {
    const reviewer = roleAllowedTools("reviewer");
    expect(reviewer).toContain("read_file");
    expect(reviewer).not.toContain("delete_file");
    const coder = roleAllowedTools("coder");
    expect(coder).toContain("edit_file");
  });

  it("runRoleAgent wraps coding loop with role note", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ad-role-"));
    try {
      await fs.writeFile(path.join(root, "package.json"), JSON.stringify({ name: "role-test" }));
      const result = await runRoleAgent({
        role: "reviewer",
        root,
        goal: "Summarize repo layout",
        approvedByHuman: false,
        plan: {
          planId: "test-plan",
          root,
          goal: "Summarize repo layout",
          understanding: ["Minimal temp project"],
          steps: [{ id: "read", title: "Read files", detail: "Use read_file", risk: "LOW" }],
          filesLikelyAffected: [],
          risks: [],
          approvalLevel: "LOW",
          status: "draft",
          evidencePaths: [],
        },
      });
      expect(result.stoppedReason).toBe("awaiting-approval");
      expect(result.responseText.length).toBeGreaterThan(0);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
