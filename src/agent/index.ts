export { AgentState, AgentStateMachine } from "./state.js";
export type { AgentStateTransition } from "./state.js";
export { AgentRuntime, DEFAULT_AGENT_LIMITS } from "./runtime.js";
export type {
  AgentLimits,
  AgentAuditEvent,
  AgentRuntimeOptions,
  AgentTurnResult,
} from "./runtime.js";
export { retrieveProjectContext } from "./context/retrieve.js";
export type { RetrieveContextOptions } from "./context/retrieve.js";
export type { ContextBundle, ContextCitation, EvidenceType, TruthLabel } from "./context/types.js";
export { truthLabelHelp, minTruth } from "./context/truth.js";

/** Project Chat (2.1 Milestone 2) */
export {
  ChatService,
  createChatService,
  ChatMemory,
  CHAT_PROVIDER_NONE_MESSAGE,
  buildChatTurnResponse,
  formatChatResponseForCli,
  describeTruthLabels,
  PROJECT_CHAT_SYSTEM_PROMPT,
  wrapProjectData,
  summarizeProjectForChat,
  formatProjectSummary,
} from "./chat/index.js";
export type {
  ChatTurnResponse,
  ChatMemorySnapshot,
  ChatMessage as ProjectChatMessage,
  TruthClaim,
  ChatServiceOptions,
  ProjectChatSummary,
} from "./chat/index.js";

/** Agent tools + plan/approval (2.1 Milestone 3) */
export {
  listAgentToolSpecs,
  getToolSpec,
  riskForTool,
  executeAgentTool,
  isReadTool,
  newToolCall,
} from "./tools/index.js";
export type {
  AgentToolName,
  AgentToolSpec,
  AgentToolCall,
  AgentToolResult,
  AgentRiskLevel,
} from "./tools/index.js";
export { evaluateApproval, formatApprovalPrompt } from "./approvals.js";
export type { ApprovalRequest, ApprovalResult, ApprovalDecision } from "./approvals.js";
export { buildAgentPlan, formatAgentPlan, approvePlan } from "./plan.js";
export type { AgentPlan, AgentPlanStep } from "./plan.js";
export { runCodingLoop } from "./loop.js";
export type { CodingLoopOptions, CodingLoopResult } from "./loop.js";
export { rolePrompt, roleAllowedTools, runRoleAgent } from "./roles.js";
export type { AgentRole, RoleAgentOptions } from "./roles.js";
export { verifyAgentWork, formatVerificationReport } from "./verify.js";
export type { AgentVerificationReport, VerificationCheck } from "./verify.js";
export {
  getModeProfile,
  defaultStudentMode,
  parseAgentMode,
  modeAllowsMutation,
  modeBlocksToolCategory,
} from "./modes.js";
export type { AgentMode, ModeProfile } from "./modes.js";
export { StudentService } from "./student.js";
export type { StudentDocSection, BuildWithMeResult } from "./student.js";
