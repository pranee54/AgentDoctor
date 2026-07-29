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
import { basenameOf, isRootLevel } from "../types.js";

/**
 * Codex project configuration detection.
 *
 * Official sources (Codex AGENTS.md / project config docs):
 * - Project files: `AGENTS.md`, `AGENTS.override.md` (override wins at same directory)
 * - Nested files from repo root down toward the working directory
 * - Optional project-local Codex home via `CODEX_HOME=$(pwd)/.codex`
 *   (we detect repo `.codex/AGENTS.md` and `.codex/config.toml` only)
 *
 * Fallback filenames (`project_doc_fallback_filenames`) are user-global config —
 * we do not invent fallbacks; only official default names are detected.
 *
 * We do NOT read `~/.codex` for normal repository scans.
 */
export async function detectCodex(context: AgentDetectionContext): Promise<AgentDetectionResult> {
  const { root, discovery, maxFileSizeBytes } = context;
  const configFiles: AgentConfigFile[] = [];
  const diagnostics: AgentDiagnostic[] = [];
  const seen = new Set<string>();
  const metadata: Record<string, unknown> = {
    agentsMdCount: 0,
    overrideCount: 0,
    hasProjectCodexDir: false,
  };

  const hasProjectCodexDir = await pathExistsInsideRoot(root, ".codex");
  metadata.hasProjectCodexDir = hasProjectCodexDir;

  async function addAgentsFile(
    relativePath: string,
    kind: "agents-md" | "agents-override-md",
  ): Promise<void> {
    if (seen.has(relativePath)) {
      return;
    }
    seen.add(relativePath);
    const inspected = await inspectRepoFile(root, relativePath, maxFileSizeBytes);
    configFiles.push(
      toAgentConfigFile(inspected, kind, {
        legacy: false,
        scope: isRootLevel(relativePath) ? "root" : "nested",
      }),
    );

    if (kind === "agents-md") {
      metadata.agentsMdCount = Number(metadata.agentsMdCount) + 1;
    } else {
      metadata.overrideCount = Number(metadata.overrideCount) + 1;
    }

    if (!inspected.exists) {
      return;
    }
    if (!inspected.readable && inspected.error) {
      diagnostics.push({
        code: "codex/unreadable-file",
        severity: "warning",
        message: `Could not read Codex instruction file: ${inspected.error}`,
        file: relativePath,
      });
    } else if (inspected.empty) {
      diagnostics.push({
        code: "codex/empty-agents",
        severity: "info",
        // Official docs: Codex skips empty files
        message: "Codex instruction file is empty (Codex skips empty files)",
        file: relativePath,
      });
    }
  }

  for (const file of discovery.files) {
    const relative = file.relativePath;
    const base = basenameOf(relative);

    if (base === "AGENTS.override.md") {
      await addAgentsFile(relative, "agents-override-md");
      continue;
    }
    if (base === "AGENTS.md") {
      await addAgentsFile(relative, "agents-md");
    }
  }

  // Explicit targeted checks for empty root files that discovery may still include
  for (const relative of ["AGENTS.md", "AGENTS.override.md"]) {
    if (!seen.has(relative) && (await pathExistsInsideRoot(root, relative))) {
      await addAgentsFile(
        relative,
        relative === "AGENTS.override.md" ? "agents-override-md" : "agents-md",
      );
    }
  }

  // Optional project-local Codex home (CODEX_HOME=$(pwd)/.codex)
  if (hasProjectCodexDir) {
    for (const relative of [".codex/AGENTS.md", ".codex/AGENTS.override.md"]) {
      if (await pathExistsInsideRoot(root, relative)) {
        await addAgentsFile(
          relative,
          relative.endsWith("override.md") ? "agents-override-md" : "agents-md",
        );
      }
    }
    if (await pathExistsInsideRoot(root, ".codex/config.toml")) {
      const inspected = await inspectRepoFile(root, ".codex/config.toml", maxFileSizeBytes);
      configFiles.push(
        toAgentConfigFile(inspected, "codex-config", {
          legacy: false,
          scope: "root",
        }),
      );
      // Existence only — TOML values are not parsed here.
      if (inspected.empty) {
        diagnostics.push({
          code: "codex/empty-config",
          severity: "info",
          message: ".codex/config.toml is empty",
          file: ".codex/config.toml",
        });
      }
    }
  }

  const usableInstruction = configFiles.some(
    (f) => f.readable && !f.empty && (f.kind === "agents-md" || f.kind === "agents-override-md"),
  );

  const detected =
    Number(metadata.agentsMdCount) > 0 || Number(metadata.overrideCount) > 0 || hasProjectCodexDir;

  const configured = usableInstruction;
  const hasErrors = diagnostics.some((d) => d.severity === "error");
  const status = deriveStatus({ detected, configured, hasErrors });

  const parts: string[] = [];
  if (Number(metadata.agentsMdCount) > 0) {
    parts.push(
      Number(metadata.agentsMdCount) === 1
        ? "AGENTS.md"
        : `${metadata.agentsMdCount} AGENTS.md files`,
    );
  }
  if (Number(metadata.overrideCount) > 0) {
    parts.push(
      Number(metadata.overrideCount) === 1
        ? "AGENTS.override.md"
        : `${metadata.overrideCount} overrides`,
    );
  }

  let summary: string;
  if (!detected) {
    summary = "not configured";
  } else if (configured) {
    summary = parts.length > 0 ? parts.join(", ") : "configured";
  } else {
    summary = "detected but not configured";
  }

  return {
    id: "codex",
    displayName: AGENT_DISPLAY_NAMES.codex,
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

export const codexAdapter: AgentAdapter = {
  id: "codex",
  displayName: AGENT_DISPLAY_NAMES.codex,
  detect: detectCodex,
};
