import fs from "node:fs/promises";
import path from "node:path";
import { createHash, randomBytes } from "node:crypto";

import { resolveRepoRoot } from "../../utils/path.js";
import { atomicWriteTextFile } from "../../utils/fs.js";
import type { ApprovalRisk } from "./model.js";

/**
 * Trusted approval grants — MCP/agent writes must present a grant token
 * issued by CLI `--approve` or an authenticated session, not a bare approved=true.
 */
export interface ApprovalGrant {
  token: string;
  root: string;
  action: string;
  resources: string[];
  risk: ApprovalRisk;
  planHash: string;
  actor: string;
  createdAt: string;
  expiresAt: string;
  consumed: boolean;
  scope: "write" | "execute" | "write+execute";
}

function grantsPath(root: string): string {
  return path.join(resolveRepoRoot(root), ".agentdoctor", "approvals", "grants.json");
}

async function loadGrants(root: string): Promise<ApprovalGrant[]> {
  try {
    const raw = await fs.readFile(grantsPath(root), "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as ApprovalGrant[];
  } catch {
    return [];
  }
}

async function saveGrants(root: string, grants: ApprovalGrant[]): Promise<void> {
  const file = grantsPath(root);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await atomicWriteTextFile(file, `${JSON.stringify(grants, null, 2)}\n`);
}

export function hashPlanPayload(payload: string): string {
  return createHash("sha256").update(payload).digest("hex").slice(0, 32);
}

/** Stable plan hash for a file write operation (path + content). */
export function hashFileWritePlan(action: string, relativePath: string, content: string): string {
  return hashPlanPayload(`${action}\n${relativePath}\n${content}`);
}

function normalizeResources(resources: string[]): string[] {
  return [...new Set(resources.map((r) => r.replace(/\\/g, "/").replace(/^\.\//, "")))].filter(
    Boolean,
  );
}

function resourceCovers(granted: string, requested: string): boolean {
  if (granted === requested) return true;
  // Directory prefix grants (e.g. "src/" or "src") cover children — never bare "*".
  const g = granted.endsWith("/") ? granted : `${granted}/`;
  return requested.startsWith(g);
}

export async function issueApprovalGrant(options: {
  root: string;
  action: string;
  resources: string[];
  risk: ApprovalRisk;
  planHash: string;
  actor?: string;
  scope?: ApprovalGrant["scope"];
  ttlMs?: number;
}): Promise<ApprovalGrant> {
  const root = resolveRepoRoot(options.root);
  const resources = normalizeResources(options.resources);
  if (resources.length === 0) {
    throw new Error(
      "Approval grant requires at least one concrete resource path (wildcards alone rejected).",
    );
  }
  if (resources.some((r) => r === "*" || r === "**")) {
    throw new Error("Bare '*' resource grants are rejected — list concrete paths or directories.");
  }
  if (!options.planHash || options.planHash.length < 8) {
    throw new Error("Approval grant requires a planHash binding the exact operation.");
  }

  const now = Date.now();
  const grant: ApprovalGrant = {
    token: `agt_${randomBytes(24).toString("hex")}`,
    root,
    action: options.action,
    resources,
    risk: options.risk,
    planHash: options.planHash,
    actor: options.actor ?? "cli-human",
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + (options.ttlMs ?? 30 * 60_000)).toISOString(),
    consumed: false,
    scope: options.scope ?? "write+execute",
  };
  const grants = await loadGrants(root);
  grants.push(grant);
  await saveGrants(root, grants.slice(-200));
  return grant;
}

export interface ConsumeApprovalResult {
  ok: boolean;
  reason: string;
  grant?: ApprovalGrant;
}

/**
 * Validate and optionally consume a grant token for a write/execute action.
 * Bare `approved: true` without a valid token is NEVER sufficient.
 */
export async function consumeApprovalGrant(options: {
  root: string;
  token: string | undefined;
  action: string;
  resources: string[];
  /** Required for MCP/agent writes — binds token to exact operation payload */
  requirePlanHash: string;
  consume?: boolean;
}): Promise<ConsumeApprovalResult> {
  const root = resolveRepoRoot(options.root);
  if (!options.token || typeof options.token !== "string" || !options.token.startsWith("agt_")) {
    return {
      ok: false,
      reason:
        "Trusted approval token required (issue via CLI --approve / issueApprovalGrant). Bare approved=true is rejected.",
    };
  }

  const requested = normalizeResources(options.resources);
  if (requested.length === 0) {
    return { ok: false, reason: "Consume requires at least one concrete resource path." };
  }

  if (!options.requirePlanHash) {
    return { ok: false, reason: "Consume requires requirePlanHash bound to the exact operation." };
  }

  const grants = await loadGrants(root);
  const idx = grants.findIndex((g) => g.token === options.token);
  if (idx < 0) {
    return { ok: false, reason: "Approval token not found for this project." };
  }
  const grant = grants[idx]!;
  if (grant.consumed) {
    return { ok: false, reason: "Approval token already consumed." };
  }
  if (Date.parse(grant.expiresAt) < Date.now()) {
    return { ok: false, reason: "Approval token expired." };
  }
  if (path.resolve(grant.root) !== path.resolve(root)) {
    return { ok: false, reason: "Approval token root mismatch." };
  }
  if (grant.action !== options.action) {
    return {
      ok: false,
      reason: `Approval token action mismatch (granted=${grant.action}, requested=${options.action}).`,
    };
  }
  if (grant.planHash !== options.requirePlanHash) {
    return {
      ok: false,
      reason: "Approval token planHash mismatch — operation changed after approval.",
    };
  }

  for (const res of requested) {
    const ok = grant.resources.some((g) => resourceCovers(g, res));
    if (!ok) {
      return {
        ok: false,
        reason: `Resource not covered by approval grant: ${res}`,
      };
    }
  }

  if (options.consume !== false) {
    grants[idx] = { ...grant, consumed: true };
    await saveGrants(root, grants);
  }

  return { ok: true, reason: "Approval grant accepted", grant };
}
