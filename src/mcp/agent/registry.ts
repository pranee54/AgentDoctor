import type { Tool } from "@modelcontextprotocol/sdk/types.js";

import { createModelProvider, loadAiConfig } from "../../ai/index.js";
import type { ModelProvider } from "../../ai/types.js";
import { ChatService } from "../../agent/chat/service.js";
import { buildAgentPlan } from "../../agent/plan.js";
import { executeAgentTool, newToolCall } from "../../agent/tools/index.js";
import { retrieveProjectContext } from "../../agent/context/retrieve.js";
import { summarizeProjectForChat } from "../../agent/chat/project-summary.js";
import {
  consumeApprovalGrant,
  issueApprovalGrant,
  hashPlanPayload,
  hashFileWritePlan,
} from "../../product/approval/session.js";
import type { ApprovalRisk } from "../../product/approval/model.js";
import { assertForensicReadOnly } from "../../product/forensic/mode.js";

export const AGENT_MCP_TOOL_NAMES = [
  "project_context",
  "project_ask",
  "code_search",
  "file_read",
  "file_create",
  "file_edit",
  "approval_issue",
  "agent_plan",
  "change_verify",
] as const;

export type AgentMcpToolName = (typeof AGENT_MCP_TOOL_NAMES)[number];

export function listAgentMcpTools(): Tool[] {
  return [
    {
      name: "project_context",
      description: "READ: Budgeted project context pack for a query (path-safe).",
      inputSchema: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"],
        additionalProperties: false,
      },
    },
    {
      name: "project_ask",
      description: "READ: One-shot Project Chat ask (requires AI provider; no file writes).",
      inputSchema: {
        type: "object",
        properties: { question: { type: "string" } },
        required: ["question"],
        additionalProperties: false,
      },
    },
    {
      name: "code_search",
      description: "READ: Search code via AgentDoctor graph search.",
      inputSchema: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"],
        additionalProperties: false,
      },
    },
    {
      name: "file_read",
      description: "READ: Path-safe file read inside workspace.",
      inputSchema: {
        type: "object",
        properties: { path: { type: "string" } },
        required: ["path"],
        additionalProperties: false,
      },
    },
    {
      name: "file_create",
      description:
        "WRITE: Create file. Requires approvalToken from issueApprovalGrant / CLI --approve. Bare approved=true is rejected.",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string" },
          content: { type: "string" },
          approvalToken: { type: "string" },
          approved: {
            type: "boolean",
            description: "Legacy flag — insufficient alone; approvalToken required",
          },
        },
        required: ["path", "content", "approvalToken"],
        additionalProperties: false,
      },
    },
    {
      name: "file_edit",
      description:
        "WRITE: Edit file. Requires approvalToken from issueApprovalGrant / CLI --approve.",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string" },
          content: { type: "string" },
          oldContent: { type: "string" },
          approvalToken: { type: "string" },
          approved: {
            type: "boolean",
            description: "Legacy flag — insufficient alone; approvalToken required",
          },
        },
        required: ["path", "approvalToken"],
        additionalProperties: false,
      },
    },
    {
      name: "approval_issue",
      description:
        "TRUSTED: Issue a short-lived approval grant for writes. Requires AGENTDOCTOR_MCP_TRUSTED_APPROVE=1 in the MCP server environment (not model-settable).",
      inputSchema: {
        type: "object",
        properties: {
          action: { type: "string" },
          resources: { type: "array", items: { type: "string" } },
          planHash: { type: "string" },
          risk: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] },
        },
        required: ["action", "resources", "planHash"],
        additionalProperties: false,
      },
    },
    {
      name: "agent_plan",
      description: "READ: Build a change plan without modifying files.",
      inputSchema: {
        type: "object",
        properties: { goal: { type: "string" } },
        required: ["goal"],
        additionalProperties: false,
      },
    },
    {
      name: "change_verify",
      description:
        "READ: Produce evidence/proof for current changes (may write evidence artifacts).",
      inputSchema: {
        type: "object",
        properties: { changeId: { type: "string" } },
        additionalProperties: false,
      },
    },
  ];
}

