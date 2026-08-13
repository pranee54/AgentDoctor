import path from "node:path";

import { atomicWriteTextFile, readTextFile } from "../../../utils/fs.js";
import { codexDenyKey, configTextDeniesPath } from "../../rules/codex-deny.js";
import type { FixAction } from "../types.js";

const MAX_BYTES = 512 * 1024;
const CONFIG_RELATIVE = ".codex/config.toml";
const AGENTDOCTOR_PROFILE = "agentdoctor_context";
const BEGIN_MARKER = "# BEGIN AgentDoctor context exclusions";
const END_MARKER = "# END AgentDoctor context exclusions";

export interface CodexConfigWritePreview {
  targetRelativePath: typeof CONFIG_RELATIVE;
  denyKeysToAdd: string[];
  before: string;
  after: string;
  preview: string;
}

export function denyKeyForFixPattern(_pattern: string, evidencePath: string): string {
  return codexDenyKey(evidencePath);
}

export function missingCodexDenyKeys(currentContent: string | null, denyKeys: string[]): string[] {
  if (!currentContent || currentContent.trim().length === 0) {
    return [...new Set(denyKeys)];
  }
  const missing: string[] = [];
  for (const key of denyKeys) {
    if (configTextDeniesPath(currentContent, key)) {
      continue;
    }
    missing.push(key);
  }
  return [...new Set(missing)];
}

/**
 * Merge filesystem deny keys into project `.codex/config.toml`.
 * Refuses when sandbox_mode is present (permission profiles do not compose).
 * Refuses when default_permissions selects a built-in `:…` profile.
 */
export function buildCodexConfigContent(
  currentContent: string | null,
  denyKeysToAdd: string[],
): string {
  if (denyKeysToAdd.length === 0) {
    return currentContent ?? "";
  }

  const existing = currentContent ?? "";
  assertWritableCodexConfig(existing);

  const profile = resolveTargetProfile(existing);
  const sectionHeader = `[permissions.${profile}.filesystem.":workspace_roots"]`;
  let next = existing;

  if (!hasDefaultPermissions(next)) {
    next = ensureTrailingNewline(next);
    if (next.trim().length > 0) {
      next += "\n";
    }
    next += `${BEGIN_MARKER}\n`;
    next += `default_permissions = "${profile}"\n`;
  }

  const section = findTomlTableRange(next, sectionHeader);
  if (!section) {
    next = ensureTrailingNewline(next);
    if (!next.includes(BEGIN_MARKER)) {
      next += `\n${BEGIN_MARKER}\n`;
    }
    next += `${sectionHeader}\n`;
    if (profile === AGENTDOCTOR_PROFILE) {
      next += `"." = "write"\n`;
    }
    for (const key of denyKeysToAdd) {
      next += `"${key}" = "deny"\n`;
    }
    if (!next.includes(END_MARKER)) {
      next += `${END_MARKER}\n`;
    }
    return next;
  }

  const body = next.slice(section.bodyStart, section.end);
  const linesToInsert: string[] = [];
  for (const key of denyKeysToAdd) {
    if (configTextDeniesPath(body, key) || configTextDeniesPath(next, key)) {
      continue;
    }
    linesToInsert.push(`"${key}" = "deny"`);
  }
  if (linesToInsert.length === 0) {
    return next;
  }

  const beforeBodyEnd = next.slice(0, section.end);
  const afterBodyEnd = next.slice(section.end);
  const trimmedBodyEnd = beforeBodyEnd.endsWith("\n") ? beforeBodyEnd : `${beforeBodyEnd}\n`;
  const suffix =
    afterBodyEnd.startsWith("\n") || afterBodyEnd.length === 0 ? afterBodyEnd : `\n${afterBodyEnd}`;
  return `${trimmedBodyEnd}${linesToInsert.join("\n")}\n${suffix}`;
}

export function previewCodexConfigActions(
  currentContent: string | null,
  actions: FixAction[],
): CodexConfigWritePreview | null {
  const codexActions = actions.filter(
    (a) => a.agent === "codex" && a.targetRelativePath === CONFIG_RELATIVE,
  );
  if (codexActions.length === 0) {
    return null;
  }

  const requested = [
    ...new Set(codexActions.map((a) => denyKeyForFixPattern(a.pattern, a.evidencePath))),
  ];
  const denyKeysToAdd = missingCodexDenyKeys(currentContent, requested);
  if (denyKeysToAdd.length === 0) {
    return null;
  }

  const before = currentContent ?? "";
  const after = buildCodexConfigContent(currentContent, denyKeysToAdd);
  return {
    targetRelativePath: CONFIG_RELATIVE,
    denyKeysToAdd,
    before,
    after,
    preview: formatSimpleDiff(CONFIG_RELATIVE, before, after),
  };
}

export async function readCodexConfig(root: string): Promise<string | null> {
  return readTextFile(path.join(root, CONFIG_RELATIVE), MAX_BYTES);
}

export async function writeCodexConfig(root: string, content: string): Promise<void> {
  await atomicWriteTextFile(path.join(root, CONFIG_RELATIVE), content);
}

export function assertWritableCodexConfig(content: string): void {
  if (/^\s*sandbox_mode\s*=/m.test(content)) {
    throw new Error(
      `${CONFIG_RELATIVE} uses sandbox_mode; refusing Codex Fix (permission profiles do not compose with sandbox_mode)`,
    );
  }
  const builtin = readDefaultPermissions(content);
  if (builtin && builtin.startsWith(":")) {
    throw new Error(
      `${CONFIG_RELATIVE} default_permissions is built-in "${builtin}"; refusing Codex Fix (create a custom permissions profile first)`,
    );
  }
  if (content.trim().length > 0 && !isRecognizableCodexConfig(content)) {
    throw new Error(
      `${CONFIG_RELATIVE} does not look like valid Codex config TOML; refusing Codex Fix`,
    );
  }
}

/** Allow empty/comment-only files, AgentDoctor-managed blocks, or known Codex tables. */
function isRecognizableCodexConfig(content: string): boolean {
  if (content.includes(BEGIN_MARKER) || content.includes(END_MARKER)) {
    return true;
  }
  if (readDefaultPermissions(content) !== null) {
    return true;
  }
  if (/^\s*\[(permissions\.|mcp_servers\.|projects\.)/m.test(content)) {
    return true;
  }
  // Comment-only / blank files are safe to initialize.
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#")) {
      continue;
    }
    return false;
  }
  return true;
}

function resolveTargetProfile(content: string): string {
  const existing = readDefaultPermissions(content);
  if (existing && !existing.startsWith(":")) {
    return existing;
  }
  return AGENTDOCTOR_PROFILE;
}

function hasDefaultPermissions(content: string): boolean {
  return readDefaultPermissions(content) !== null;
}

function readDefaultPermissions(content: string): string | null {
  const match = content.match(/^\s*default_permissions\s*=\s*["']([^"']+)["']\s*$/m);
  return match?.[1] ?? null;
}

function findTomlTableRange(
  content: string,
  header: string,
): { start: number; bodyStart: number; end: number } | null {
  const start = content.indexOf(header);
  if (start < 0) {
    return null;
  }
  const bodyStart = start + header.length;
  const rest = content.slice(bodyStart);
  const nextHeader = rest.search(/\n\s*\[/);
  const end = nextHeader < 0 ? content.length : bodyStart + nextHeader;
  return { start, bodyStart, end };
}

function ensureTrailingNewline(value: string): string {
  if (value.length === 0 || value.endsWith("\n")) {
    return value;
  }
  return `${value}\n`;
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
