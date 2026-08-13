import path from "node:path";

import { atomicWriteTextFile, readTextFile } from "../../../utils/fs.js";
import { missingPatternsForCursorignore } from "../plan.js";
import type { FixAction } from "../types.js";

const MAX_BYTES = 512 * 1024;
const BANNER = "# Added by AgentDoctor";

export interface CursorignoreWritePreview {
  targetRelativePath: ".cursorignore";
  patternsToAdd: string[];
  before: string;
  after: string;
  /** Unified-diff-like preview (simplified). */
  preview: string;
}

export function buildCursorignoreContent(
  currentContent: string | null,
  patternsToAdd: string[],
): string {
  if (patternsToAdd.length === 0) {
    return currentContent ?? "";
  }

  const base = currentContent ?? "";
  const trimmed = base.replace(/\s+$/, "");
  const block = [BANNER, ...patternsToAdd].join("\n");
  if (trimmed.length === 0) {
    return `${block}\n`;
  }
  return `${trimmed}\n\n${block}\n`;
}

export function previewCursorignoreActions(
  currentContent: string | null,
  actions: FixAction[],
): CursorignoreWritePreview | null {
  const cursorActions = actions.filter(
    (a) => a.agent === "cursor" && a.targetRelativePath === ".cursorignore",
  );
  if (cursorActions.length === 0) {
    return null;
  }

  const requested = [...new Set(cursorActions.map((a) => a.pattern))];
  const patternsToAdd = missingPatternsForCursorignore(currentContent, requested);
  if (patternsToAdd.length === 0) {
    return null;
  }

  const before = currentContent ?? "";
  const after = buildCursorignoreContent(currentContent, patternsToAdd);
  const preview = formatSimpleDiff(".cursorignore", before, after);

  return {
    targetRelativePath: ".cursorignore",
    patternsToAdd,
    before,
    after,
    preview,
  };
}

export async function readCursorignore(root: string): Promise<string | null> {
  return readTextFile(path.join(root, ".cursorignore"), MAX_BYTES);
}

export async function writeCursorignore(root: string, content: string): Promise<void> {
  await atomicWriteTextFile(path.join(root, ".cursorignore"), content);
}

function formatSimpleDiff(fileLabel: string, before: string, after: string): string {
  const beforeLines = before.length === 0 ? [] : before.split(/\r?\n/);
  const afterLines = after.split(/\r?\n/);
  const lines: string[] = [];
  lines.push(`--- a/${fileLabel}`);
  lines.push(`+++ b/${fileLabel}`);
  // Show only newly added trailing block for clarity
  const addedStart = beforeLines.length === 0 ? 0 : beforeLines.length;
  for (let i = addedStart; i < afterLines.length; i++) {
    const line = afterLines[i];
    if (line === undefined) {
      continue;
    }
    // Skip pure trailing empty presentation noise except keep structure
    lines.push(`+${line}`);
  }
  if (before.length === 0) {
    lines.splice(2, 0, "@@ new file @@");
  } else {
    lines.splice(2, 0, "@@ append @@");
  }
  return lines.join("\n");
}
