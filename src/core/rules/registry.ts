import { claudeBypassPermissionsRule } from "./security/claude-bypass-permissions.js";
import { envFileExposureRule } from "./security/env-file-exposure.js";
import { mcpBroadFilesystemRule } from "./security/mcp-broad-filesystem.js";
import { privateKeyFileRule } from "./security/private-key-file.js";
import { generatedDirectoryRule } from "./context/generated-directory.js";
import { largeInstructionFileRule } from "./context/large-instruction-file.js";
import { largeLogFileRule } from "./context/large-log-file.js";
import { duplicateContentRule } from "./instructions/duplicate-content.js";
import { emptyInstructionsRule } from "./instructions/empty-instructions.js";
import { missingPathReferenceRule } from "./instructions/missing-path-reference.js";
import { duplicateMcpServerRule, malformedMcpRule } from "./mcp/mcp-rules.js";
import type { RuleDefinition } from "./types.js";

/**
 * Central rule registry. Add new rules by implementing RuleDefinition and appending here.
 */
export const ruleRegistry: readonly RuleDefinition[] = [
  envFileExposureRule,
  privateKeyFileRule,
  claudeBypassPermissionsRule,
  mcpBroadFilesystemRule,
  largeInstructionFileRule,
  largeLogFileRule,
  generatedDirectoryRule,
  emptyInstructionsRule,
  duplicateContentRule,
  missingPathReferenceRule,
  malformedMcpRule,
  duplicateMcpServerRule,
];

export function getRuleById(id: string): RuleDefinition | undefined {
  return ruleRegistry.find((rule) => rule.id === id);
}
