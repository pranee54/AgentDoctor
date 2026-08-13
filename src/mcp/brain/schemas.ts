import type { BrainQueryType } from "../../core/understanding/brain/index.js";
import type { TraceMode } from "../../core/understanding/brain/index.js";
import { BrainMcpError } from "./errors.js";

export const BRAIN_MCP_QUERY_TYPES = [
  "ProjectSummary",
  "ListDomains",
  "ListComponents",
  "ListEntrypoints",
  "ListDependencies",
  "ListRelationships",
  "ListArchitectures",
  "ListOwnership",
  "ListRisks",
  "ListClaims",
  "ListEvidence",
  "ListContradictions",
  "ListUnknowns",
  "ListInvalidations",
  "Impact",
  "BlastRadius",
] as const satisfies readonly BrainQueryType[];

export const BRAIN_MCP_TRACE_MODES = [
  "dependencies",
  "dependents",
  "entrypoint-downstream",
  "blast-radius",
  "domain-modules",
] as const satisfies readonly TraceMode[];

export const CLAIM_STATUSES = ["ACTIVE", "INVALIDATED", "SUPERSEDED", "CONTRADICTED"] as const;

export type ClaimStatusFilter = (typeof CLAIM_STATUSES)[number];

const QUERY_ALIASES: Record<string, BrainQueryType> = {
  project_summary: "ProjectSummary",
  find_component: "ListComponents",
  find_module: "ListComponents",
  find_entrypoint: "ListEntrypoints",
  find_ownership: "ListOwnership",
  find_risks: "ListRisks",
  find_claims: "ListClaims",
  find_dependencies: "ListDependencies",
  find_relationships: "ListRelationships",
  list_domains: "ListDomains",
  list_components: "ListComponents",
  list_entrypoints: "ListEntrypoints",
  list_dependencies: "ListDependencies",
  list_relationships: "ListRelationships",
  list_architectures: "ListArchitectures",
  list_ownership: "ListOwnership",
  list_risks: "ListRisks",
  list_claims: "ListClaims",
  list_evidence: "ListEvidence",
  list_contradictions: "ListContradictions",
  list_unknowns: "ListUnknowns",
  list_invalidations: "ListInvalidations",
  impact: "Impact",
  blast_radius: "BlastRadius",
};

export function resolveQueryType(input: string): BrainQueryType {
  const trimmed = input.trim();
  if ((BRAIN_MCP_QUERY_TYPES as readonly string[]).includes(trimmed)) {
    return trimmed as BrainQueryType;
  }
  const alias = QUERY_ALIASES[trimmed.toLowerCase()];
  if (alias) {
    return alias;
  }
  throw new BrainMcpError(
    "unsupported_query",
    `unsupported query type "${input}"; supported: ${BRAIN_MCP_QUERY_TYPES.join(", ")}`,
  );
}

export function resolveTraceMode(input: string | undefined): TraceMode {
  if (input === undefined || input.trim() === "") {
    return "blast-radius";
  }
  const trimmed = input.trim();
  if ((BRAIN_MCP_TRACE_MODES as readonly string[]).includes(trimmed)) {
    return trimmed as TraceMode;
  }
  throw new BrainMcpError(
    "invalid_argument",
    `unsupported trace mode "${input}"; supported: ${BRAIN_MCP_TRACE_MODES.join(", ")}`,
  );
}

export function parseClaimStatus(input: string | undefined): ClaimStatusFilter | undefined {
  if (input === undefined || input.trim() === "") {
    return undefined;
  }
  const trimmed = input.trim().toUpperCase();
  if ((CLAIM_STATUSES as readonly string[]).includes(trimmed)) {
    return trimmed as ClaimStatusFilter;
  }
  throw new BrainMcpError(
    "invalid_argument",
    `invalid claim status "${input}"; expected one of ${CLAIM_STATUSES.join(", ")}`,
  );
}

export function requireString(
  value: unknown,
  field: string,
  options: { allowEmpty?: boolean } = {},
): string {
  if (typeof value !== "string") {
    throw new BrainMcpError("invalid_argument", `${field} must be a string`);
  }
  if (!options.allowEmpty && value.trim().length === 0) {
    throw new BrainMcpError("invalid_argument", `${field} must not be empty`);
  }
  if (/[\r\n\0]/.test(value)) {
    throw new BrainMcpError("invalid_argument", `${field} must not contain control characters`);
  }
  return value.trim();
}

export function asObject(value: unknown): Record<string, unknown> {
  if (value === undefined || value === null) {
    return {};
  }
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new BrainMcpError("invalid_argument", "arguments must be an object");
  }
  return value as Record<string, unknown>;
}
