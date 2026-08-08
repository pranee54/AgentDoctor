import { toRepoRelativePosix } from "../../utils/path.js";
import type { RuleContext } from "./types.js";

/**
 * Claude Code Read deny rule for a repository-relative path.
 * Directories use a recursive Read(./path/**) form.
 */
export function claudeReadDenyRule(
  relativePath: string,
  kind: "file" | "directory" = "file",
): string {
  const normalized = toRepoRelativePosix(relativePath);
  if (kind === "directory") {
    return `Read(./${normalized}/**)`;
  }
  return `Read(./${normalized})`;
}

export function settingsTextDeniesPath(settingsText: string, relativePath: string): boolean {
  const normalized = toRepoRelativePosix(relativePath);
  const base = normalized.split("/").pop() ?? normalized;
  const patterns = [
    `Read(./${normalized})`,
    `Read(${normalized})`,
    `Read(./${normalized}/**)`,
    `Read(./${normalized}/)`,
    `Read(/**/${base})`,
  ];
  return patterns.some((p) => settingsText.includes(p));
}

export async function claudeDeniesPath(
  context: RuleContext,
  relativePath: string,
): Promise<boolean> {
  const settingsFiles =
    context.agents
      .find((a) => a.id === "claude-code")
      ?.configFiles.filter(
        (f) => f.kind === "claude-settings" || f.kind === "claude-settings-local",
      ) ?? [];

  for (const file of settingsFiles) {
    const cached = await context.textCache.read(file.relativePath);
    if (!cached.text) {
      continue;
    }
    if (settingsTextDeniesPath(cached.text, relativePath)) {
      return true;
    }
  }
  return false;
}