export async function invokeAgentMcpTool(
  root: string,
  name: string,
  args: Record<string, unknown>,
  options?: { provider?: ModelProvider },
): Promise<{ structured: unknown; isError: boolean }> {
  try {
    switch (name) {
      case "project_context": {
        const query = typeof args.query === "string" ? args.query : "";
        const bundle = await retrieveProjectContext({ root, query });
        return { structured: { ok: true, bundle }, isError: false };
      }
      case "project_ask": {
        const question = typeof args.question === "string" ? args.question : "";
        if (!question) {
          return {
            structured: {
              ok: false,
              error: { code: "invalid_argument", message: "question required" },
            },
            isError: true,
          };
        }
        const provider = options?.provider ?? createModelProvider(loadAiConfig());
        const chat = new ChatService({
          root,
          provider,
          persistAudit: false,
        });
        try {
          const response = await chat.ask(question);
          return {
            structured: { ok: response.status === "ok", response },
            isError: response.status !== "ok" && response.status !== "provider-none",
          };
        } finally {
          await chat.end();
        }
      }
      case "code_search": {
        const result = await executeAgentTool(
          root,
          newToolCall("mcp", "search_code", { query: args.query }),
        );
        return { structured: result, isError: !result.ok };
      }
      case "file_read": {
        const result = await executeAgentTool(
          root,
          newToolCall("mcp", "read_file", { path: args.path }),
        );
        return { structured: result, isError: !result.ok };
      }
      case "file_create": {
        assertForensicReadOnly(process.env.AGENTDOCTOR_FORENSIC_MODE === "1");
        const token = typeof args.approvalToken === "string" ? args.approvalToken : undefined;
        const pathArg = typeof args.path === "string" ? args.path : "";
        const content = typeof args.content === "string" ? args.content : "";
        const planHash = hashFileWritePlan("file_create", pathArg, content);
        const gate = await consumeApprovalGrant({
          root,
          token,
          action: "file_create",
          resources: [pathArg],
          requirePlanHash: planHash,
        });
        if (!gate.ok) {
          return {
            structured: {
              ok: false,
              error: { code: "approval_required", message: gate.reason },
            },
            isError: true,
          };
        }
        const result = await executeAgentTool(
          root,
          newToolCall("mcp", "create_file", { path: args.path, content: args.content }),
          { allowWrite: true, approvedByHuman: true },
        );
        return { structured: result, isError: !result.ok };
      }
      case "file_edit": {
        assertForensicReadOnly(process.env.AGENTDOCTOR_FORENSIC_MODE === "1");
        const token = typeof args.approvalToken === "string" ? args.approvalToken : undefined;
        const pathArg = typeof args.path === "string" ? args.path : "";
        const content = typeof args.content === "string" ? args.content : "";
        const planHash = hashFileWritePlan("file_edit", pathArg, content);
        const gate = await consumeApprovalGrant({
          root,
          token,
          action: "file_edit",
          resources: [pathArg],
          requirePlanHash: planHash,
        });
        if (!gate.ok) {
          return {
            structured: {
              ok: false,
              error: { code: "approval_required", message: gate.reason },
            },
            isError: true,
          };
        }
        const result = await executeAgentTool(
          root,
          newToolCall("mcp", "edit_file", {
            path: args.path,
            content: args.content,
            oldContent: args.oldContent,
          }),
          { allowWrite: true, approvedByHuman: true },
        );
        return { structured: result, isError: !result.ok };
      }
      case "approval_issue": {
        if (process.env.AGENTDOCTOR_MCP_TRUSTED_APPROVE !== "1") {
          return {
            structured: {
              ok: false,
              error: {
                code: "trust_required",
                message:
                  "approval_issue requires AGENTDOCTOR_MCP_TRUSTED_APPROVE=1 in the MCP host environment",
              },
            },
            isError: true,
          };
        }
        const resources = Array.isArray(args.resources)
          ? args.resources.filter((r): r is string => typeof r === "string")
          : [];
        const action = typeof args.action === "string" ? args.action : "file_edit";
        const planHash =
          typeof args.planHash === "string" && args.planHash.length >= 8
            ? args.planHash
            : hashPlanPayload(action);
        const risk = (typeof args.risk === "string" ? args.risk : "MEDIUM") as ApprovalRisk;
        try {
          const grant = await issueApprovalGrant({
            root,
            action,
            resources,
            risk,
            planHash,
            actor: "mcp-trusted-host",
          });
          return {
            structured: { ok: true, token: grant.token, expiresAt: grant.expiresAt, planHash },
            isError: false,
          };
        } catch (error) {
          return {
            structured: {
              ok: false,
              error: {
                code: "invalid_grant",
                message: error instanceof Error ? error.message : String(error),
              },
            },
            isError: true,
          };
        }
      }
      case "agent_plan": {
        const goal = typeof args.goal === "string" ? args.goal : "";
        const plan = await buildAgentPlan({ root, goal });
        return { structured: { ok: true, plan }, isError: false };
      }
      case "change_verify": {
        const { verifyChange } = await import("../../assurance/change.js");
        const result = await verifyChange({
          root,
          ...(typeof args.changeId === "string" ? { changeId: args.changeId } : {}),
        });
        return { structured: { ok: true, ...result }, isError: false };
      }
      default:
        return {
          structured: {
            ok: false,
            error: { code: "invalid_argument", message: `unknown agent tool: ${name}` },
          },
          isError: true,
        };
    }
  } catch (error) {
    return {
      structured: {
        ok: false,
        error: {
          code: "internal",
          message: error instanceof Error ? error.message : String(error),
        },
      },
      isError: true,
    };
  }
}

/** Convenience for tests */
export async function projectFingerprint(root: string): Promise<unknown> {
  return summarizeProjectForChat(root);
}
