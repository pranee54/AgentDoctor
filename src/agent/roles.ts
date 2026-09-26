import { listAgentToolSpecs } from "./tools/registry.js";
import type { AgentToolName } from "./tools/types.js";
import { runCodingLoop, type CodingLoopOptions, type CodingLoopResult } from "./loop.js";

export type AgentRole =
  | "planner"
  | "coder"
  | "tester"
  | "reviewer"
  | "security"
  | "refactoring"
  | "migration"
  | "documentation"
  | "release"
  | "verifier";

const ALL_TOOL_NAMES: AgentToolName[] = listAgentToolSpecs({
  includeWrite: true,
  includeExecute: true,
}).map((t) => t.name);

const ROLE_TOOL_ALLOWLIST: Record<AgentRole, AgentToolName[]> = {
  planner: [
    "read_file",
    "list_files",
    "search_code",
    "find_symbol",
    "inspect_project",
    "inspect_architecture",
    "inspect_dependencies",
    "inspect_git_status",
    "inspect_git_diff",
  ],
  coder: ALL_TOOL_NAMES,
  tester: [
    "read_file",
    "list_files",
    "search_code",
    "find_symbol",
    "inspect_project",
    "inspect_tests",
    "run_tests",
    "run_command",
    "inspect_git_diff",
  ],
  reviewer: [
    "read_file",
    "list_files",
    "search_code",
    "find_symbol",
    "find_references",
    "find_callers",
    "find_callees",
    "inspect_project",
    "inspect_architecture",
    "inspect_findings",
    "inspect_git_diff",
  ],
  security: [
    "read_file",
    "list_files",
    "search_code",
    "inspect_project",
    "inspect_findings",
    "inspect_git_diff",
  ],
  refactoring: [
    "read_file",
    "list_files",
    "search_code",
    "find_symbol",
    "find_references",
    "find_callers",
    "find_callees",
    "inspect_dependencies",
    "edit_file",
    "create_file",
  ],
  migration: [
    "read_file",
    "list_files",
    "search_code",
    "find_symbol",
    "inspect_project",
    "create_file",
    "edit_file",
    "run_command",
    "run_tests",
  ],
  documentation: [
    "read_file",
    "list_files",
    "search_code",
    "inspect_project",
    "create_file",
    "edit_file",
  ],
  release: [
    "read_file",
    "list_files",
    "inspect_project",
    "inspect_git_status",
    "inspect_git_diff",
    "run_command",
    "run_tests",
  ],
  verifier: [
    "read_file",
    "list_files",
    "inspect_tests",
    "inspect_findings",
    "run_tests",
    "run_command",
    "inspect_git_diff",
  ],
};

const ROLE_PROMPTS: Record<AgentRole, string> = {
  planner:
    "Role: planner. Produce a concise, evidence-backed plan. Prefer read-only inspection; do not mutate files unless explicitly approved.",
  coder:
    "Role: coder. Implement the goal with minimal, focused diffs. Respect approval gates for writes and command execution.",
  tester:
    "Role: tester. Focus on test coverage, failing cases, and controlled test runs. Avoid unrelated refactors.",
  reviewer:
    "Role: reviewer. Critique changes for correctness, regressions, and architecture fit. Stay read-only.",
  security:
    "Role: security. Hunt for secrets, unsafe patterns, and auth gaps. Never exfiltrate or log secret values.",
  refactoring:
    "Role: refactoring. Improve structure without behavior changes; use reference/call tools before edits.",
  migration:
    "Role: migration. Coordinate mechanical moves/upgrades with verification after each batch.",
  documentation: "Role: documentation. Update docs and comments for accuracy; match project tone.",
  release:
    "Role: release. Prepare release checks (git status, tests, changelog hints); avoid drive-by changes.",
  verifier:
    "Role: verifier. Re-run tests and scans to confirm the goal is met; report evidence clearly.",
};

export function rolePrompt(role: AgentRole): string {
  return ROLE_PROMPTS[role];
}

export function roleAllowedTools(role: AgentRole): AgentToolName[] {
  return [...ROLE_TOOL_ALLOWLIST[role]];
}

export type RoleAgentOptions = CodingLoopOptions & {
  role: AgentRole;
};

/**
 * Same coding loop as the main agent, with a role-specific system note prepended to the goal.
 */
export async function runRoleAgent(options: RoleAgentOptions): Promise<CodingLoopResult> {
  const allowed = new Set(roleAllowedTools(options.role));
  const roleNote = [
    rolePrompt(options.role),
    `Allowed tools for this role: ${[...allowed].join(", ")}.`,
    "If a tool is outside the role allowlist, explain the limitation instead of attempting it.",
  ].join("\n");

  const goal = `${roleNote}\n\nUser goal:\n${options.goal}`;

  const filteredToolCalls = options.toolCalls?.filter((tc) => allowed.has(tc.name));

  return runCodingLoop({
    ...options,
    goal,
    allowedTools: [...allowed],
    ...(filteredToolCalls !== undefined ? { toolCalls: filteredToolCalls } : {}),
  });
}
