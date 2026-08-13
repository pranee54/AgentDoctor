import type { Tool } from "@modelcontextprotocol/sdk/types.js";

import { toToolErrorPayload } from "../errors.js";
import type { BrainMcpSession } from "../session.js";
import {
  handleBrainClaims,
  handleBrainDelta,
  handleBrainEvidence,
  handleBrainExplain,
  handleBrainOverview,
  handleBrainOwnership,
  handleBrainQuery,
  handleBrainRisk,
  handleBrainSnapshot,
  handleBrainTrace,
} from "./handlers.js";

export const BRAIN_MCP_TOOL_NAMES = [
  "brain_overview",
  "brain_query",
  "brain_explain",
  "brain_trace",
  "brain_claims",
  "brain_evidence",
  "brain_ownership",
  "brain_risk",
  "brain_delta",
  "brain_snapshot",
] as const;

export type BrainMcpToolName = (typeof BRAIN_MCP_TOOL_NAMES)[number];

const emptyObjectSchema = {
  type: "object" as const,
  properties: {},
  additionalProperties: false as const,
};

export function listBrainMcpTools(): Tool[] {
  return [
    {
      name: "brain_overview",
      description:
        "READ: Compact Project Brain overview (domains, entrypoints, components, ownership/risk summaries, claim counts) with provenance. Not a file search.",
      inputSchema: emptyObjectSchema,
    },
    {
      name: "brain_query",
      description:
        "READ: Typed BrainQueryEngine query only (ProjectSummary, ListEntrypoints, ListRisks, Impact, …). No arbitrary code/shell. Does not invent facts.",
      inputSchema: {
        type: "object",
        properties: {
          type: {
            type: "string",
            description: "Query type or alias (e.g. ProjectSummary, find_risks, Impact)",
          },
          target: {
            type: "string",
            description: "Required for Impact / BlastRadius",
          },
          status: {
            type: "string",
            description: "Optional claim status filter for ListClaims",
          },
        },
        required: ["type"],
        additionalProperties: false,
      },
    },
    {
      name: "brain_explain",
      description:
        "READ: Evidence-backed explainClaim for a claim id. Returns claim, status, confidence, evidence, contradictions. Never invents reasons.",
      inputSchema: {
        type: "object",
        properties: {
          claimId: { type: "string", description: "Claim id" },
        },
        required: ["claimId"],
        additionalProperties: false,
      },
    },
    {
      name: "brain_trace",
      description:
        "READ: Deterministic capped traceBrain (max depth 25, max edges 5000). Modes: dependencies, dependents, entrypoint-downstream, blast-radius, domain-modules.",
      inputSchema: {
        type: "object",
        properties: {
          target: { type: "string" },
          mode: { type: "string" },
        },
        required: ["target"],
        additionalProperties: false,
      },
    },
    {
      name: "brain_claims",
      description:
        "READ: List claims with lifecycle status. Default truth filter: ACTIVE + CONTRADICTED only (excludes INVALIDATED/SUPERSEDED unless requested).",
      inputSchema: {
        type: "object",
        properties: {
          status: {
            type: "string",
            description: "ACTIVE | INVALIDATED | SUPERSEDED | CONTRADICTED",
          },
          includeHistorical: {
            type: "boolean",
            description: "When true without status, include INVALIDATED and SUPERSEDED",
          },
        },
        additionalProperties: false,
      },
    },
    {
      name: "brain_evidence",
      description:
        "READ: Typed evidence records after Brain redaction. Never returns secret plaintext. Optional evidenceId filter.",
      inputSchema: {
        type: "object",
        properties: {
          evidenceId: { type: "string" },
        },
        additionalProperties: false,
      },
    },
    {
      name: "brain_ownership",
      description:
        "READ: Ownership from explicit CODEOWNERS / MAINTAINERS / package metadata only. Missing → UNKNOWN. No git-blame.",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string" },
        },
        additionalProperties: false,
      },
    },
    {
      name: "brain_risk",
      description:
        "READ: Change-danger risk only (not SAST/vulnerabilities): critical entrypoint, centrality, coupling, ownership clarity, architecture conflict.",
      inputSchema: {
        type: "object",
        properties: {
          kind: { type: "string" },
        },
        additionalProperties: false,
      },
    },
    {
      name: "brain_delta",
      description:
        "READ: Compare two snapshots without mutating. Returns claim/component/ownership/risk deltas between fromSnapshot and toSnapshot.",
      inputSchema: {
        type: "object",
        properties: {
          fromSnapshot: { type: "string" },
          toSnapshot: { type: "string" },
        },
        required: ["fromSnapshot"],
        additionalProperties: false,
      },
    },
    {
      name: "brain_snapshot",
      description:
        "Snapshot ops. READ: current|history|compare|load. CONTROLLED WRITE: rebuild writes only under <root>/.agentdoctor/project-brain/ (never source/agent configs; refuses divergent overwrite).",
      inputSchema: {
        type: "object",
        properties: {
          action: { type: "string" },
          snapshotId: { type: "string" },
          leftId: { type: "string" },
          rightId: { type: "string" },
        },
        additionalProperties: false,
      },
    },
  ];
}

export async function invokeBrainMcpTool(
  session: BrainMcpSession,
  name: string,
  args: unknown,
): Promise<{ structured: unknown; isError: boolean }> {
  try {
    switch (name as BrainMcpToolName) {
      case "brain_overview":
        return { structured: await handleBrainOverview(session), isError: false };
      case "brain_query":
        return { structured: await handleBrainQuery(session, args), isError: false };
      case "brain_explain":
        return { structured: await handleBrainExplain(session, args), isError: false };
      case "brain_trace":
        return { structured: await handleBrainTrace(session, args), isError: false };
      case "brain_claims":
        return { structured: await handleBrainClaims(session, args), isError: false };
      case "brain_evidence":
        return { structured: await handleBrainEvidence(session, args), isError: false };
      case "brain_ownership":
        return { structured: await handleBrainOwnership(session, args), isError: false };
      case "brain_risk":
        return { structured: await handleBrainRisk(session, args), isError: false };
      case "brain_delta":
        return { structured: await handleBrainDelta(session, args), isError: false };
      case "brain_snapshot":
        return { structured: await handleBrainSnapshot(session, args), isError: false };
      default:
        return {
          structured: {
            ok: false as const,
            error: { code: "invalid_argument" as const, message: `unknown tool: ${name}` },
          },
          isError: true,
        };
    }
  } catch (error) {
    return { structured: toToolErrorPayload(error), isError: true };
  }
}
