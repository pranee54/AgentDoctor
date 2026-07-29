import { AGENT_DISPLAY_NAMES } from "../../constants.js";
import {
  deriveStatus,
  inspectRepoFile,
  pathExistsInsideRoot,
  toAgentConfigFile,
} from "../inspect.js";
import type {
  AgentAdapter,
  AgentConfigFile,
  AgentDetectionContext,
  AgentDetectionResult,
  AgentDiagnostic,
} from "../types.js";
import { basenameOf, dirnameOf, isRootLevel } from "../types.js";

/**
 * Cursor project configuration detection.
 *
 * Official sources (Cursor docs — Rules):
 * - Project rules: `.cursor/rules/*.mdc` (Markdown + YAML frontmatter)
 * - Plain `.md` under `.cursor/rules` is ignored by the rules system
 * - `AGENTS.md` is an official simple alternative (root + nested)
 *
 * Legacy:
 * - Root `.cursorrules` is still encountered in the wild and referenced by
 *   other tools' migration paths; treated as legacy, not primary.
 *
 * We do not scan user-global Cursor settings — repository only.
 */
export async function detectCursor(context: AgentDetectionContext): Promise<AgentDetectionResult> {
  const { root, discovery, maxFileSizeBytes } = context;
  const configFiles: AgentConfigFile[] = [];
  const diagnostics: AgentDiagnostic[] = [];
  const metadata: Record<string, unknown> = {
    mdcRuleCount: 0,
    ignoredMdRuleCount: 0,
    agentsMdCount: 0,
    hasLegacyCursorrules: false,
    hasCursorDirectory: false,
  };

  const hasCursorDir = await pathExistsInsideRoot(root, ".cursor");
  metadata.hasCursorDirectory = hasCursorDir;

  for (const file of discovery.files) {
    const relative = file.relativePath;
    const base = basenameOf(relative);

    // Current project rules: any .mdc under a .cursor/rules/ segment
    if (relative.includes(".cursor/rules/") && base.endsWith(".mdc")) {
      const inspected = await inspectRepoFile(root, relative, maxFileSizeBytes);
      const scope = relative.startsWith(".cursor/rules/") ? "root" : "nested";
      const entry = toAgentConfigFile(inspected, "cursor-rule-mdc", {
        legacy: false,
        scope,
      });
      configFiles.push(entry);
      metadata.mdcRuleCount = Number(metadata.mdcRuleCount) + 1;

      if (!inspected.readable && inspected.error) {
        diagnostics.push({
          code: "cursor/unreadable-rule",
          severity: "warning",
          message: `Could not read Cursor rule: ${inspected.error}`,
          file: relative,
        });
      } else if (inspected.empty) {
        diagnostics.push({
          code: "cursor/empty-rule",
          severity: "info",
          message: "Cursor rule file is empty",
          file: relative,
        });
      }
      continue;
    }

    // Plain .md under .cursor/rules is ignored by Cursor's rules system
    if (relative.includes(".cursor/rules/") && base.endsWith(".md")) {
      const inspected = await inspectRepoFile(root, relative, maxFileSizeBytes);
      configFiles.push(
        toAgentConfigFile(inspected, "cursor-rule-ignored-md", {
          legacy: false,
          scope: relative.startsWith(".cursor/rules/") ? "root" : "nested",
        }),
      );
      metadata.ignoredMdRuleCount = Number(metadata.ignoredMdRuleCount) + 1;
      diagnostics.push({
        code: "cursor/ignored-md-rule",
        severity: "warning",
        message:
          "Plain .md files in .cursor/rules are ignored by Cursor; use .mdc with frontmatter or AGENTS.md",
        file: relative,
      });
      continue;
    }

    // AGENTS.md — official Cursor alternative (root or nested)
    if (base === "AGENTS.md") {
      const inspected = await inspectRepoFile(root, relative, maxFileSizeBytes);
      configFiles.push(
        toAgentConfigFile(inspected, "agents-md", {
          legacy: false,
          scope: isRootLevel(relative) ? "root" : "nested",
        }),
      );
      metadata.agentsMdCount = Number(metadata.agentsMdCount) + 1;
      if (inspected.empty) {
        diagnostics.push({
          code: "cursor/empty-agents-md",
          severity: "info",
          message: "AGENTS.md is empty",
          file: relative,
        });
      }
    }
  }

  // Legacy root .cursorrules (may not appear if empty — check explicitly)
  if (await pathExistsInsideRoot(root, ".cursorrules")) {
    const inspected = await inspectRepoFile(root, ".cursorrules", maxFileSizeBytes);
    configFiles.push(
      toAgentConfigFile(inspected, "cursor-legacy-cursorrules", {
        legacy: true,
        scope: "legacy",
      }),
    );
    metadata.hasLegacyCursorrules = true;
    diagnostics.push({
      code: "cursor/legacy-cursorrules",
      severity: "warning",
      message:
        "Legacy .cursorrules detected; prefer .cursor/rules/*.mdc or AGENTS.md per current Cursor docs",
      file: ".cursorrules",
    });
    if (inspected.empty) {
      diagnostics.push({
        code: "cursor/empty-cursorrules",
        severity: "info",
        message: "Legacy .cursorrules is empty",
        file: ".cursorrules",
      });
    }
  } else if (discovery.files.some((f) => f.relativePath === ".cursorrules")) {
    // already covered via existence
  }

  // Detect empty .cursor tree with no usable rules
  if (hasCursorDir && Number(metadata.mdcRuleCount) === 0) {
    const hasRulesDir = await pathExistsInsideRoot(root, ".cursor/rules");
    if (hasRulesDir) {
      diagnostics.push({
        code: "cursor/empty-rules-dir",
        severity: "info",
        message: ".cursor/rules exists but no .mdc project rules were found",
        file: ".cursor/rules",
      });
    } else {
      diagnostics.push({
        code: "cursor/no-rules",
        severity: "info",
        message: ".cursor directory exists without a rules/ project configuration",
        file: ".cursor",
      });
    }
  }

  const usableInstruction = configFiles.some(
    (f) =>
      f.readable &&
      !f.empty &&
      (f.kind === "cursor-rule-mdc" ||
        f.kind === "cursor-legacy-cursorrules" ||
        f.kind === "agents-md"),
  );

  const detected =
    hasCursorDir ||
    Boolean(metadata.hasLegacyCursorrules) ||
    Number(metadata.mdcRuleCount) > 0 ||
    Number(metadata.agentsMdCount) > 0 ||
    Number(metadata.ignoredMdRuleCount) > 0;

  const configured = usableInstruction;
  const hasErrors = diagnostics.some((d) => d.severity === "error");
  const status = deriveStatus({ detected, configured, hasErrors });

  const parts: string[] = [];
  if (Number(metadata.mdcRuleCount) > 0) {
    parts.push(
      `${metadata.mdcRuleCount} project rule${Number(metadata.mdcRuleCount) === 1 ? "" : "s"}`,
    );
  }
  if (Number(metadata.agentsMdCount) > 0) {
    parts.push(`${metadata.agentsMdCount} AGENTS.md`);
  }
  if (metadata.hasLegacyCursorrules) {
    parts.push("legacy .cursorrules");
  }

  let summary: string;
  if (!detected) {
    summary = "not configured";
  } else if (configured) {
    summary = parts.length > 0 ? parts.join(", ") : "configured";
  } else {
    summary = "detected but not configured";
  }

  // Silence unused dirname helper warning by referencing for nested path clarity in metadata
  metadata.nestedRuleDirs = [
    ...new Set(
      configFiles
        .filter((f) => f.kind === "cursor-rule-mdc" && f.scope === "nested")
        .map((f) => dirnameOf(f.relativePath)),
    ),
  ];

  return {
    id: "cursor",
    displayName: AGENT_DISPLAY_NAMES.cursor,
    detected,
    configured,
    status,
    summary,
    configFiles,
    configPaths: configFiles.map((f) => f.relativePath),
    diagnostics,
    metadata,
  };
}

export const cursorAdapter: AgentAdapter = {
  id: "cursor",
  displayName: AGENT_DISPLAY_NAMES.cursor,
  detect: detectCursor,
};
