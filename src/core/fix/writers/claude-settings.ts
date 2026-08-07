import fs from "node:fs/promises";
import path from "node:path";

import { readTextFile } from "../../../utils/fs.js";
import { claudeReadDenyRule } from "../../rules/claude-deny.js";
import type { FixAction } from "../types.js";

const MAX_BYTES = 512 * 1024;
const SETTINGS_RELATIVE = ".claude/settings.json";

export interface ClaudeSettingsWritePreview {
  targetRelativePath: typeof SETTINGS_RELATIVE;
  denyRulesToAdd: string[];
  before: string;
  after: string;
  preview: string;
}

interface ClaudeSettingsJson {
  permissions?: {
    deny?: unknown;
    allow?: unknown;
    ask?: unknown;
    defaultMode?: unknown;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export function denyRuleForFixPattern(pattern: string, evidencePath: string): string {
  const isDirectory = pattern.endsWith("/");
  return claudeReadDenyRule(evidencePath, isDirectory ? "directory" : "file");
}

export function missingClaudeDenyRules(
  currentContent: string | null,
  denyRules: string[],
): string[] {
  const existing = parseDenyList(currentContent);
  const missing: string[] = [];
  for (const rule of denyRules) {
    if (existing.includes(rule)) {
      continue;
    }
    missing.push(rule);
  }
  return missing;
}

export function buildClaudeSettingsContent(
  currentContent: string | null,
  denyRulesToAdd: string[],
): string {
  if (denyRulesToAdd.length === 0) {
    return currentContent ?? `${JSON.stringify({ permissions: { deny: [] } }, null, 2)}\n`;
  }

  let parsed: ClaudeSettingsJson = {};
  if (currentContent && currentContent.trim().length > 0) {
    try {
      parsed = JSON.parse(currentContent) as ClaudeSettingsJson;
    } catch {
      throw new Error(`${SETTINGS_RELATIVE} is not valid JSON; refusing to apply Claude Fix`);
    }
  }

  const permissions =
    parsed.permissions && typeof parsed.permissions === "object" ? { ...parsed.permissions } : {};
  const deny = Array.isArray(permissions.deny)
    ? permissions.deny.filter((item): item is string => typeof item === "string")
    : [];

  for (const rule of denyRulesToAdd) {
    if (!deny.includes(rule)) {
      deny.push(rule);
    }
  }

  permissions.deny = deny;
  parsed.permissions = permissions;

  return `${JSON.stringify(parsed, null, 2)}\n`;
}

export function previewClaudeSettingsActions(
  currentContent: string | null,
  actions: FixAction[],
): ClaudeSettingsWritePreview | null {
  const claudeActions = actions.filter(
    (a) => a.agent === "claude-code" && a.targetRelativePath === SETTINGS_RELATIVE,
  );
  if (claudeActions.length === 0) {
    return null;
  }

  const requested = [
    ...new Set(claudeActions.map((a) => denyRuleForFixPattern(a.pattern, a.evidencePath))),
  ];
  const denyRulesToAdd = missingClaudeDenyRules(currentContent, requested);
  if (denyRulesToAdd.length === 0) {
    return null;
  }

  const before = currentContent ?? "";
  const after = buildClaudeSettingsContent(currentContent, denyRulesToAdd);
  return {
    targetRelativePath: SETTINGS_RELATIVE,
    denyRulesToAdd,
    before,
    after,
    preview: formatSimpleDiff(SETTINGS_RELATIVE, before, after),
  };
}

export async function readClaudeSettings(root: string): Promise<string | null> {
  return readTextFile(path.join(root, SETTINGS_RELATIVE), MAX_BYTES);
}

export async function writeClaudeSettings(root: string, content: string): Promise<void> {
  const target = path.join(root, SETTINGS_RELATIVE);
  const dir = path.dirname(target);
  await fs.mkdir(dir, { recursive: true });
  const tmp = path.join(dir, `.settings.json.agentdoctor.${process.pid}.tmp`);
  await fs.writeFile(tmp, content, "utf8");
  await fs.rename(tmp, target);
}

function parseDenyList(currentContent: string | null): string[] {
  if (!currentContent || currentContent.trim().length === 0) {
    return [];
  }
  try {
    const parsed = JSON.parse(currentContent) as ClaudeSettingsJson;
    const deny = parsed.permissions?.deny;
    if (!Array.isArray(deny)) {
      return [];
    }
    return deny.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

function formatSimpleDiff(fileLabel: string, before: string, after: string): string {
  const lines: string[] = [];
  lines.push(`--- a/${fileLabel}`);
  lines.push(`+++ b/${fileLabel}`);
  lines.push(before.trim().length === 0 ? "@@ new file @@" : "@@ update @@");
  for (const line of after.split(/\r?\n/)) {
    lines.push(`+${line}`);
  }
  return lines.join("\n");
}
