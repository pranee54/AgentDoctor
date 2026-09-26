export type ApprovalState = "pending" | "approved" | "denied" | "expired";

export type ApprovalRisk = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface ApprovalRecord {
  id: string;
  action: string;
  reason: string;
  resources: string[];
  risk: ApprovalRisk;
  requirement?: string;
  state: ApprovalState;
  actor?: string;
  createdAt: string;
  decidedAt?: string;
  /** Must be true from trusted CLI/MCP session layer — never accept caller approved=true alone */
  approvedByHuman: boolean;
}

export interface ApprovalEvaluationInput {
  record: Omit<ApprovalRecord, "id" | "createdAt" | "state" | "approvedByHuman">;
  /** Explicit human gate from CLI `--approve` or authenticated session layer */
  approvedByHuman?: boolean;
  actor?: string;
}

export interface ApprovalEvaluationResult {
  record: ApprovalRecord;
  allowed: boolean;
  message: string;
  limitations: string[];
}

const LIMITATIONS = [
  "ApprovalRecord is an explicit abstraction — MCP/model callers cannot set approvedByHuman=true without a trusted session.",
  "CLI passes approvedByHuman via --approve; dashboard chat does not grant approval.",
  "This module does not persist approvals — use change ledger / audit trails separately.",
];

function newId(): string {
  return `apr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function evaluateApprovalRecord(input: ApprovalEvaluationInput): ApprovalEvaluationResult {
  const approvedByHuman = input.approvedByHuman === true;
  const now = new Date().toISOString();

  const base: ApprovalRecord = {
    id: newId(),
    action: input.record.action,
    reason: input.record.reason,
    resources: [...input.record.resources],
    risk: input.record.risk,
    ...(input.record.requirement !== undefined ? { requirement: input.record.requirement } : {}),
    state: "pending",
    ...(input.actor !== undefined ? { actor: input.actor } : {}),
    createdAt: now,
    approvedByHuman,
  };

  if (!approvedByHuman) {
    return {
      record: { ...base, state: "pending", approvedByHuman: false },
      allowed: false,
      message:
        "Human approval required — approvedByHuman must be true from trusted CLI/MCP session (not from model output).",
      limitations: LIMITATIONS,
    };
  }

  if (input.record.risk === "CRITICAL" && !input.record.reason.trim()) {
    return {
      record: { ...base, state: "denied", approvedByHuman: true, decidedAt: now },
      allowed: false,
      message: "CRITICAL actions require a non-empty reason even when approvedByHuman is true.",
      limitations: LIMITATIONS,
    };
  }

  return {
    record: {
      ...base,
      state: "approved",
      approvedByHuman: true,
      decidedAt: now,
    },
    allowed: true,
    message: "Explicit human approval recorded.",
    limitations: LIMITATIONS,
  };
}

export function formatApprovalRecordSummary(record: ApprovalRecord): string {
  return [
    `Approval ${record.id}`,
    `Action: ${record.action}`,
    `Risk: ${record.risk}`,
    `State: ${record.state}`,
    `approvedByHuman: ${record.approvedByHuman}`,
    record.requirement ? `Requirement: ${record.requirement}` : "",
    record.resources.length ? `Resources: ${record.resources.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
