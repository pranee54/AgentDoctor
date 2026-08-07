import type { RuleContext } from "./types.js";

export function codexDenyKey(relativePath: string): string {
  return relativePath.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+$/, "");
}

/** True when config.toml already denies this path (or path/**) under a filesystem table. */
export function configTextDeniesPath(configText: string, relativePath: string): boolean {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+$/, "");
  if (!normalized) {
    return false;
  }
  const escaped = escapeRegExp(normalized);
  const patterns = [
    new RegExp(`^\\s*"${escaped}"\\s*=\\s*"deny"\\s*$`, "m"),
    new RegExp(`^\\s*"${escaped}/\\*\\*"\\s*=\\s*"deny"\\s*$`, "m"),
    new RegExp(`^\\s*'${escaped}'\\s*=\\s*'deny'\\s*$`, "m"),
    new RegExp(`^\\s*'${escaped}/\\*\\*'\\s*=\\s*'deny'\\s*$`, "m"),
  ];
  return patterns.some((re) => re.test(configText));
}

export async function codexDeniesPath(
  context: RuleContext,
  relativePath: string,
): Promise<boolean> {
  const configFiles =
    context.agents
      .find((a) => a.id === "codex")
      ?.configFiles.filter((f) => f.kind === "codex-config") ?? [];

  for (const file of configFiles) {
    const cached = await context.textCache.read(file.relativePath);
    if (!cached.text) {
      continue;
    }
    if (configTextDeniesPath(cached.text, relativePath)) {
      return true;
    }
  }

  // Config may exist but not yet be attached when only AGENTS.md detected; check path directly.
  const direct = await context.textCache.read(".codex/config.toml");
  if (direct.text && configTextDeniesPath(direct.text, relativePath)) {
    return true;
  }
  return false;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
