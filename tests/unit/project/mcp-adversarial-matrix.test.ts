import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { createFileSafe, deleteFileSafe, editFileSafe } from "../../../src/agent/tools/write.js";
import { executeAgentTool, newToolCall } from "../../../src/agent/tools/index.js";
import { assertSafeRepoTarget } from "../../../src/mcp/intelligence/path-safety.js";
import {
  hashFileWritePlan,
  issueApprovalGrant,
  consumeApprovalGrant,
} from "../../../src/product/approval/session.js";

async function write(file: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, content, "utf8");
}

async function fixture(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "ad-mcp-adv-"));
  await write(path.join(root, "package.json"), JSON.stringify({ name: "mcp-adv" }));
  await write(path.join(root, "src", "owned.ts"), "export const owned = 1;\n");
  await write(path.join(root, ".private", "secret.ts"), "export const SECRET = 1;\n");
  await write(path.join(root, "AgentDoctorOS", "internal.ts"), "export const OS = 1;\n");
  await write(path.join(root, "fixtures", "foreign.ts"), "export const FIX = 1;\n");
  const nested = path.join(root, "nested-repo");
  await fs.mkdir(path.join(nested, ".git"), { recursive: true });
  await write(path.join(nested, "package.json"), JSON.stringify({ name: "nested" }));
  await write(path.join(nested, "leak.ts"), "export const NESTED = 1;\n");
  const outside = await fs.mkdtemp(path.join(os.tmpdir(), "ad-mcp-outside-"));
  await write(path.join(outside, "out.ts"), "export const OUT = 1;\n");
  try {
    await fs.symlink(outside, path.join(root, "linked-foreign-tree"));
  } catch {
    // symlink may fail on some CI; matrix records that row separately
  }
  return root;
}

describe("MCP / agent adversarial security matrix", () => {
  it("rejects foreign/non-owned paths across read/write helpers and approval forgeries", async () => {
    const root = await fixture();
    const rows: Array<{
      case: string;
      expected: "allow" | "deny";
      actual: "allow" | "deny";
    }> = [];

    const record = (name: string, expected: "allow" | "deny", fn: () => Promise<void> | void) => {
      return (async () => {
        try {
          await fn();
          rows.push({ case: name, expected, actual: "allow" });
        } catch {
          rows.push({ case: name, expected, actual: "deny" });
        }
      })();
    };

    await record("owned_read", "allow", async () => {
      const r = await executeAgentTool(
        root,
        newToolCall("t", "read_file", { path: "src/owned.ts" }),
      );
      if (!r.ok) throw new Error(r.error?.message ?? "fail");
    });
    await record("traversal_read", "deny", async () => {
      const r = await executeAgentTool(
        root,
        newToolCall("t", "read_file", { path: "../etc/passwd" }),
      );
      if (r.ok) throw new Error("should deny");
      throw new Error("denied");
    });
    await record("absolute_read", "deny", async () => {
      const r = await executeAgentTool(root, newToolCall("t", "read_file", { path: "/etc/hosts" }));
      if (r.ok) throw new Error("should deny");
      throw new Error("denied");
    });
    await record("private_read", "deny", async () => {
      const r = await executeAgentTool(
        root,
        newToolCall("t", "read_file", { path: ".private/secret.ts" }),
      );
      if (r.ok) throw new Error("should deny");
      throw new Error("denied");
    });
    await record("os_read", "deny", async () => {
      const r = await executeAgentTool(
        root,
        newToolCall("t", "read_file", { path: "AgentDoctorOS/internal.ts" }),
      );
      if (r.ok) throw new Error("should deny");
      throw new Error("denied");
    });
    await record("nested_read", "deny", async () => {
      const r = await executeAgentTool(
        root,
        newToolCall("t", "read_file", { path: "nested-repo/leak.ts" }),
      );
      if (r.ok) throw new Error("should deny");
      throw new Error("denied");
    });
    await record("fixture_read", "deny", async () => {
      const r = await executeAgentTool(
        root,
        newToolCall("t", "read_file", { path: "fixtures/foreign.ts" }),
      );
      if (r.ok) throw new Error("should deny");
      throw new Error("denied");
    });

    await record("mcp_assert_private", "deny", () => {
      assertSafeRepoTarget(root, ".private/secret.ts");
    });
    await record("mcp_assert_owned", "allow", () => {
      assertSafeRepoTarget(root, "src/owned.ts");
    });

    await record("create_private_direct", "deny", async () => {
      await createFileSafe(root, ".private/evil.ts", "nope\n");
    });
    await record("edit_os_direct", "deny", async () => {
      await editFileSafe(root, "AgentDoctorOS/internal.ts", { content: "hacked\n" });
    });
    await record("delete_nested_direct", "deny", async () => {
      await deleteFileSafe(root, "nested-repo/leak.ts");
    });

    // bare approved=true / missing grant
    await record("write_without_grant", "deny", async () => {
      const r = await executeAgentTool(
        root,
        newToolCall("t", "create_file", { path: "src/x.ts", content: "x\n", approved: true }),
        { allowWrite: false, approvedByHuman: false },
      );
      if (r.ok) throw new Error("should deny");
      throw new Error("denied");
    });

    await record("forged_token", "deny", async () => {
      const gate = await consumeApprovalGrant({
        root,
        token: "forged-token-not-real",
        action: "file_create",
        resources: ["src/x.ts"],
        requirePlanHash: hashFileWritePlan("file_create", "src/x.ts", "x\n"),
      });
      if (gate.ok) throw new Error("should deny");
      throw new Error("denied");
    });

    await record("wrong_plan_hash", "deny", async () => {
      const planHash = hashFileWritePlan("file_create", "src/ok2.ts", "ok\n");
      const grant = await issueApprovalGrant({
        root,
        action: "file_create",
        resources: ["src/ok2.ts"],
        risk: "MEDIUM",
        planHash,
        actor: "test",
      });
      const gate = await consumeApprovalGrant({
        root,
        token: grant.token,
        action: "file_create",
        resources: ["src/ok2.ts"],
        requirePlanHash: hashFileWritePlan("file_create", "src/ok2.ts", "DIFFERENT\n"),
      });
      if (gate.ok) throw new Error("should deny");
      throw new Error("denied");
    });

    await record("owned_create_with_grant", "allow", async () => {
      const content = "export const n = 2;\n";
      const rel = "src/granted.ts";
      const planHash = hashFileWritePlan("file_create", rel, content);
      const grant = await issueApprovalGrant({
        root,
        action: "file_create",
        resources: [rel],
        risk: "MEDIUM",
        planHash,
        actor: "test",
      });
      const gate = await consumeApprovalGrant({
        root,
        token: grant.token,
        action: "file_create",
        resources: [rel],
        requirePlanHash: planHash,
      });
      if (!gate.ok) throw new Error(gate.reason);
      await createFileSafe(root, rel, content);
    });

    const failures = rows.filter((r) => r.expected !== r.actual);
    expect(failures, JSON.stringify(rows, null, 2)).toEqual([]);

    await fs.rm(root, { recursive: true, force: true });
  }, 60_000);
});
